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

  /** Normalize points from various backend field names. */
  private normalizeLeaderboardEntry(entry: any): any {
    const points = entry.totalPoints ?? entry.points ?? entry.score ?? entry.totalScore ?? 0;
    return { ...entry, displayPoints: Number(points) };
  }

  /**
   * Sort by points descending, assign competition rank (ties share the same rank),
   * and row numbers (#) 1..n in display order.
   */
  private computeLeaderboardWithRanks(raw: any[]): any[] {
    const withPoints = raw.map((u: any) => this.normalizeLeaderboardEntry(u));
    const sorted = [...withPoints].sort((a, b) => b.displayPoints - a.displayPoints);
    let rank = 1;
    let previousPoints: number | null = null;
    
    return sorted.map((entry, index) => {
      const rowNumber = index + 1;
      // Only increment rank when points differ from previous entry
      if (previousPoints !== null && entry.displayPoints < previousPoints) {
        // Count how many unique point values we've seen to determine correct rank
        const uniquePointsBefore = new Set(sorted.slice(0, index).map(e => e.displayPoints)).size;
        rank = uniquePointsBefore + 1;
      }
      previousPoints = entry.displayPoints;
      return { ...entry, displayRank: rank, rowNumber };
    });
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
      this.leaderboard = this.computeLeaderboardWithRanks(raw);
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
    this.matchService.getUserHistoryByUsername(username, tid).subscribe({
      next: (data) => {
        const pickedMatches = data.matches ?? [];
        
        // Merge picked matches with all tournament matches
        const enrichedMatches = this.mergePickedWithAllMatches(pickedMatches);
        
        this.userHistoryCache[username] = { totalPoints: data.totalPoints ?? 0, matches: enrichedMatches };
        this.loadingHistoryForUser = null;
      },
      error: () => {
        this.historyLoadError[username] = 'Could not load history.';
        this.loadingHistoryForUser = null;
      }
    });
  }

  /** Merge picked matches with all tournament matches. Show NR for matches not picked. */
  private mergePickedWithAllMatches(pickedMatches: any[]): any[] {
    // Create a map of picked matches by ID for quick lookup
    const pickedMatchMap = new Map(pickedMatches.map(m => [m.matchId, m]));
    
    // For each tournament match, use picked data if available, otherwise mark as NR
    const mergedMatches = this.allTournamentMatches.map(tournamentMatch => {
      const pickedMatch = pickedMatchMap.get(tournamentMatch.id);
      
      if (pickedMatch) {
        // User picked this match - use the picked match data (includes userPick)
        return pickedMatch;
      } else {
        // User didn't pick this match - create entry with NR
        return {
          ...tournamentMatch,
          userPick: null, // No pick from user
          isNoPick: true  // Mark as no pick
        };
      }
    });
    
    // Sort by date
    return mergedMatches.sort((a, b) => 
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
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
    if (isNoResultMatch(match)) return 'NR';
    if (!match.winner) return 'TBD';
    if (match.winner === 'A' || match.winner === 'B') return match.winner === 'A' ? match.teamA : match.teamB;
    return match.winner;
  }

  isMatchNoResult(match: any): boolean {
    return isNoResultMatch(match);
  }
}
