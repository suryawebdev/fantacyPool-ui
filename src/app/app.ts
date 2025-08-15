import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  isUser: boolean = false;
  isDarkTheme: boolean = false;
  private authSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Subscribe to auth status changes
    this.authSubscription = this.authService.authStatus$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      this.updateUserRole();
    });
  }

  ngOnInit() {
    this.checkAuthStatus();
    this.loadTheme();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  checkAuthStatus() {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.updateUserRole();
  }

  private updateUserRole() {
    if (this.isAuthenticated) {
      this.isAdmin = this.authService.getUserRole() === 'ADMIN';
      this.isUser = this.authService.getUserRole() === 'USER';
    } else {
      this.isAdmin = false;
      this.isUser = false;
    }
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/signin']);
    // No need to call checkAuthStatus() as the subscription will handle it
  }
}
