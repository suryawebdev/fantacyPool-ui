import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environments';
import { jwtDecode, JwtPayload } from 'jwt-decode';

interface MyJwtPayload extends JwtPayload {
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  signup(data: { username: string; password: string; role: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/signup`, data);
  }

  signin(data: { username: string; password: string }): Observable<any> {
    return this.http.post<{ token: string}>(`${this.baseUrl}/api/auth/signin`, data).pipe(
      tap(response => {
        if (response?.token) {
          this.setToken(response.token);
        }
      })
    );
  }
  setToken(token: string) {
    localStorage.setItem('jwt_token', token);
  }
  getToken() {
    return localStorage.getItem('jwt_token');
  }
  removeToken() {
    localStorage.removeItem('jwt_token');
  }
  isAuthenticated() {
    return !!this.getToken();
  }
  logout() {
    this.removeToken();
  }
  getUserRole() {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const decodedToken = jwtDecode<MyJwtPayload>(token);
      return decodedToken.role || null  ;
    } catch {
      return null;  
    }
  }
}




