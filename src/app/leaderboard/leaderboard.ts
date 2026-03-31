import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss'
})
export class Leaderboard implements OnInit {
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
  /** MatchId -> username -> locked selection (from /matches/:id/selections). */
  matchSelectionsByUsername: Record<number, Record<string, any>> = {};

  constructor(
    private tournamentService: TournamentService,
    private authService: AuthService,
    private selectedTournamentService: SelectedTournamentService,
    private matchService: MatchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUserDetails() || {};
    this.loadCurrentUserPicks();
    this.loadTournaments();
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
      this.expandedUsernames.delete(username);
      return;
    }
    this.expandedUsernames.add(username);
    if (this.userHistoryCache[username] != null) return;
    this.loadUserHistory(username);
  }

  private loadUserHistory(username: string): void {
    this.loadingHistoryForUser = username;
    this.historyLoadError[username] = '';
    const tid = this.selectedTournamentId ?? undefined;
    firstValueFrom(this.matchService.getUserHistoryByUsername(username, tid))
      .then(async (data) => {
        const matchesPastCutoff = this.allTournamentMatches.filter((m) => this.isMatchPastCutoff(m));
        await this.loadSelectionsForMatches(matchesPastCutoff);

        const pickedMatches = data.matches ?? [];
        const enrichedMatches = this.mergePickedWithAllMatches(pickedMatches, username);

        this.userHistoryCache[username] = { totalPoints: data.totalPoints ?? 0, matches: enrichedMatches };
        this.loadingHistoryForUser = null;
      })
      .catch(() => {
        this.historyLoadError[username] = 'Could not load history.';
        this.loadingHistoryForUser = null;
      });
  }

  private async loadSelectionsForMatches(matches: any[]): Promise<void> {
    const pending = (matches ?? [])
      .map((m: any) => Number(m?.id))
      .filter((id) => !Number.isNaN(id) && this.matchSelectionsByUsername[id] == null)
      .map(async (matchId) => {
        try {
          const list = await firstValueFrom(this.matchService.getSelectionsByMatch(matchId));
          const byUsername: Record<string, any> = {};
          (list ?? []).forEach((entry: any) => {
            const username = entry?.username != null ? String(entry.username) : null;
            if (username) {
              byUsername[username] = entry;
            }
          });
          this.matchSelectionsByUsername[matchId] = byUsername;
        } catch {
          this.matchSelectionsByUsername[matchId] = {};
        }
      });

    await Promise.all(pending);
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
      const selectionEntry = this.matchSelectionsByUsername[tournamentMatch.id]?.[username] ?? null;
      const fallbackPick = isCurrentUserRow ? this.currentUserPicks[tournamentMatch.id] : null;
      const selectionPick = selectionEntry?.team ?? selectionEntry?.userPick ?? selectionEntry?.pick ?? null;
      
      if (pickedMatch) {
        const normalizedPick =
          pickedMatch.userPick ?? pickedMatch.team ?? pickedMatch.pick ?? selectionPick ?? fallbackPick ?? null;
        return {
          ...tournamentMatch,
          ...pickedMatch,
          id: pickedMatch.id ?? pickedMatch.matchId ?? tournamentMatch.id,
          matchId: pickedMatch.matchId ?? tournamentMatch.id,
          userPick: normalizedPick,
          isNoPick: !normalizedPick
        };
      } else {
        // User didn't pick this match in history payload.
        return {
          ...tournamentMatch,
          userPick: selectionPick ?? fallbackPick ?? null,
          isNoPick: !(selectionPick ?? fallbackPick)
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
