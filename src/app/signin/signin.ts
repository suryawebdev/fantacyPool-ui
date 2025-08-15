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

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.signinForm.invalid) {
      return;
    }

    this.authService.signin(this.signinForm.value).subscribe({
      next: (response) => {
        console.log('Signin response:', response);
        
        // Store the token if it's in the response
        if (response?.token) {
          localStorage.setItem('token', response.token);
          console.log('Token stored:', response.token);
        } else {
          console.warn('No token in response:', response);
        }
        
        // Update auth status to notify other components
        this.authService.updateAuthStatus();
        
        this.notification.showSuccess('Signin successful');
        const role = this.authService.getUserRole();
        console.log('User role:', role);
        
        if (role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (role === 'USER') {
          this.router.navigate(['/user-dashboard']);
        } else {
          this.router.navigate(['/signin']);
        }
      },
      error: (error) => {
        console.error('Signin error:', error);
        this.notification.showError('Signin failed');
      }
    });
  }
}
