import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isDarkTheme = true; // Default to dark theme
  isAuthenticated = false;
  isAdminUser = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.checkAuthStatus();
    this.loadThemePreference();
  }

  checkAuthStatus() {
    this.isAuthenticated = this.authService.refreshAuthStatus();
    if (this.isAuthenticated) {
      this.isAdminUser = this.authService.getUserRole() === 'ADMIN';
    } else {
      this.isAdminUser = false;
    }
  }

  loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkTheme = savedTheme === 'dark';
    } else {
      // Default to dark theme
      this.isDarkTheme = true;
      localStorage.setItem('theme', 'dark');
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    const rootElement = document.documentElement;
    const body = document.body;
    
    if (this.isDarkTheme) {
      rootElement.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      rootElement.classList.add('light');
      body.classList.add('light');
      body.classList.remove('dark');
    }
  }

  isAdmin() {
    return this.isAdminUser;
  }

  logout() {
    this.authService.logout();
    this.checkAuthStatus();
    // Redirect to signin page
    window.location.href = '/signin';
  }
}
