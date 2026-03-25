import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

@Component({
  selector: 'app-user-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss'
})
export class UserDashboard implements OnInit {
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

  @ViewChild('upcomingMatchesBody') upcomingMatchesBody?: ElementRef<HTMLDivElement>;

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
    this.matchService.getUserHistory(this.selectedTournamentId ?? undefined).subscribe({
      next: (data) => {
        this.totalPoints = data.totalPoints;
        this.userHistory = data.matches || [];
      },
      error: (err) => {
        console.error('Error fetching user history:', err);
      }
    });
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
      },
      error: (err) => {
        console.error('Error fetching user picks:', err);
      }
    });
  }

  loadUpcomingMatches() {
    if (this.selectedTournamentId == null) {
      this.upcomingMatches = [];
      return;
    }
    this.matchService.getMatchesByTournament(this.selectedTournamentId).subscribe({
      next: (matches) => {
        this.upcomingMatches = (matches || []).sort((a: any, b: any) =>
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        );
        this.upcomingMatches.forEach(match => {
          match.userPick = this.userPicks[match.id];
        });
        setTimeout(() => this.scrollUpcomingToBottom(), 150);
      },
      error: () => {
        this.upcomingMatches = [];
      }
    });
  }

  /** Scroll upcoming matches table to bottom so latest matches are in view. */
  scrollUpcomingToBottom(): void {
    const el = this.upcomingMatchesBody?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  isMatchStarted(match: any): boolean {
    return new Date(match.startDateTime) <= new Date();
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
