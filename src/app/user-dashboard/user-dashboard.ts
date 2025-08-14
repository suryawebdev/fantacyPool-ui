import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../match.service';
import { AuthService } from '../auth.service';
import { NotificationService } from '../notification.service';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss'
})
export class UserDashboard implements OnInit {
  // username = '';
  points: number = 0;
  upcomingMatches: any[] = [];
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
  } = {};
  userPicks: { [matchId: number]: 'A' | 'B' } = {};
  userHistory: any[] = [];
  totalPoints: number = 0;

  constructor(
    private matchService: MatchService, 
    private authService: AuthService,
    private notification: NotificationService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.user = this.authService.getUserDetails() || {};
    this.loadUserData();
    this.loadUpcomingMatches();
    this.loadUserPicks();
    this.webSocketService.matchUpdates$.subscribe((match) => {
      this.loadUpcomingMatches();
      this.notification.showInfo(`Match ${match.teamA} vs ${match.teamB} has started`);
    });
  }

  loadUserData() {
    this.matchService.getUserHistory().subscribe({
      next: (data) => {
        this.totalPoints = data.totalPoints;
        this.userHistory = data.matches;
        console.log('User data loaded:', data);
      },
      error: (err) => {
        console.error('Error fetching user history:', err);
        this.notification.showError('Failed to load user history');
      }
    });
  }

  refreshUserData() {
    this.loadUserData();
    this.loadUpcomingMatches();
    this.loadUserPicks();
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
        console.log('User picks loaded:', this.userPicks);
      },
      error: (err) => {
        console.error('Error fetching user picks:', err);
        this.notification.showError('Failed to load user picks');
      }
    });
  }

  loadUpcomingMatches() {
    this.matchService.getAllMatches().subscribe({
      next: (matches) => {
        this.upcomingMatches = matches;
        // After loading matches, update with user picks if already loaded
        if (Object.keys(this.userPicks).length > 0) {
          this.upcomingMatches.forEach(match => {
            match.userPick = this.userPicks[match.id];
          });
        }
        console.log('Upcoming matches loaded:', matches);
      },
      error: (err) => {
        console.error('Error loading upcoming matches:', err);
        this.notification.showError('Failed to load upcoming matches');
      }
    });
  }

  isMatchStarted(match: any): boolean {
    return new Date(match.startDateTime) <= new Date();
  }

  selectTeam(match: any, team: 'A' | 'B') {
    if(this.isMatchStarted(match)) {
      this.notification.showWarning('Match has already started. Picks are locked.');
      return;
    }

    // Log the request details for debugging
    console.log('Saving prediction:', {
      matchId: match.id,
      team: team,
      match: match,
      token: this.authService.getToken() ? 'Present' : 'Missing'
    });

    this.matchService.savePrediction(match.id, team).subscribe({
      next: (response) => {
        console.log('Prediction saved successfully:', response);
        match.userPick = team;
        this.userPicks[match.id] = team;
        this.notification.showSuccess('Your pick was saved!');
        
        // Refresh user data to ensure consistency
        this.refreshUserData();
      },
      error: (err) => {
        console.error('Error saving prediction:', {
          error: err,
          status: err.status,
          message: err.message,
          url: err.url,
          matchId: match.id,
          team: team
        });
        
        if (err.status === 500) {
          this.notification.showError('Server error occurred. Please try again later or contact support.');
        } else if (err.status === 401) {
          this.notification.showError('Authentication error. Please sign in again.');
        } else if (err.status === 403) {
          this.notification.showError('Access denied. You may not have permission to make predictions.');
        } else if (err.status === 400) {
          this.notification.showError('Invalid request. Please check your selection and try again.');
        } else {
          this.notification.showError(`Error saving your pick (${err.status}). Please try again.`);
        }
      }
    });
  }

  getTeamName(match: any, pick: 'A' | 'B'): string {
    if(!pick) {
      return 'No Pick';
    }
    return pick === 'A' ? match.teamA : match.teamB;
  }

  getWinnerName(match: any): string {
    if(!match.winner) {
      return 'TBD';
    }
    return match.winner === 'A' ? match.teamA : match.teamB;
  }
}
