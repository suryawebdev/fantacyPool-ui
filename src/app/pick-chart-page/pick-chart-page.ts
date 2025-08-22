import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickChart } from '../pick-chart/pick-chart';
import { MatchService } from '../match.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-pick-chart-page',
  imports: [CommonModule, PickChart],
  templateUrl: './pick-chart-page.html',
  styleUrl: './pick-chart-page.scss'
})
export class PickChartPage implements OnInit {
  matches: any[] = [];
  userPicks: any[] = [];
  loading = true;

  constructor(
    private matchService: MatchService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading = true;
    
    // Load matches
    this.matchService.getAllMatches().subscribe({
      next: (matches) => {
        console.log('Matches loaded:', matches);
        this.matches = matches;
        this.loadUserPicks();
      },
      error: (error) => {
        console.error('Error loading matches:', error);
        this.loading = false;
      }
    });
  }

  private loadUserPicks() {
    // Load user picks
    this.matchService.getUserPicks().subscribe({
      next: (picks) => {
        console.log('User picks loaded:', picks);
        this.userPicks = picks;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading user picks:', error);
        this.userPicks = [];
        this.loading = false;
      }
    });
  }
}
