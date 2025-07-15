import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private baseUrl = environment.apiUrl; // e.g., http://localhost:8080/api

  constructor(private http: HttpClient) {}

  createMatch(data: { teamA: string; teamB: string; startTime: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/matches`, data);
  }

  getAllMatches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/matches`);
  }

  setWinner(matchId: number, winner: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/matches/${matchId}/winner`, { winner });
  }

  deleteMatch(matchId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/matches/${matchId}`);
  }

  updateMatch(matchId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/matches/${matchId}`, data);
  }
}
