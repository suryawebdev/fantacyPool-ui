import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../notification.service';
import { WelcomeMessageService } from '../welcome-message.service';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './signin.html',
  styleUrl: './signin.scss'
})
export class Signin {
  signinForm: FormGroup;
  submitted = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService,
    private welcomeMessageService: WelcomeMessageService
  ) {
    this.signinForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.signinForm.invalid) {
      return;
    }

    this.authService.signin(this.signinForm.value).subscribe({
      next: (response) => {
        if (response?.pendingApproval === true) {
          const message = response?.message || 'Account pending admin approval. You can sign in once an admin has approved your account.';
          this.welcomeMessageService.setMessage(message);
          this.router.navigate(['/user-dashboard']);
          return;
        }
        if (response?.token) {
          localStorage.setItem('token', response.token);
          // Backend sends user fields at top level: { token, username, role, firstName, lastName, email, ... }
          const user = response?.userDetails ?? response?.user ?? {
            username: response.username,
            role: response.role,
            firstName: response.firstName,
            lastName: response.lastName,
            email: response.email
          };
          if (user) {
            this.authService.storeUserDetails(user);
          }
          this.authService.updateAuthStatus();
          this.notification.showSuccess('Signin successful');
          const role = this.authService.getUserRole();
          if (role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/user-dashboard']);
          }
          return;
        }
        this.errorMessage = response?.message || 'Invalid response. Please try again.';
      },
      error: (error) => {
        const msg = error?.error?.message;
        if (msg === 'Account pending admin approval.') {
          this.errorMessage = msg;
        } else {
          this.errorMessage = msg || 'Invalid username or password.';
        }
      }
    });
  }
}
