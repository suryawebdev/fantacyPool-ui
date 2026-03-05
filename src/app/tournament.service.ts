import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { Tournament, CreateTournamentRequest, UpdateTournamentRequest } from './models/tournament.model';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Get all tournaments
  getAllTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.baseUrl}/api/tournaments`);
  }

  // Get active tournaments (for user selection)
  getActiveTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.baseUrl}/api/tournaments/active`);
  }

  /** Tournaments the current user is enrolled in (for dashboard/leaderboard selector). Backend: GET /api/tournaments/enrolled */
  getEnrolledTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.baseUrl}/api/tournaments/enrolled`);
  }

  // Get tournament by ID
  getTournamentById(id: number): Observable<Tournament> {
    return this.http.get<Tournament>(`${this.baseUrl}/api/tournaments/${id}`);
  }

  // Create new tournament (admin only)
  createTournament(tournament: CreateTournamentRequest): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.baseUrl}/api/tournaments`, tournament);
  }

  // Update tournament (admin only)
  updateTournament(id: number, tournament: UpdateTournamentRequest): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.baseUrl}/api/tournaments/${id}`, tournament);
  }

  // Delete tournament (admin only)
  deleteTournament(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/tournaments/${id}`);
  }

  // Get tournaments created by current admin
  getMyTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.baseUrl}/api/tournaments/my-tournaments`);
  }

  // Join tournament (user action)
  joinTournament(tournamentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/tournaments/${tournamentId}/join`, {});
  }

  // Leave tournament (user action)
  leaveTournament(tournamentId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/tournaments/${tournamentId}/leave`, {});
  }

  // Get tournament participants
  getTournamentParticipants(tournamentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/tournaments/${tournamentId}/participants`);
  }

  /**
   * Replace tournament participants with the given list (bulk update).
   * Backend: PUT /api/tournaments/:id/participants body { userIds: number[] }.
   */
  setParticipants(tournamentId: number, userIds: number[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/tournaments/${tournamentId}/participants`, { userIds });
  }

  // Get tournament leaderboard
  getTournamentLeaderboard(tournamentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/tournaments/${tournamentId}/leaderboard`);
  }
}

