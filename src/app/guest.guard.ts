import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is authenticated, redirect to appropriate page
  if (authService.isAuthenticated()) {
    const userRole = authService.getUserRole();
    
    if (userRole === 'ADMIN') {
      router.navigate(['/admin']);
    } else {
      router.navigate(['/user-dashboard']);
    }
    
    return false; // Prevent access to guest routes
  }

  // Allow access to guest routes for unauthenticated users
  return true;
}; 