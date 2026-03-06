import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-email-verified',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-verified.html',
  styleUrl: './email-verified.scss'
})
export class EmailVerified implements OnInit {
  isInvalid = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.isInvalid = params['error'] === 'invalid';
    });
  }
}
