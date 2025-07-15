import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
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
    private router: Router
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
    // TODO: Call AuthService to perform signin
    console.log(this.signinForm.value);
    this.authService.signin(this.signinForm.value).subscribe({
      next: (response) => {
        console.log('Signin successful', response);
        const role = this.authService.getUserRole();
        if (role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (role === 'USER') {
          this.router.navigate(['/home']);
        } else {
          this.router.navigate(['/signin']);
        }
      },
      error: (error) => {
        console.error('Signin failed', error);
        if (error.status === 400 && error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'An error occurred while signing in';
        }
      }
    });
  }
}
