import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../websocket.service';
import { MatchService } from '../match.service';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-selections-feed',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './selections-feed.html',
  styleUrl: './selections-feed.scss'
})
export class SelectionsFeed implements OnInit {
  feed: any[] = [];
  loading = false;
  hasMore = true;
  page = 0;
  pageSize = 5;
  error: string | null = null;

  constructor(
    private websocketService: WebSocketService,
    private matchService: MatchService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private router: Router
  ) {
    console.log('SelectionsFeed component initialized');
  }

  ngOnInit(): void {
    console.log('SelectionsFeed ngOnInit called');
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, redirecting to signin');
      this.router.navigate(['/signin']);
      return;
    }
    
    this.loadSelections();
    
    // Subscribe to websocket updates
    this.websocketService.selectionFeed$.subscribe({
      next: (selection) => {
        console.log('New selection received:', selection);
        this.feed.unshift(selection);
        if (this.feed.length > 10) {
          this.feed.pop();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('WebSocket error:', error);
        this.error = 'Connection error';
      }
    });
  }

  loadSelections() {
    console.log('Loading selections, page:', this.page);
    
    if (this.loading || !this.hasMore) {
      console.log('No more selections to load');
      return;
    }
    
    // Check authentication before making the request
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, redirecting to signin');
      this.router.navigate(['/signin']);
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    this.matchService.getSelections(this.page, this.pageSize).subscribe({
      next: (selections) => {
        console.log('Selections loaded:', selections);
        if (selections && selections.length > 0) {
          this.feed = this.feed.concat(selections);
          this.page++;
        } else {
          this.hasMore = false;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading selections:', error);
        
        // Check if user is still authenticated after the error
        if (!this.authService.isAuthenticated()) {
          console.log('User logged out during request, redirecting to signin');
          this.router.navigate(['/signin']);
          return;
        }
        
        if (error.status === 403) {
          this.error = 'Access denied. You may not have permission to view selections.';
        } else if (error.status === 401) {
          this.error = 'Session expired. Redirecting to sign in...';
          setTimeout(() => {
            this.router.navigate(['/signin']);
          }, 2000);
        } else {
          this.error = 'Failed to load selections. Please try again.';
        }
        
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  retryLoad() {
    this.page = 0;
    this.hasMore = true;
    this.feed = [];
    this.error = null;
    this.loadSelections();
  }
}
