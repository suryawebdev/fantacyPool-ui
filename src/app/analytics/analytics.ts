import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { MatchService } from '../match.service';
import { TournamentService } from '../tournament.service';
import { SelectedTournamentService } from '../selected-tournament.service';
import { Tournament } from '../models/tournament.model';
import { isNoResultMatch } from '../match-outcome';
import { compareMatchStartAsc, isPickLockPassed } from '../match-pick-lock.util';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss'
})
export class Analytics implements OnInit {
  myTournaments: Tournament[] = [];
  selectedTournamentId: number | null = null;
  loadingTournaments = false;
  loadingAnalytics = false;

  totalPoints = 0;
  correctCount = 0;
  wrongCount = 0;
  totalDecided = 0;
  winRatePercent: number | null = null;

  doughnutData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Correct', 'Wrong'],
    datasets: [{ data: [0, 0], backgroundColor: ['#00d4aa', '#c0392b'], hoverBackgroundColor: ['#00d4aa', '#c0392b'] }]
  };
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'bottom' } }
  };

  lineData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      label: 'Cumulative points',
      data: [],
      borderColor: '#00d4aa',
      backgroundColor: 'rgba(0, 212, 170, 0.1)',
      fill: true,
      tension: 0.2
    }]
  };
  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Points' } },
      x: { title: { display: true, text: 'Match' } }
    },
    plugins: { legend: { position: 'bottom' } }
  };

  picksByTeamBarData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ label: 'Times picked', data: [], backgroundColor: 'rgba(0, 212, 170, 0.6)', borderColor: '#00d4aa', borderWidth: 1 }]
  };
  picksByTeamBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 } },
      y: {}
    },
    plugins: { legend: { display: false } }
  };

  activeSection: 'my' | 'pool' = 'my';

  poolMatchStats: Array<{ matchId: number; teamA: string; teamB: string; picks: Record<string, number> }> = [];
  loadingPool = false;
  poolUnavailable = false;
  poolTotalPoints = 0;
  poolCorrectCount = 0;
  poolWrongCount = 0;
  poolWinRatePercent: number | null = null;
  poolDoughnutData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Correct', 'Wrong'],
    datasets: [{ data: [0, 0], backgroundColor: ['#00d4aa', '#c0392b'], hoverBackgroundColor: ['#00d4aa', '#c0392b'] }]
  };
  poolLineData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{ label: 'Pool cumulative points', data: [], borderColor: '#3742fa', backgroundColor: 'rgba(55, 66, 250, 0.1)', fill: true, tension: 0.2 }]
  };
  poolPicksByTeamBarData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ label: 'Pool picks', data: [], backgroundColor: 'rgba(55, 66, 250, 0.6)', borderColor: '#3742fa', borderWidth: 1 }]
  };
  poolPicksByTeamBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y',
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: {} },
    plugins: { legend: { display: false } }
  };
  hasPoolAggregates = false;

  showPickDistributionByMatch = true;
  poolNoMatchesPastCutoff = false;

  private tournamentMatchStartById: Record<number, string> = {};

  constructor(
    private matchService: MatchService,
    private tournamentService: TournamentService,
    private selectedTournamentService: SelectedTournamentService
  ) {}

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loadingTournaments = true;
    this.tournamentService.getEnrolledTournaments().subscribe({
      next: (list) => {
        this.myTournaments = list || [];
        const ids = this.myTournaments.map(t => t.id);
        this.selectedTournamentId = this.selectedTournamentService.resolveSelection(ids);
        if (this.selectedTournamentId != null) {
          this.selectedTournamentService.setSelectedTournamentId(this.selectedTournamentId);
          this.loadAnalytics();
        }
        this.loadingTournaments = false;
      },
      error: () => {
        this.myTournaments = [];
        this.loadingTournaments = false;
      }
    });
  }

  onTournamentSelect(value: number | string): void {
    this.selectedTournamentId = value === '' || value == null ? null : Number(value);
    this.selectedTournamentService.setSelectedTournamentId(this.selectedTournamentId);
    this.loadAnalytics();
    this.poolMatchStats = [];
    this.poolUnavailable = false;
    this.poolNoMatchesPastCutoff = false;
    if (this.activeSection === 'pool' && this.selectedTournamentId != null) {
      this.loadPoolAnalytics();
    }
  }

  setSection(section: 'my' | 'pool'): void {
    this.activeSection = section;
    if (section === 'pool' && this.selectedTournamentId != null && this.poolMatchStats.length === 0 && !this.poolUnavailable) {
      this.loadPoolAnalytics();
    }
  }

  loadPoolAnalytics(): void {
    if (this.selectedTournamentId == null) return;
    this.loadingPool = true;
    this.poolUnavailable = false;
    this.poolNoMatchesPastCutoff = false;
    const tid = this.selectedTournamentId;

    firstValueFrom(this.matchService.getMatchesByTournament(tid))
      .then((matches) => {
        this.tournamentMatchStartById = {};
        const now = Date.now();
        const eligibleMatchIds: number[] = [];
        (matches ?? []).forEach((m: any) => {
          if (m?.id != null && m?.startDateTime) {
            const id = Number(m.id);
            this.tournamentMatchStartById[id] = String(m.startDateTime);
            if (isPickLockPassed(m.startDateTime, now)) {
              eligibleMatchIds.push(id);
            }
          }
        });

        const hasScheduledMatches = (matches ?? []).length > 0;
        if (hasScheduledMatches && eligibleMatchIds.length === 0) {
          this.applyEmptyPoolAnalyticsResponse();
          this.poolNoMatchesPastCutoff = true;
          this.loadingPool = false;
          return Promise.resolve<void>(undefined);
        }

        return firstValueFrom(this.matchService.getPoolAnalytics(tid)).then((res) => {
          this.applyPoolAnalyticsResponse(res);
          this.loadingPool = false;
        });
      })
      .catch(() => {
        this.poolUnavailable = true;
        this.tournamentMatchStartById = {};
        this.poolMatchStats = [];
        this.hasPoolAggregates = false;
        this.poolNoMatchesPastCutoff = false;
        this.loadingPool = false;
      });
  }

  private applyEmptyPoolAnalyticsResponse(): void {
    this.poolMatchStats = [];
    this.poolTotalPoints = 0;
    this.poolCorrectCount = 0;
    this.poolWrongCount = 0;
    this.poolWinRatePercent = null;
    this.hasPoolAggregates = false;
    this.poolDoughnutData = {
      labels: ['Correct', 'Wrong'],
      datasets: [{ data: [0, 0], backgroundColor: ['#00d4aa', '#c0392b'], hoverBackgroundColor: ['#00d4aa', '#c0392b'] }]
    };
    this.poolLineData = {
      labels: [],
      datasets: [{ label: 'Pool cumulative points', data: [], borderColor: '#3742fa', backgroundColor: 'rgba(55, 66, 250, 0.1)', fill: true, tension: 0.2 }]
    };
    this.poolPicksByTeamBarData = {
      labels: [],
      datasets: [{ label: 'Pool picks', data: [], backgroundColor: 'rgba(55, 66, 250, 0.6)', borderColor: '#3742fa', borderWidth: 1 }]
    };
  }

  private applyPoolAnalyticsResponse(res: any): void {
    this.poolMatchStats = res?.matchStats ?? [];
    const totalPoints = res?.totalPoints ?? 0;
    const correctCount = res?.correctCount ?? 0;
    const wrongCount = res?.wrongCount ?? 0;
    let picksByTeam = res?.picksByTeam ?? null;
    const pointsOverTime = res?.pointsOverTime;

    if (!picksByTeam && this.poolMatchStats.length > 0) {
      picksByTeam = {};
      this.poolMatchStats.forEach(m => {
        Object.entries(m.picks || {}).forEach(([team, count]) => {
          picksByTeam![team] = (picksByTeam![team] ?? 0) + Number(count);
        });
      });
    }

    this.poolTotalPoints = totalPoints;
    this.poolCorrectCount = correctCount;
    this.poolWrongCount = wrongCount;
    const totalDecided = correctCount + wrongCount;
    this.poolWinRatePercent = totalDecided > 0 ? Math.round((correctCount / totalDecided) * 100) : null;
    this.hasPoolAggregates = totalPoints > 0 || totalDecided > 0 || !!(picksByTeam && Object.keys(picksByTeam).length > 0);

    this.poolDoughnutData = {
      labels: ['Correct', 'Wrong'],
      datasets: [{
        data: [correctCount, wrongCount],
        backgroundColor: ['#00d4aa', '#c0392b'],
        hoverBackgroundColor: ['#00d4aa', '#c0392b']
      }]
    };

    if (pointsOverTime?.labels?.length && pointsOverTime?.values?.length) {
      this.poolLineData = {
        labels: pointsOverTime.labels,
        datasets: [{
          label: 'Pool cumulative points',
          data: pointsOverTime.values,
          borderColor: '#3742fa',
          backgroundColor: 'rgba(55, 66, 250, 0.1)',
          fill: true,
          tension: 0.2
        }]
      };
    } else {
      this.poolLineData = {
        labels: [],
        datasets: [{ label: 'Pool cumulative points', data: [], borderColor: '#3742fa', backgroundColor: 'rgba(55, 66, 250, 0.1)', fill: true, tension: 0.2 }]
      };
    }

    const teamLabels = picksByTeam ? Object.keys(picksByTeam).sort() : [];
    this.poolPicksByTeamBarData = {
      labels: teamLabels,
      datasets: [{
        label: 'Pool picks',
        data: teamLabels.map(t => picksByTeam![t]),
        backgroundColor: 'rgba(55, 66, 250, 0.6)',
        borderColor: '#3742fa',
        borderWidth: 1
      }]
    };
  }

  getPoolPicksList(picks: Record<string, number> | undefined): Array<{ team: string; count: number }> {
    if (!picks || typeof picks !== 'object') return [];
    return Object.entries(picks)
      .map(([team, count]) => ({ team, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
  }

  getPoolMatchStatsPastCutoff(): Array<{ matchId: number; teamA: string; teamB: string; picks: Record<string, number> }> {
    const now = Date.now();
    return (this.poolMatchStats ?? []).filter((m) => {
      const dt = this.tournamentMatchStartById?.[Number(m.matchId)];
      return isPickLockPassed(dt, now);
    });
  }

  loadAnalytics(): void {
    if (this.selectedTournamentId == null) {
      this.resetCharts();
      return;
    }
    this.loadingAnalytics = true;
    this.matchService.getUserHistory(this.selectedTournamentId).subscribe({
      next: (res) => {
        const matches = (res?.matches ?? []).slice().sort((a: any, b: any) => compareMatchStartAsc(a, b));
        this.totalPoints = res?.totalPoints ?? 0;

        let correct = 0;
        let wrong = 0;
        const cumulativePoints: number[] = [];
        let running = 0;
        const labels: string[] = [];

        const picksByTeam: Record<string, number> = {};
        matches.forEach((m: any, i: number) => {
          const pts = m.pointsEarned != null ? Number(m.pointsEarned) : 0;
          running += pts;
          cumulativePoints.push(running);
          const label = m.teamA && m.teamB ? `${m.teamA} vs ${m.teamB}` : `Match ${i + 1}`;
          labels.push(label.length > 18 ? label.slice(0, 16) + '…' : label);

          if (m.winner && !isNoResultMatch(m)) {
            if (m.userPick === m.winner) correct++;
            else wrong++;
          }
          const pick = m.userPick ? String(m.userPick).trim() : null;
          if (pick) {
            picksByTeam[pick] = (picksByTeam[pick] ?? 0) + 1;
          }
        });

        this.correctCount = correct;
        this.wrongCount = wrong;
        this.totalDecided = correct + wrong;
        this.winRatePercent = this.totalDecided > 0 ? Math.round((correct / this.totalDecided) * 100) : null;

        const teamLabels = Object.keys(picksByTeam).sort();
        this.picksByTeamBarData = {
          labels: teamLabels,
          datasets: [{
            label: 'Times picked',
            data: teamLabels.map(t => picksByTeam[t]),
            backgroundColor: 'rgba(0, 212, 170, 0.6)',
            borderColor: '#00d4aa',
            borderWidth: 1
          }]
        };

        this.doughnutData = {
          labels: ['Correct', 'Wrong'],
          datasets: [{
            data: [correct, wrong],
            backgroundColor: ['#00d4aa', '#c0392b'],
            hoverBackgroundColor: ['#00d4aa', '#c0392b']
          }]
        };

        this.lineData = {
          labels,
          datasets: [{
            label: 'Cumulative points',
            data: cumulativePoints,
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            fill: true,
            tension: 0.2
          }]
        };

        this.loadingAnalytics = false;
      },
      error: () => {
        this.resetCharts();
        this.loadingAnalytics = false;
      }
    });
  }

  private resetCharts(): void {
    this.totalPoints = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.totalDecided = 0;
    this.winRatePercent = null;
    this.doughnutData = {
      labels: ['Correct', 'Wrong'],
      datasets: [{ data: [0, 0], backgroundColor: ['#00d4aa', '#c0392b'], hoverBackgroundColor: ['#00d4aa', '#c0392b'] }]
    };
    this.lineData = {
      labels: [],
      datasets: [{ label: 'Cumulative points', data: [], borderColor: '#00d4aa', backgroundColor: 'rgba(0, 212, 170, 0.1)', fill: true, tension: 0.2 }]
    };
    this.picksByTeamBarData = {
      labels: [],
      datasets: [{ label: 'Times picked', data: [], backgroundColor: 'rgba(0, 212, 170, 0.6)', borderColor: '#00d4aa', borderWidth: 1 }]
    };
  }
}
