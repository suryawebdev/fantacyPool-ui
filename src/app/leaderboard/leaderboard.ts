import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../tournament.service';
import { AuthService } from '../auth.service';
import { SelectedTournamentService } from '../selected-tournament.service';
import { MatchService } from '../match.service';
import { Router } from '@angular/router';
import { Tournament } from '../models/tournament.model';
import { isNoResultMatch } from '../match-outcome';
import { compareMatchStartAsc, isPickLockPassed } from '../match-pick-lock.util';
import { computeLeaderboardWithRanks } from '../leaderboard-rank.util';
import { firstValueFrom } from 'rxjs';
import { TableScrollPersistenceService } from '../table-scroll-persistence.service';

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss'
})
export class Leaderboard implements OnInit, OnDestroy {
  leaderboard: any[] = [];
  currentUser: any = {};
  myTournaments: Tournament[] = [];
  selectedTournamentId: number | null = null;
  loadingTournaments = false;
  loadingLeaderboard = false;

  /** Which player rows are expanded to show history */
  expandedUsernames = new Set<string>();
  /** Cached history per username: { totalPoints, matches } */
  userHistoryCache: Record<string, { totalPoints: number; matches: any[] }> = {};
  /** Username we're currently loading history for */
  loadingHistoryForUser: string | null = null;
  /** Username -> error message when history load failed */
  historyLoadError: Record<string, string> = {};
  /** All matches in the selected tournament */
  allTournamentMatches: any[] = [];
  /** Current logged-in user's picks by matchId (used as fallback in own history row). */
  currentUserPicks: Record<number, string> = {};

