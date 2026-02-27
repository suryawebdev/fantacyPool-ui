import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { BehaviorSubject, Observable } from 'rxjs';
import { jwtDecode, JwtPayload} from 'jwt-decode';

interface MyJwtPayload extends JwtPayload {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  sub?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private authStatusSubject = new BehaviorSubject<boolean>(false);

  authStatus$ = this.authStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize auth status on service creation
    this.authStatusSubject.next(this.isAuthenticated());
  }

  signin(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/signin`, credentials);
  }

  /**
   * Store user details for dashboard (welcome name, etc.).
   * Expected shape: { firstName?, lastName?, email?, username?, role? } (camelCase).
   * Can be sent in signin response as response.userDetails or response.user.
   * Alternatively, backend can put firstName, lastName, email in JWT claims and we read from token when nothing stored.
   */
  storeUserDetails(userDetails: any): void {
    if (userDetails) {
      localStorage.setItem('user_details', JSON.stringify(userDetails));
    }
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/signup`, userData);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user_details');
    this.authStatusSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const decodedToken = jwtDecode<MyJwtPayload>(token);
      const currentTime = Date.now() / 1000;
      if (decodedToken.exp && decodedToken.exp < currentTime) {
        console.log('Token expired, removing it');
        this.logout();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error decoding token:', error);
      this.logout();
      return false;
    }
  }

  getUserRole(): string {
    const userDetails = this.getUserDetails();
    if (userDetails && userDetails.role) {
      return userDetails.role;
    }
    
    // Fallback to JWT token if user details not available
    const token = this.getToken();
    if (!token) {
      return '';
    }
    try {
      const decodedToken = jwtDecode<MyJwtPayload>(token);
      return decodedToken.role || '';
    } catch (error) {
      console.error('Error decoding token:', error);
      return '';
    }
  }

  getUserDetails(): any {
    const stored = localStorage.getItem('user_details');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing user details:', error);
      }
    }
    // Fallback: read from JWT if backend puts user info in token
    const token = this.getToken();
    if (token) {
      try {
        const d = jwtDecode<MyJwtPayload>(token);
        return {
          firstName: d.firstName ?? d.first_name,
          lastName: d.lastName ?? d.last_name,
          email: d.email,
          username: d.sub,
          role: d.role
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  // Method to update auth status after successful login
  updateAuthStatus(): void {
    this.authStatusSubject.next(this.isAuthenticated());
  }

  // Method to fetch user details from backend if needed
  fetchUserDetails(username: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/users/${username}`);
  }

  // Method to handle forgot password
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/forgot-password`, { email });
  }

  // Method to reset password with token
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/reset-password`, { token, newPassword });
  }
}




