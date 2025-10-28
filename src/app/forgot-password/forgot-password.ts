import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  forgotPasswordForm: FormGroup;
  loading = false;
  message = '';
  error = '';
  success = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.loading = true;
      this.error = '';
      this.message = '';

      const email = this.forgotPasswordForm.get('email')?.value;

      // Call the auth service to handle password reset
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.loading = false;
          this.success = true;
          this.message = 'Password reset instructions have been sent to your email.';
          console.log('Password reset email sent:', response);
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Failed to send password reset email. Please try again.';
          console.error('Password reset error:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  goToSignin() {
    this.router.navigate(['/signin']);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }
}
