import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { Match, CreateMatchRequest, UpdateMatchRequest } from './models/match.model';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private baseUrl = environment.apiUrl; // e.g., http://localhost:8080/api

  constructor(private http: HttpClient) {}

  createMatch(data: CreateMatchRequest): Observable<Match> {
    return this.http.post<Match>(`${this.baseUrl}/api/matches`, data);
  }

  getAllMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/api/matches`);
  }

  // Get matches for a specific tournament
  getMatchesByTournament(tournamentId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/api/tournaments/${tournamentId}/matches`);
  }

  // Get matches for current user's active tournaments
  getMyTournamentMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/api/matches/my-tournaments`);
  }

  /** Set match winner by team name (e.g. "RCB"). Backend accepts team name string. */
  setWinner(matchId: number, winner: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/matches/${matchId}/winner`, { winner });
  }

  /**
   * No result (NR): match abandoned / washout. Backend should award **1 point** to every user who submitted
   * any pick for this match, and **0** to users with no pick; persist outcome so `GET /api/matches` and history
   * expose `noResult: true` and/or `winner` as `"NR"` (see docs/BACKEND_CONTRACT.md).
   */
  setMatchNoResult(matchId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/matches/${matchId}/winner`, { noResult: true });
  }

  deleteMatch(matchId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/matches/${matchId}`);
  }

  updateMatch(matchId: number, data: UpdateMatchRequest): Observable<Match> {
    return this.http.put<Match>(`${this.baseUrl}/api/matches/${matchId}`, data);
  }

  /** Save user prediction by team name (e.g. "RCB"). Backend accepts team string. */
  savePrediction(matchId: number, team: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/predictions`, { matchId, team });
  }

  /** Get current user's picks. Backend returns { matchId, team } with team = team name string. */
  getUserPicks(): Observable<{ matchId: number; team: string }[]> {
    return this.http.get<{ matchId: number; team: string }[]>(`${this.baseUrl}/api/predictions/mine`);
  }

  /** User's prediction history. Optional tournamentId scopes to that tournament (backend: ?tournamentId=). */
  getUserHistory(tournamentId?: number): Observable<{totalPoints: number; matches: any[]}> {
    const url = tournamentId != null
      ? `${this.baseUrl}/api/predictions/me/history?tournamentId=${tournamentId}`
      : `${this.baseUrl}/api/predictions/me/history`;
    return this.http.get<{totalPoints: number; matches: any[]}>(url);
  }

  /** Another user's prediction history (e.g. for leaderboard). Backend: GET /api/predictions/users/:username/history?tournamentId= */
  getUserHistoryByUsername(username: string, tournamentId?: number): Observable<{totalPoints: number; matches: any[]}> {
    let url = `${this.baseUrl}/api/predictions/users/${encodeURIComponent(username)}/history`;
    if (tournamentId != null) {
      url += `?tournamentId=${tournamentId}`;
    }
    return this.http.get<{totalPoints: number; matches: any[]}>(url);
  }

  getLeaderboard(): Observable<{username: string; points: number}[]> {
    return this.http.get<{username: string; points: number}[]>(`${this.baseUrl}/api/predictions/users/leaderboard`);
  }

  getSelections(page: number, pageSize: number, tournamentId?: number): Observable<any[]> {
    let url = `${this.baseUrl}/api/predictions/selections?limit=${pageSize}&page=${page}`;
    if (tournamentId != null) {
      url += `&tournamentId=${tournamentId}`;
    }
    return this.http.get<any[]>(url);
  }

  /** Selections for a single match (after cutoff). Backend: GET /api/matches/:id/selections */
  getSelectionsByMatch(matchId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/matches/${matchId}/selections`);
  }

  /**
   * Optional Phase 2 API: aggregated analytics for current user in a tournament.
   * Backend: GET /api/predictions/me/analytics?tournamentId=
   * Response: { totalPoints, correctCount, wrongCount, pointsOverTime?: { labels, values }, picksByTeam?: { [team: string]: number } }
   * If backend does not implement this, use getUserHistory() and compute client-side.
   */
  getMyAnalytics(tournamentId: number): Observable<{
    totalPoints: number;
    correctCount: number;
    wrongCount: number;
    pointsOverTime?: { labels: string[]; values: number[] };
    picksByTeam?: Record<string, number>;
  }> {
    return this.http.get<any>(`${this.baseUrl}/api/predictions/me/analytics?tournamentId=${tournamentId}`);
  }

  /**
   * Phase 3 API: pool-wide analytics (all users in tournament), same style as "My analytics".
   * Backend: GET /api/tournaments/:id/pool-analytics
   * Response can include:
   * - matchStats: per-match pick counts (required for per-match cards).
   * - totalPoints, correctCount, wrongCount: pool aggregates (for summary cards + doughnut).
   * - picksByTeam: aggregate picks by team across all matches (for bar chart); can be derived from matchStats if missing.
   * - pointsOverTime: { labels, values } for pool cumulative points (for line chart).
   */
  getPoolAnalytics(tournamentId: number): Observable<{
    matchStats?: Array<{ matchId: number; teamA: string; teamB: string; picks: Record<string, number> }>;
    totalPoints?: number;
    correctCount?: number;
    wrongCount?: number;
    picksByTeam?: Record<string, number>;
    pointsOverTime?: { labels: string[]; values: number[] };
  }> {
    return this.http.get<any>(`${this.baseUrl}/api/tournaments/${tournamentId}/pool-analytics`);
  }
}
