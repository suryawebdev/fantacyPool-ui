import { Component, OnDestroy, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatchService } from '../match.service';
import { AuthService } from '../auth.service';
import { NotificationService } from '../notification.service';
// import { WebSocketService } from '../websocket.service';
import { WelcomeMessageService } from '../welcome-message.service';
import { TournamentService } from '../tournament.service';
import { SelectedTournamentService } from '../selected-tournament.service';
import { Tournament } from '../models/tournament.model';
import { isNoResultMatch } from '../match-outcome';
import { compareMatchStartAsc, isPickLockPassed } from '../match-pick-lock.util';

@Component({
  selector: 'app-user-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss'
})
export class UserDashboard implements OnInit, OnDestroy {
  points: number = 0;
  upcomingMatches: any[] = [];
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
  } = {};
  userPicks: { [matchId: number]: string } = {};
  userHistory: any[] = [];
  totalPoints: number = 0;
  welcomeMessage: string | null = null;
  userRank: number | null = null;

  /** Tournaments the user is enrolled in; selected one drives leaderboard, matches, history. */
  myTournaments: Tournament[] = [];
  selectedTournamentId: number | null = null;
  loadingTournaments = false;
  /** All matches in the selected tournament */
  allTournamentMatches: any[] = [];

  @ViewChild('upcomingMatchesBody') upcomingMatchesBody?: ElementRef<HTMLDivElement>;
  @ViewChild('historyMatchesBody') historyMatchesBody?: ElementRef<HTMLDivElement>;

  private scrollPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly scrollDebounceMs = 150;

  constructor(
    private matchService: MatchService,
    private authService: AuthService,
    private notification: NotificationService,
    // private webSocketService: WebSocketService,
    private welcomeMessageService: WelcomeMessageService,
    private tournamentService: TournamentService,
    private selectedTournamentService: SelectedTournamentService
  ) {}

  ngOnInit() {
    const hasMessage = this.welcomeMessageService.getMessage();
    const isAuthenticated = this.authService.isAuthenticated();

    if (isAuthenticated) {
      this.welcomeMessageService.clearMessage();
      this.welcomeMessage = null;
    } else if (hasMessage) {
      this.welcomeMessage = hasMessage;
      return;
    } else {
      this.welcomeMessage = null;
    }

    this.user = this.authService.getUserDetails() || {};
    this.loadMyTournaments();
    // WebSockets disabled — match live updates / notifications
    // this.webSocketService.matchUpdates$.subscribe((match) => {
    //   if (this.selectedTournamentId) this.loadUpcomingMatches();
    //   this.notification.showInfo(`Match ${match.teamA} vs ${match.teamB} has started`);
    // });
  }

  loadMyTournaments() {
    this.loadingTournaments = true;
    this.tournamentService.getEnrolledTournaments().subscribe({
      next: (list) => {
        this.myTournaments = list || [];
        const ids = this.myTournaments.map(t => t.id);
        this.selectedTournamentId = this.selectedTournamentService.resolveSelection(ids);
        if (this.selectedTournamentId != null) {
          this.selectedTournamentService.setSelectedTournamentId(this.selectedTournamentId);
          this.onTournamentChange();
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
    this.onTournamentChange();
  }

  onTournamentChange() {
    if (this.selectedTournamentId == null) {
      this.upcomingMatches = [];
      this.userHistory = [];
      this.totalPoints = 0;
      this.userRank = null;
      this.allTournamentMatches = [];
      return;
    }
    this.loadLeaderboardRank();
    this.loadUserData();
    this.loadUpcomingMatches();
    this.loadUserPicks();
  }

  goToSignIn() {
    this.welcomeMessageService.clearMessage();
  }

  /** Display name for welcome: firstName + lastName, or username, or "there" */
  getWelcomeName(): string {
    const first = this.user?.firstName?.trim();
    const last = this.user?.lastName?.trim();
    if (first || last) return [first, last].filter(Boolean).join(' ');
    return this.user?.username || 'there';
  }

  loadLeaderboardRank() {
    if (this.selectedTournamentId == null) {
      this.userRank = null;
      return;
    }
    this.tournamentService.getTournamentLeaderboard(this.selectedTournamentId).subscribe({
      next: (list: any[]) => {
        const arr = list || [];
        const index = arr.findIndex((u: any) => u.username === this.user?.username);
        if (index >= 0) {
          const entry = arr[index];
          this.userRank = entry?.rank != null ? entry.rank : index + 1;
        } else {
          this.userRank = null;
        }
      },
      error: () => {
        this.userRank = null;
      }
    });
  }

  loadUserData() {
    if (this.selectedTournamentId == null) return;
    
    // Load both user history and all tournament matches
    Promise.all([
      this.matchService.getUserHistory(this.selectedTournamentId).toPromise(),
      this.matchService.getMatchesByTournament(this.selectedTournamentId).toPromise()
    ]).then(([historyData, matchesData]) => {
      const pickedMatches = historyData?.matches ?? [];
      this.totalPoints = historyData?.totalPoints ?? 0;
      this.allTournamentMatches = matchesData ?? [];
      
      // Merge picked matches with all tournament matches
      this.userHistory = this.mergePickedWithAllMatches(pickedMatches);
      this.applyUserPicksToHistory();
    }).catch((err) => {
      console.error('Error fetching user data:', err);
      this.totalPoints = 0;
      this.userHistory = [];
      this.allTournamentMatches = [];
    });
  }

  /** Merge picked matches with all tournament matches. Show NR for matches not picked. */
  private mergePickedWithAllMatches(pickedMatches: any[]): any[] {
    // Create a map of picked matches by ID for quick lookup.
    // Backend may return either matchId or id in history rows.
    const pickedMatchMap = new Map(
      pickedMatches
        .map((m: any) => [m.matchId ?? m.id, m] as const)
        .filter(([id]) => id != null)
    );
    
    // For each tournament match, use picked data if available, otherwise mark as NR
    const mergedMatches = this.allTournamentMatches.map(tournamentMatch => {
      const pickedMatch = pickedMatchMap.get(tournamentMatch.id);
      
      if (pickedMatch) {
        // User picked this match - use the picked match data (includes userPick)
        return { ...tournamentMatch, ...pickedMatch, isNoPick: !pickedMatch.userPick };
      } else {
        // User didn't pick this match - create entry with NR
        return {
          ...tournamentMatch,
          userPick: this.userPicks[tournamentMatch.id] ?? null, // fallback from /mine
          isNoPick: true  // Mark as no pick
        };
      }
    });
    
    // Sort by date
    return mergedMatches.sort((a, b) => compareMatchStartAsc(a, b));
  }

  loadUserPicks() {
    this.matchService.getUserPicks().subscribe({
      next: (picks) => {
        this.userPicks = {};
        picks.forEach((pick: any) => {
          this.userPicks[pick.matchId] = pick.team;
        });
        this.upcomingMatches.forEach(match => {
          match.userPick = this.userPicks[match.id];
        });
        this.applyUserPicksToHistory();
      },
      error: (err) => {
        console.error('Error fetching user picks:', err);
      }
    });
  }

  /** Keep history picks in sync with `/api/predictions/mine`, especially for undecided matches. */
  private applyUserPicksToHistory(): void {
    if (!this.userHistory?.length) return;
    this.userHistory = this.userHistory.map((match: any) => {
      const pick = this.userPicks[match.id];
      if (pick != null && pick !== '') {
        return { ...match, userPick: pick, isNoPick: false };
      }
      return match;
    });
    this.scheduleHistoryScrollRestore();
  }

  loadUpcomingMatches() {
    if (this.selectedTournamentId == null) {
      this.upcomingMatches = [];
      return;
    }
    this.matchService.getMatchesByTournament(this.selectedTournamentId).subscribe({
      next: (matches) => {
        this.upcomingMatches = (matches || []).sort((a: any, b: any) => compareMatchStartAsc(a, b));
        this.upcomingMatches.forEach(match => {
          match.userPick = this.userPicks[match.id];
        });
        this.scheduleUpcomingScrollRestore();
      },
      error: () => {
        this.upcomingMatches = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.scrollPersistTimer != null) {
      clearTimeout(this.scrollPersistTimer);
      this.scrollPersistTimer = null;
    }
    this.flushScrollPositionsToStorage();
  }

  @HostListener('document:visibilitychange')
  onDocumentVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.flushScrollPositionsToStorage();
    }
  }

  /** Persist vertical scroll for upcoming / history tables (desktop + mobile touch scroll). */
  onDashboardTableScroll(kind: 'upcoming' | 'history', event: Event): void {
    const el = event.target as HTMLElement;
    if (this.scrollPersistTimer != null) {
      clearTimeout(this.scrollPersistTimer);
    }
    this.scrollPersistTimer = setTimeout(() => {
      this.scrollPersistTimer = null;
      this.writeStoredScroll(kind, el.scrollTop);
    }, this.scrollDebounceMs);
  }

  private scrollStorageKey(kind: 'upcoming' | 'history'): string | null {
    const tid = this.selectedTournamentId;
    const u = (this.user?.username ?? 'user').trim() || 'user';
    if (tid == null) return null;
    return `fantacyPool.dashboardScroll.v1.${encodeURIComponent(u)}.${tid}.${kind}`;
  }

  private readStoredScroll(kind: 'upcoming' | 'history'): number | null {
    const k = this.scrollStorageKey(kind);
    if (!k) return null;
    try {
      const v = localStorage.getItem(k);
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    } catch {
      return null;
    }
  }

  private writeStoredScroll(kind: 'upcoming' | 'history', top: number): void {
    const k = this.scrollStorageKey(kind);
    if (!k) return;
    try {
      localStorage.setItem(k, String(Math.round(top)));
    } catch {
      /* quota / private mode */
    }
  }

  private flushScrollPositionsToStorage(): void {
    const u = this.upcomingMatchesBody?.nativeElement;
    const h = this.historyMatchesBody?.nativeElement;
    if (u) this.writeStoredScroll('upcoming', u.scrollTop);
    if (h) this.writeStoredScroll('history', h.scrollTop);
  }

  private scheduleUpcomingScrollRestore(): void {
    setTimeout(() => this.restoreScrollWithRetry('upcoming'), 0);
  }

  private scheduleHistoryScrollRestore(): void {
    setTimeout(() => this.restoreScrollWithRetry('history'), 0);
  }

  /**
   * Restore saved scrollTop, or default upcoming to bottom when nothing stored (latest matches).
   */
  private restoreScrollWithRetry(kind: 'upcoming' | 'history', attempt = 0): void {
    const el =
      kind === 'upcoming'
        ? this.upcomingMatchesBody?.nativeElement
        : this.historyMatchesBody?.nativeElement;
    if (!el) return;

    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    if (maxScroll <= 0 && attempt < 8) {
      setTimeout(() => this.restoreScrollWithRetry(kind, attempt + 1), 50);
      return;
    }

    const stored = this.readStoredScroll(kind);
    if (stored != null) {
      el.scrollTop = Math.min(stored, maxScroll);
      return;
    }
    if (kind === 'upcoming') {
      el.scrollTop = maxScroll;
    } else {
      el.scrollTop = 0;
    }
  }

  /** Pick lock uses America/Chicago for naive API datetimes so all zones share the same cutoff. */
  isMatchStarted(match: any): boolean {
    return isPickLockPassed(match.startDateTime);
  }

  selectTeam(match: any, teamName: string) {
    if (this.isMatchStarted(match)) {
      return;
    }
    this.matchService.savePrediction(match.id, teamName).subscribe({
      next: () => {
        match.userPick = teamName;
        this.userPicks[match.id] = teamName;
        this.notification.showSuccess('Your pick was saved!');
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Error saving your pick. Please try again.');
      }
    });
  }

  /** Display name for a pick: supports team name (e.g. "RCB") or legacy "A"/"B". */
  getTeamName(match: any, pick: string): string {
    if (!pick) return 'No Pick';
    if (pick === 'A' || pick === 'B') return pick === 'A' ? match.teamA : match.teamB;
    return pick;
  }

  /** Display name for winner: supports team name or legacy "A"/"B"; NR for no result. */
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
