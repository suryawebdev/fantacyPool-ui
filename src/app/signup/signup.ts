import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';

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
    private router: Router
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
    // TODO: Call AuthService to perform signup
    console.log(this.signupForm.value);
    this.authService.signup(this.signupForm.value).subscribe({
      next: (response) => {
        console.log('Signup successful', response);
        this.router.navigate(['/signin']);
      },
      error: (error) => {
        console.error('Signup failed', error);
        if (error.status === 400 && error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'An error occurred while signing up';
        }
      }
    });
  }
}
