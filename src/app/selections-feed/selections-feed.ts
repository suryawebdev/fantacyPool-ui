import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { WebSocketService } from '../websocket.service';
import { MatchService } from '../match.service';
import { AdminService } from '../admin.service';
import { TournamentService } from '../tournament.service';
import { AuthService } from '../auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { Tournament } from '../models/tournament.model';
import { SelectedTournamentService } from '../selected-tournament.service';
import { compareMatchStartDesc, isPickLockPassed } from '../match-pick-lock.util';
import { matchHasDeclaredOutcome } from '../match-outcome';

export interface LiveFeedConfig {
  enabled: boolean;
  tournamentId?: number;
}

@Component({
  selector: 'app-selections-feed',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './selections-feed.html',
  styleUrl: './selections-feed.scss'
})
export class SelectionsFeed implements OnInit {
  feed: any[] = [];
  loading = false;
  hasMore = true;
  page = 0;
  pageSize = 5;

  liveFeedConfig: LiveFeedConfig | null = null;

  matchTournaments: Tournament[] = [];
  matchTournamentId: number | null = null;
  startedMatches: any[] = [];
  /** Roster for selected tournament (for showing "No pick"). */
  tournamentParticipants: any[] = [];
  matchSelections: { [matchId: number]: any[] } = {};
  matchSelectionsLoaded: { [matchId: number]: boolean } = {};
  loadingMatchSelections = false;
  expandedMatchId: number | null = null;

  constructor(
    // private websocketService: WebSocketService,
    private matchService: MatchService,
    private adminService: AdminService,
    private tournamentService: TournamentService,
    private authService: AuthService,
    private selectedTournamentService: SelectedTournamentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.adminService.getLiveFeedConfig().subscribe({
      next: (config) => this.applyLiveFeedConfig(config ?? { enabled: false }),
      error: () => this.applyLiveFeedConfig({ enabled: false })
    });

    // WebSockets disabled — live push of selections; REST pagination still works when live feed is enabled
    // this.websocketService.selectionFeed$.subscribe((selection) => {
    //   if (!this.liveFeedConfig?.enabled) return;
    //   if (this.liveFeedConfig.tournamentId != null && selection?.match?.tournamentId !== this.liveFeedConfig.tournamentId) return;
    //   this.feed.unshift(selection);
    //   if (this.feed.length > 10) this.feed.pop();
    //   this.cdr.detectChanges();
    // });

    this.loadTournamentsForMatchSection();
  }

  private applyLiveFeedConfig(config: LiveFeedConfig | null): void {
    this.liveFeedConfig = config ?? { enabled: false };
    if (!this.liveFeedConfig.enabled) {
      this.feed = [];
      this.page = 0;
      this.hasMore = true;
    } else if (this.feed.length === 0) {
      this.loadSelections();
    }
    this.cdr.detectChanges();
  }

  /** Display team name for a pick: supports team name string or legacy "A"/"B". */
  getPickTeamName(item: any): string {
    if (!item?.team) return '';
    if (item.team === 'A' || item.team === 'B') return item.match?.['team' + item.team] ?? item.team;
    return item.team;
  }

