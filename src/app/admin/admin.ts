import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatchService } from '../match.service';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin implements OnInit {
  matchForm: FormGroup;
  matches: any[] = [];
  editMatchId: number | null = null;
  errorMessage: string = '';
  isFormVisible: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private matchService: MatchService,
    private notification: NotificationService
  ) {
    this.matchForm = this.fb.group({
      teamA: ['', Validators.required],
      teamB: ['', Validators.required],
      startDateTime: ['', Validators.required],
      status: ['SCHEDULED', Validators.required]
    });
  }

  ngOnInit() {
    this.loadMatches();
  }

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    if (!this.isFormVisible) {
      this.cancelEdit();
    }
  }

  loadMatches() {
    this.matchService.getAllMatches().subscribe({
      next: (matches) => {
        this.matches = matches.sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
      },
      error: (error) => {
        console.error('Error loading matches:', error);
      }
    })
  }

  startEdit(match: any) {
    this.editMatchId = match.id;
    this.matchForm.setValue({
      teamA: match.teamA,
      teamB: match.teamB,
      startDateTime: match.startDateTime,
      status: match.status || 'SCHEDULED'
    });
  }

  cancelEdit() {
    this.editMatchId = null;
    this.matchForm.reset();
  }

  onCreateMatch() {
    if (this.matchForm.invalid) {
      return;
    }

    const matchData = this.matchForm.value;
    if(this.editMatchId) {
      this.matchService.updateMatch(this.editMatchId, matchData).subscribe({
        next: (response) => {
          console.log('Match updated:', response);
          this.loadMatches();
          this.cancelEdit();
          this.notification.showSuccess('Match updated successfully');
        },
        error: (error) => {
          console.error('Error updating match:', error);
          this.notification.showError('Error updating match');
        }
      });
    } else {
      this.matchService.createMatch(this.matchForm.value).subscribe({
        next: (response) => {
          console.log('Match created:', response);
          this.matchForm.reset();
          this.loadMatches();
          this.notification.showSuccess('Match created successfully');
        },
        error: (error) => {
          console.error('Error creating match:', error);
          this.notification.showError('Error creating match');
        }
      });
    }
  }

  setWinner(match: any, winner: string) {
    this.matchService.setWinner(match.id, winner).subscribe({
      next: (res) => {
        this.loadMatches();
        this.notification.showSuccess('Winner set successfully');
      },
      error: (err) => {
        this.notification.showError('Error setting winner');
      }
    });
  }

  deleteMatch(matchId: any) {
    if(confirm(`Are you sure you want to delete this match #${matchId}?`)) {
      this.matchService.deleteMatch(matchId).subscribe({
        next: () => {
          this.loadMatches();
          this.notification.showSuccess('Match deleted successfully');
        },
        error: (err) => {
          this.notification.showError('Error deleting match');
        }
      });
    }
  }
}
