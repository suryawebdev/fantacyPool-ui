import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

export interface PendingUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/** Approved user for listing in admin (e.g. add to tournament). */
export interface ApprovedUser {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** List all approved (enabled) users. Backend: GET /api/admin/users (admin only). */
  getApprovedUsers(): Observable<ApprovedUser[]> {
    return this.http.get<ApprovedUser[]>(`${this.baseUrl}/api/admin/users`);
  }

  getPendingUsers(): Observable<PendingUser[]> {
    return this.http.get<PendingUser[]>(`${this.baseUrl}/api/admin/users/pending`);
  }

  approveUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/admin/users/${id}/approve`, {});
  }

  rejectUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/admin/users/${id}/reject`, {});
  }
}
