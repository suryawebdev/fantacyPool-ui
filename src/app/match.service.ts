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

  setWinner(matchId: number, winner: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/matches/${matchId}/winner`, { winner });
  }

  deleteMatch(matchId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/matches/${matchId}`);
  }

  updateMatch(matchId: number, data: UpdateMatchRequest): Observable<Match> {
    return this.http.put<Match>(`${this.baseUrl}/api/matches/${matchId}`, data);
  }

  savePrediction(matchId: number, team: 'A' | 'B'): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/predictions`, { matchId, team });
  }

  getUserPicks(): Observable<{ matchId: number; team: 'A' | 'B' }[]> {
    return this.http.get<{ matchId: number; team: 'A' | 'B' }[]>(`${this.baseUrl}/api/predictions/mine`);
  }

  getUserHistory(): Observable<{totalPoints: number; matches: any[]}> {
    return this.http.get<{totalPoints: number; matches: any[]}>(`${this.baseUrl}/api/predictions/me/history`);
  }

  getLeaderboard(): Observable<{username: string; points: number}[]> {
    return this.http.get<{username: string; points: number}[]>(`${this.baseUrl}/api/predictions/users/leaderboard`);
  }

  getSelections(page: number, pageSize: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/predictions/selections?limit=${pageSize}&page=${page}`);
  }
}
