import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatchService } from '../match.service';
import { AuthService } from '../auth.service';
import { NotificationService } from '../notification.service';
import { WebSocketService } from '../websocket.service';
import { WelcomeMessageService } from '../welcome-message.service';

@Component({
  selector: 'app-user-dashboard',
  imports: [CommonModule, RouterModule],
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

  constructor(
    private matchService: MatchService,
    private authService: AuthService,
    private notification: NotificationService,
    private webSocketService: WebSocketService,
    private welcomeMessageService: WelcomeMessageService
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
    this.loadUserData();
    this.loadLeaderboardRank();
    this.loadUpcomingMatches();
    this.loadUserPicks();
    this.webSocketService.matchUpdates$.subscribe((match) => {
      this.loadUpcomingMatches();
      this.notification.showInfo(`Match ${match.teamA} vs ${match.teamB} has started`);
    });
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
    this.matchService.getLeaderboard().subscribe({
      next: (data) => {
        const list: any[] = (data || []).filter((u: any) => u.enabled !== false);
        const index = list.findIndex((u: any) => u.username === this.user?.username);
        if (index >= 0) {
          const entry = list[index];
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
    this.matchService.getUserHistory().subscribe({
      next: (data) => {
        this.totalPoints = data.totalPoints;
        this.userHistory = data.matches;
      },
      error: (err) => {
        console.error('Error fetching user history:', err);
      }
    });
  }

  loadUserPicks() {
    // Fetch user picks from backend (assume /predictions/mine returns array of { matchId, team })
    this.matchService.getUserPicks().subscribe({
      next: (picks) => {
        this.userPicks = {};
        picks.forEach((pick: any) => {
          this.userPicks[pick.matchId] = pick.team;
        });
        // Update matches with userPick
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
    this.matchService.getAllMatches().subscribe({
      next: (matches) => {
        this.upcomingMatches = matches.sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        // After loading matches, update with user picks if already loaded
        if (Object.keys(this.userPicks).length > 0) {
          this.upcomingMatches.forEach(match => {
            match.userPick = this.userPicks[match.id];
          });
        }
      }
    });
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

  /** Display name for winner: supports team name or legacy "A"/"B". */
  getWinnerName(match: any): string {
    if (!match.winner) return 'TBD';
    if (match.winner === 'A' || match.winner === 'B') return match.winner === 'A' ? match.teamA : match.teamB;
    return match.winner;
  }
}
