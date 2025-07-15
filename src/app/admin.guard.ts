import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated() && authService.getUserRole() === 'ADMIN') {
        return true;
    } else {
        router.navigate(['/signin']);
        return false;
    }
}