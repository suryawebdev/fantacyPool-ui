import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
    
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();
    
    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Only auto-logout for 401 (Unauthorized) errors, not 403 (Forbidden)
            // 403 might be due to insufficient permissions rather than invalid token
            if (error.status === 401) {
                console.log('Token expired or invalid, logging out user');
                authService.logout();
                router.navigate(['/signin']);
            }
            // For 403 and other errors, let the component handle them
            return throwError(() => error);
        })
    );
};