  private readonly lbScrollDebounceMs = 150;
  private lbScrollTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private tournamentService: TournamentService,
    private authService: AuthService,
    private selectedTournamentService: SelectedTournamentService,
    private matchService: MatchService,
    private router: Router,
    private tableScroll: TableScrollPersistenceService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUserDetails() || {};
    this.loadCurrentUserPicks();
    this.loadTournaments();
  }

  ngOnDestroy(): void {
    for (const t of this.lbScrollTimers.values()) {
      clearTimeout(t);
    }
    this.lbScrollTimers.clear();
    this.flushAllLeaderboardHistoryScrolls();
  }

  @HostListener('document:visibilitychange')
  onDocumentVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.flushAllLeaderboardHistoryScrolls();
    }
  }

  private loadCurrentUserPicks(): void {
    this.matchService.getUserPicks().subscribe({
      next: (picks) => {
        this.currentUserPicks = {};
        (picks || []).forEach((pick: any) => {
          if (pick?.matchId != null && pick?.team) {
            this.currentUserPicks[pick.matchId] = pick.team;
          }
        });
      },
      error: () => {
        this.currentUserPicks = {};
      }
    });
  }

  /** Admin can see all tournaments' leaderboards; regular users see only enrolled. */
  loadTournaments() {
    this.loadingTournaments = true;
    const isAdmin = this.authService.getUserRole() === 'ADMIN';
    const request = isAdmin
      ? this.tournamentService.getAllTournaments()
      : this.tournamentService.getEnrolledTournaments();
    request.subscribe({
      next: (list) => {
        this.myTournaments = list || [];
        const ids = this.myTournaments.map(t => t.id);
        this.selectedTournamentId = this.selectedTournamentService.resolveSelection(ids);
        if (this.selectedTournamentId != null) {
          this.selectedTournamentService.setSelectedTournamentId(this.selectedTournamentId);
          this.loadLeaderboard();
        }
        this.loadingTournaments = false;
      },
      error: () => {
        this.myTournaments = [];
        this.loadingTournaments = false;
      }
    });
  }

  onTournamentSelect(value: number | string) {
    this.selectedTournamentId = value === '' || value == null ? null : Number(value);
    this.selectedTournamentService.setSelectedTournamentId(this.selectedTournamentId);
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    if (this.selectedTournamentId == null) {
      this.leaderboard = [];
      return;
    }
    this.expandedUsernames.clear();
    this.userHistoryCache = {};
    this.historyLoadError = {};
    this.allTournamentMatches = [];
    this.loadingLeaderboard = true;
    
    // Load both leaderboard and all tournament matches
    Promise.all([
      this.tournamentService.getTournamentLeaderboard(this.selectedTournamentId).toPromise(),
      this.matchService.getMatchesByTournament(this.selectedTournamentId).toPromise()
    ]).then(([leaderboardData, matchesData]) => {
      const raw = (leaderboardData || []).filter((u: any) => u.enabled !== false);
      this.leaderboard = computeLeaderboardWithRanks(raw);
      this.allTournamentMatches = matchesData || [];
      this.loadingLeaderboard = false;
    }).catch((err) => {
      console.error('Error fetching leaderboard or matches:', err);
      this.leaderboard = [];
      this.allTournamentMatches = [];
      this.loadingLeaderboard = false;
    });
  }

  isCurrentUser(user: any): boolean {
    return user.username === this.currentUser.username;
  }

  isExpanded(username: string): boolean {
    return this.expandedUsernames.has(username);
  }

  toggleExpand(user: any): void {
    const username = user?.username;
    if (!username) return;
    if (this.expandedUsernames.has(username)) {
      this.flushLeaderboardHistoryScroll(username);
      this.expandedUsernames.delete(username);
      return;
    }
    this.expandedUsernames.add(username);
    if (this.userHistoryCache[username] != null) {
      setTimeout(() => this.scheduleLeaderboardHistoryScrollRestore(username), 0);
      return;
    }
    this.loadUserHistory(username);
  }

  private loadUserHistory(username: string): void {
    this.loadingHistoryForUser = username;
    this.historyLoadError[username] = '';
    const tid = this.selectedTournamentId ?? undefined;
    firstValueFrom(this.matchService.getUserHistoryByUsername(username, tid))
      .then((data) => {
        const pickedMatches = data.matches ?? [];
        const enrichedMatches = this.mergePickedWithAllMatches(pickedMatches, username);

        this.userHistoryCache[username] = { totalPoints: data.totalPoints ?? 0, matches: enrichedMatches };
        this.loadingHistoryForUser = null;
        setTimeout(() => this.scheduleLeaderboardHistoryScrollRestore(username), 0);
        setTimeout(() => this.scheduleLeaderboardHistoryScrollRestore(username), 120);
      })
      .catch(() => {
        this.historyLoadError[username] = 'Could not load history.';
        this.loadingHistoryForUser = null;
      });
  }

  onLeaderboardHistoryScroll(historyUsername: string, event: Event): void {
    const el = event.currentTarget as HTMLElement;
    const key = this.leaderboardHistoryScrollKey(historyUsername);
    const prev = this.lbScrollTimers.get(historyUsername);
    if (prev != null) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.lbScrollTimers.delete(historyUsername);
      this.tableScroll.write(key, el.scrollTop);
    }, this.lbScrollDebounceMs);
    this.lbScrollTimers.set(historyUsername, timer);
  }

  private leaderboardHistoryScrollKey(historyUsername: string): string | null {
    return this.tableScroll.storageKey({
      area: 'leaderboard',
      viewerUsername: this.currentUser?.username ?? 'user',
      tournamentId: this.selectedTournamentId,
      tableId: 'history',
      suffix: historyUsername
    });
  }

  private findLeaderboardHistoryScrollEl(historyUsername: string): HTMLElement | null {
    const nodes = document.querySelectorAll('[data-lbh-user]');
    for (const node of Array.from(nodes)) {
      if (node.getAttribute('data-lbh-user') === historyUsername) {
        return node as HTMLElement;
      }
    }
    return null;
  }

  private scheduleLeaderboardHistoryScrollRestore(historyUsername: string): void {
    const el = this.findLeaderboardHistoryScrollEl(historyUsername);
    const key = this.leaderboardHistoryScrollKey(historyUsername);
    this.tableScroll.restoreScroll(el, key, { defaultToTop: true });
  }

  private flushLeaderboardHistoryScroll(historyUsername: string): void {
    const el = this.findLeaderboardHistoryScrollEl(historyUsername);
    const key = this.leaderboardHistoryScrollKey(historyUsername);
    if (el && key) {
      this.tableScroll.write(key, el.scrollTop);
    }
  }

  private flushAllLeaderboardHistoryScrolls(): void {
    document.querySelectorAll('[data-lbh-user]').forEach((node) => {
      const el = node as HTMLElement;
      const u = el.getAttribute('data-lbh-user');
      if (u) {
        const key = this.leaderboardHistoryScrollKey(u);
        this.tableScroll.write(key, el.scrollTop);
      }
    });
  }

  /** Pick lock = stored `startDateTime`; naive strings = America/Chicago (same as dashboard). */
  private isMatchPastCutoff(match: { startDateTime?: string }): boolean {
    return isPickLockPassed(match.startDateTime);
  }

  /** Merge picked matches with tournament matches that are past pick lock only. Show NP for matches not picked. */
  private mergePickedWithAllMatches(pickedMatches: any[], username: string): any[] {
    // Backend may send id or matchId; normalize both.
    const pickedMatchMap = new Map(
      pickedMatches
        .map((m: any) => [m.matchId ?? m.id, m] as const)
        .filter(([id]) => id != null)
    );

    const isCurrentUserRow = username === this.currentUser?.username;
    const matchesPastCutoff = this.allTournamentMatches.filter((m) => this.isMatchPastCutoff(m));
    // For each tournament match past cutoff, use picked data if available, otherwise mark as NP.
    const mergedMatches = matchesPastCutoff.map(tournamentMatch => {
      const pickedMatch = pickedMatchMap.get(tournamentMatch.id);
      // fallbackPick is only available for the currently logged-in user's own row
      const fallbackPick = isCurrentUserRow ? this.currentUserPicks[tournamentMatch.id] : null;

      if (pickedMatch) {
        const normalizedPick = pickedMatch.userPick ?? pickedMatch.team ?? pickedMatch.pick ?? fallbackPick ?? null;
        return {
          ...tournamentMatch,
          ...pickedMatch,
          id: pickedMatch.id ?? pickedMatch.matchId ?? tournamentMatch.id,
          matchId: pickedMatch.matchId ?? tournamentMatch.id,
          userPick: normalizedPick,
          isNoPick: !normalizedPick
        };
      } else {
        // User didn't pick this match.
        return {
          ...tournamentMatch,
          userPick: fallbackPick ?? null,
          isNoPick: !fallbackPick
        };
      }
    });

    return mergedMatches.sort((a, b) => compareMatchStartAsc(a, b));
  }

  getHistoryForUser(username: string): any[] {
    const cached = this.userHistoryCache[username];
    return cached?.matches ?? [];
  }

  /** True if the selected tournament has at least one match whose pick lock has passed. */
  hasPastCutoffMatchesInTournament(): boolean {
    return this.allTournamentMatches.some((m) => this.isMatchPastCutoff(m));
  }

  /** Display name for pick/winner: supports team name or legacy "A"/"B". */
  getTeamName(match: any, pick: string): string {
    if (!pick) return 'No Pick';
    if (pick === 'A' || pick === 'B') return pick === 'A' ? match.teamA : match.teamB;
    return pick;
  }

  getWinnerName(match: any): string {
    if (isNoResultMatch(match)) return 'NR';
    if (!match.winner) return 'TBD';
    if (match.winner === 'A' || match.winner === 'B') return match.winner === 'A' ? match.teamA : match.teamB;
    return match.winner;
  }

  isMatchNoResult(match: any): boolean {
    return isNoResultMatch(match);
  }
}
