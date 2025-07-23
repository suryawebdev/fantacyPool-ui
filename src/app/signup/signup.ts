import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../notification.service';

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
    private notification: NotificationService
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['USER', Validators.required] // default to 'user', can be 'admin'
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
        this.router.navigate(['/signin']);
        this.notification.showSuccess('Signup successful');
      },
      error: (error) => {
        this.notification.showError('Signup failed');
      }
    });
  }
}
