import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError } from 'rxjs/operators';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
    
    const authService = inject(AuthService);
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
            if (error.status === 401 || error.status === 403) {
                authService.logout();
            }
            return throwError(() => error);
        })
    );
};