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
}
