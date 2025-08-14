import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environments';
import { jwtDecode, JwtPayload } from 'jwt-decode';

interface MyJwtPayload extends JwtPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  sub?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  signup(data: { 
    firstName: string;
    lastName: string;
    email: string;
    username: string; 
    password: string; 
    role: string 
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/signup`, data);
  }

  signin(data: { username: string; password: string }): Observable<any> {
    return this.http.post<{ 
      token: string,
      firstName: string,
      lastName: string,
      email: string,
      username: string,
      role: string,
    }>(`${this.baseUrl}/api/auth/signin`, data).pipe(
      tap(response => {
        if (response?.token) {
          this.setToken(response.token);
          localStorage.setItem('user_details', JSON.stringify({
            firstName: response.firstName,
            lastName: response.lastName,
            email: response.email,
            username: response.username,
            role: response.role,
          }));
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
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    try {
      const decodedToken = jwtDecode<MyJwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
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
  logout() {
    this.removeToken();
    localStorage.removeItem('user_details');
  }
  
  refreshAuthStatus() {
    // This method can be called to refresh the authentication status
    // and update any stored user information if needed
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode<MyJwtPayload>(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp && decodedToken.exp < currentTime) {
          this.logout();
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error validating token:', error);
        this.logout();
        return false;
      }
    }
    return false;
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

  getUsername() {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    const decodedToken = jwtDecode<MyJwtPayload>(token);
    return decodedToken.sub || null;
  }

  getUserDetails() {
    const userDetails = localStorage.getItem('user_details');
    return userDetails ? JSON.parse(userDetails) : null;
  }
}




