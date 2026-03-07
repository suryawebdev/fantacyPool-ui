import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../tournament.service';
import { AuthService } from '../auth.service';
import { SelectedTournamentService } from '../selected-tournament.service';
import { MatchService } from '../match.service';
import { Router } from '@angular/router';
import { Tournament } from '../models/tournament.model';

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

  constructor(
    private tournamentService: TournamentService,
    private authService: AuthService,
    private selectedTournamentService: SelectedTournamentService,
    private matchService: MatchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUserDetails() || {};
    this.loadTournaments();
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

  /** Normalize points/rank from various backend field names. */
  private normalizeLeaderboardEntry(entry: any, index: number): any {
    const points = entry.totalPoints ?? entry.points ?? entry.score ?? entry.totalScore ?? 0;
    const rank = entry.rank ?? entry.position ?? index + 1;
    return { ...entry, displayPoints: Number(points), displayRank: rank };
  }

  loadLeaderboard() {
    if (this.selectedTournamentId == null) {
      this.leaderboard = [];
      return;
    }
    this.expandedUsernames.clear();
    this.userHistoryCache = {};
    this.historyLoadError = {};
    this.loadingLeaderboard = true;
    this.tournamentService.getTournamentLeaderboard(this.selectedTournamentId).subscribe({
      next: (data) => {
        const raw = (data || []).filter((u: any) => u.enabled !== false);
        this.leaderboard = raw.map((u: any, i: number) => this.normalizeLeaderboardEntry(u, i));
        this.loadingLeaderboard = false;
      },
      error: (err) => {
        console.error('Error fetching leaderboard:', err);
        this.leaderboard = [];
        this.loadingLeaderboard = false;
      }
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
    this.matchService.getUserHistoryByUsername(username, tid).subscribe({
      next: (data) => {
        this.userHistoryCache[username] = { totalPoints: data.totalPoints ?? 0, matches: data.matches ?? [] };
        this.loadingHistoryForUser = null;
      },
      error: () => {
        this.historyLoadError[username] = 'Could not load history.';
        this.loadingHistoryForUser = null;
      }
    });
  }

  getHistoryForUser(username: string): any[] {
    const cached = this.userHistoryCache[username];
    return cached?.matches ?? [];
  }

  /** Display name for pick/winner: supports team name or legacy "A"/"B". */
  getTeamName(match: any, pick: string): string {
    if (!pick) return 'No Pick';
    if (pick === 'A' || pick === 'B') return pick === 'A' ? match.teamA : match.teamB;
    return pick;
  }

  getWinnerName(match: any): string {
    if (!match.winner) return 'TBD';
    if (match.winner === 'A' || match.winner === 'B') return match.winner === 'A' ? match.teamA : match.teamB;
    return match.winner;
  }
}