  loadSelections(): void {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    const tournamentId = this.liveFeedConfig?.enabled ? this.liveFeedConfig.tournamentId : undefined;
    this.matchService.getSelections(this.page, this.pageSize, tournamentId).subscribe({
      next: (selections) => {
        this.feed = this.feed.concat(selections ?? []);
        this.loading = false;
        this.page++;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTournamentsForMatchSection(): void {
    const isAdmin = this.authService.getUserRole() === 'ADMIN';
    const request = isAdmin ? this.tournamentService.getAllTournaments() : this.tournamentService.getEnrolledTournaments();
    request.subscribe({
      next: (list) => {
        this.matchTournaments = list ?? [];
        const ids = this.matchTournaments.map(t => t.id);
        this.matchTournamentId = this.selectedTournamentService.resolveSelection(ids);
        if (this.matchTournamentId != null) {
          this.selectedTournamentService.setSelectedTournamentId(this.matchTournamentId);
          this.loadStartedMatches();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.matchTournaments = [];
        this.cdr.detectChanges();
      }
    });
  }

  onMatchTournamentSelect(value: number | string): void {
    this.matchTournamentId = value === '' || value == null ? null : Number(value);
    this.selectedTournamentService.setSelectedTournamentId(this.matchTournamentId);
    this.loadStartedMatches();
  }

  loadStartedMatches(): void {
    if (this.matchTournamentId == null) {
      this.startedMatches = [];
      this.tournamentParticipants = [];
      this.matchSelections = {};
      this.expandedMatchId = null;
      return;
    }
    this.loadingMatchSelections = true;
    const tid = this.matchTournamentId;

    // Load roster in parallel; used to show "No pick".
    this.tournamentService.getTournamentParticipants(tid).subscribe({
      next: (list) => {
        this.tournamentParticipants = list ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.tournamentParticipants = [];
        this.cdr.detectChanges();
      }
    });

    this.matchService.getMatchesByTournament(tid).subscribe({
      next: (matches) => {
        const now = Date.now();
        this.startedMatches = (matches ?? []).filter((m: any) => isPickLockPassed(m.startDateTime, now));
        this.startedMatches.sort((a: any, b: any) => compareMatchStartDesc(a, b));
        this.matchSelections = {};
        this.matchSelectionsLoaded = {};
        const firstMatch = this.startedMatches[0];
        this.expandedMatchId = firstMatch?.id ?? null;
        this.loadingMatchSelections = false;
        this.cdr.detectChanges();
        if (firstMatch?.id != null) {
          this.loadMatchSelections(firstMatch.id);
        }
      },
      error: () => {
        this.startedMatches = [];
        this.expandedMatchId = null;
        this.loadingMatchSelections = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleMatchExpand(matchId: number): void {
    if (this.expandedMatchId === matchId) {
      this.expandedMatchId = null;
      return;
    }
    this.expandedMatchId = matchId;
    if (!this.matchSelectionsLoaded[matchId]) {
      this.loadMatchSelections(matchId);
    }
  }

  private loadMatchSelections(matchId: number): void {
    this.matchService.getSelectionsByMatch(matchId).subscribe({
      next: (list) => {
        this.matchSelections[matchId] = list ?? [];
        this.matchSelectionsLoaded[matchId] = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.matchSelections[matchId] = [];
        this.matchSelectionsLoaded[matchId] = true;
        this.cdr.detectChanges();
      }
    });
  }

  isMatchSelectionsLoaded(matchId: number): boolean {
    return this.matchSelectionsLoaded[matchId] === true;
  }

  getMatchSelectionsList(matchId: number): any[] {
    return this.matchSelections[matchId] ?? [];
  }

  /**
   * For UI: show a row per participant; if no selection exists, mark as "No pick".
   * Falls back to only selection rows when participants API isn't available.
   */
  getMatchPickRows(matchId: number): Array<{ user: any; selection: any | null }> {
    const selections = this.getMatchSelectionsList(matchId) ?? [];
    const byUserId = new Map<number, any>();
    const byUsername = new Map<string, any>();

    selections.forEach((s: any) => {
      const uid = s?.userId != null ? Number(s.userId) : null;
      if (uid != null && !Number.isNaN(uid)) byUserId.set(uid, s);
      const un = s?.username != null ? String(s.username) : null;
      if (un) byUsername.set(un, s);
    });

    const participants = this.tournamentParticipants ?? [];
    if (participants.length === 0) {
      return selections.map((s: any) => ({ user: s, selection: s }));
    }

    const rows = participants.map((p: any) => {
      const uid = p?.userId != null ? Number(p.userId) : (p?.id != null ? Number(p.id) : null);
      const uname = p?.username != null ? String(p.username) : null;
      const sel = (uid != null && byUserId.get(uid)) || (uname ? byUsername.get(uname) : null) || null;
      const user = sel ?? p;
      return { user, selection: sel };
    });

    rows.sort((a, b) => this.getUserDisplayName(a.user).localeCompare(this.getUserDisplayName(b.user)));
    return rows;
  }

  /** True if pick lock has passed (America/Chicago for naive datetimes). */
  isMatchPastCutoff(match: any): boolean {
    return isPickLockPassed(match?.startDateTime);
  }

  getUserDisplayName(entry: any): string {
    if (entry?.firstName || entry?.lastName) return [entry.firstName, entry.lastName].filter(Boolean).join(' ');
    return entry?.username ?? 'Unknown';
  }

  getTeamDisplayName(match: any, team: string): string {
    if (!team) return '';
    if (team === 'A' || team === 'B') return match?.['team' + team] ?? team;
    return team;
  }

  /** Outcome not final yet — show pending, not wrong. */
  isPickOutcomePending(match: any): boolean {
    return !matchHasDeclaredOutcome(match);
  }
}
