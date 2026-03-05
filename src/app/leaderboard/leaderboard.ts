import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../tournament.service';
import { AuthService } from '../auth.service';
import { SelectedTournamentService } from '../selected-tournament.service';
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

  constructor(
    private tournamentService: TournamentService,
    private authService: AuthService,
    private selectedTournamentService: SelectedTournamentService,
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
}
