import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-email-verified',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-verified.html',
  styleUrl: './email-verified.scss'
})
export class EmailVerified implements OnInit {
  /** Error from query param (e.g. ?error=invalid) — show without calling API. */
  queryError: string | null = null;
  loading = false;
  /** Message from API success response. */
  successMessage: string | null = null;
  /** Message from API error response. */
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const error = params['error'];
      const token = params['token'];

      this.successMessage = null;
      this.errorMessage = null;

      if (error != null && error !== '') {
        this.queryError = error === 'invalid' ? 'Link invalid or expired.' : error;
        return;
      }
      this.queryError = null;

      if (token) {
        this.loading = true;
        this.authService.verifyEmail(token).subscribe({
          next: (res) => {
            this.loading = false;
            if (res?.success) {
              this.successMessage = res.message ?? 'Email verified. You can now sign in.';
            } else {
              this.errorMessage = res?.message ?? 'Verification failed.';
            }
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage = err?.error?.message ?? err?.message ?? 'Verification failed. Please try again or sign up.';
          }
        });
      }
    });
  }

  goToSignin(): void {
    this.router.navigate(['/signin']);
  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }
}
