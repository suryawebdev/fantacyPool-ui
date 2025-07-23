import { Component, OnInit } from '@angular/core';
import { Data, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../websocket.service';
import { MatchService } from '../match.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-selections-feed',
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

  constructor(
    private websocketService: WebSocketService,
    private matchService: MatchService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSelections();
    this.websocketService.selectionFeed$.subscribe((selection) => {
      console.log(selection);
      this.feed.unshift(selection);
      if (this.feed.length > 10) {
        this.feed.pop();
      }
      this.cdr.detectChanges();
    });
  }

  loadSelections() {
    // debugger;
    if (this.loading || !this.hasMore) {
      console.log('No more selections to load');
      return;
    }
    this.loading = true;
    this.matchService.getSelections(this.page, this.pageSize).subscribe({
      next: (selections) => {
        console.log(selections);
        this.feed = this.feed.concat(selections);
        this.loading = false;
        this.page++;
      },
      error: (error) => {
        console.error('Error loading selections:', error);
        this.loading = false;
      }
    });
  }
}
