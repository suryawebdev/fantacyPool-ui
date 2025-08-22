import { Injectable } from '@angular/core';

export interface PickData {
  matchId: number;
  teamA: string;
  teamB: string;
  teamAPicks: number;
  teamBPicks: number;
  totalPicks: number;
  winner?: 'A' | 'B';
  startDateTime: string;
}

export interface UserPerformance {
  matchId: number;
  userPick: 'A' | 'B';
  actualWinner: 'A' | 'B';
  correct: boolean;
  date: string;
  points: number;
}

@Injectable({
  providedIn: 'root'
})
export class VisualizationService {

  constructor() { }

  // Process match data for visualization
  processPickData(matches: any[], userPicks: any[]): PickData[] {
    return matches.map(match => {
      const teamAPicks = userPicks.filter(pick => 
        pick.matchId === match.id && pick.team === 'A'
      ).length;
      
      const teamBPicks = userPicks.filter(pick => 
        pick.matchId === match.id && pick.team === 'B'
      ).length;

      return {
        matchId: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        teamAPicks,
        teamBPicks,
        totalPicks: teamAPicks + teamBPicks,
        winner: match.winner,
        startDateTime: match.startDateTime
      };
    });
  }

  // Process user performance data
  processUserPerformance(history: any[]): UserPerformance[] {
    return history.map(match => ({
      matchId: match.id,
      userPick: match.userPick,
      actualWinner: match.winner,
      correct: match.userPick === match.winner,
      date: match.startDateTime,
      points: match.pointsEarned || 0
    }));
  }

  // Format date for D3
  formatDate(dateString: string): Date {
    return new Date(dateString);
  }
}
