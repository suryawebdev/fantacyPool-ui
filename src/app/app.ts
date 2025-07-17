import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Cricket Pool';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  isAuthenticated() {
    return this.authService.isAuthenticated();
  }

  isAdmin() {
    return this.authService.getUserRole() === 'ADMIN';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/signin']);
  }
  
}
