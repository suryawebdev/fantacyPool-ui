import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../match.service';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss'
})
export class Leaderboard implements OnInit {
  leaderboard: any[] = [];
  currentUser: any = {};
  

  constructor(
    private matchService: MatchService, 
    private authService: AuthService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUserDetails() || {};
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.matchService.getLeaderboard().subscribe({
      next: (data) => {
        this.leaderboard = data;
      },
      error: (err) => {
        console.error('Error fetching leaderboard:', err);
      }
    });
  }

  isCurrentUser(user: any): boolean {
    return user.username === this.currentUser.username;
  }
}
