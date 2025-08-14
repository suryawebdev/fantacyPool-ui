import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../notification.service';

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
    private notification: NotificationService
  ) {
    this.signinForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      const role = this.authService.getUserRole();
      if (role === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/user-dashboard']);
      }
      return;
    }
    
    // Continue with normal signin flow for unauthenticated users
    console.log('User not authenticated, proceeding with signin');
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.signinForm.invalid) {
      return;
    }

    this.authService.signin(this.signinForm.value).subscribe({
      next: (response) => {
        this.notification.showSuccess('Signin successful');
        
        // Navigate based on role
        const role = this.authService.getUserRole();
        if (role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/user-dashboard']);
        }
      },
      error: (error) => {
        console.error('Signin error:', error);
        this.notification.showError('Signin failed. Please check your credentials.');
      }
    });
  }
}
