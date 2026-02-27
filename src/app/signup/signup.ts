import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../notification.service';
import { WelcomeMessageService } from '../welcome-message.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss'
})
export class Signup {
  signupForm: FormGroup;
  submitted = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService,
    private welcomeMessageService: WelcomeMessageService
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.signupForm.invalid) {
      return;
    }

    this.authService.signup(this.signupForm.value).subscribe({
      next: (response) => {
        if (response?.pendingApproval === true) {
          const message = response?.message || 'Account created. Pending admin approval. You can sign in once an admin has approved your account.';
          this.welcomeMessageService.setMessage(message);
          this.router.navigate(['/user-dashboard']);
          return;
        }
        if (response?.token) {
          localStorage.setItem('token', response.token);
          if (response?.userDetails) {
            this.authService.storeUserDetails(response.userDetails);
          }
          this.authService.updateAuthStatus();
          this.notification.showSuccess('Signup successful');
          const role = this.authService.getUserRole();
          if (role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/user-dashboard']);
          }
          return;
        }
        this.errorMessage = response?.message || 'Unexpected response. Please try signing in.';
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Signup failed';
      }
    });
  }
}
