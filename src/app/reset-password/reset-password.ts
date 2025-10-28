import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {
  resetPasswordForm: FormGroup;
  loading = false;
  message = '';
  error = '';
  success = false;
  token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Get token from URL query parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.error = 'Invalid or missing reset token.';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token) {
      this.loading = true;
      this.error = '';
      this.message = '';

      const password = this.resetPasswordForm.get('password')?.value;

      // Call the auth service to reset password
      this.authService.resetPassword(this.token, password).subscribe({
        next: (response) => {
          this.loading = false;
          this.success = true;
          this.message = 'Password reset successfully! You can now sign in with your new password.';
          console.log('Password reset successful:', response);
          
          // Redirect to signin after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/signin']);
          }, 3000);
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Failed to reset password. The token may be invalid or expired.';
          console.error('Password reset error:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.resetPasswordForm.controls).forEach(key => {
      const control = this.resetPasswordForm.get(key);
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
