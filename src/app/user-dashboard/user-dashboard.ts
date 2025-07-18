import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../match.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-user-dashboard',
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

  constructor(private matchService: MatchService, private authService: AuthService) {}

  ngOnInit() {
    this.user = this.authService.getUserDetails() || {};
    this.loadUserData();
    this.loadUpcomingMatches();
    this.loadUserPicks();
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
        this.upcomingMatches = matches;
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

  selectTeam(match: any, team: 'A' | 'B') {
    if(this.isMatchStarted(match)) {
      // TODO: Show a message to the user that the match has already started
      return;
    }
    this.matchService.savePrediction(match.id, team).subscribe({
      next: () => {
        match.userPick = team;
        this.userPicks[match.id] = team;
      },
      error: (err) => {
        alert('Error saving your pick. Please try again.');
        console.error(err);
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
