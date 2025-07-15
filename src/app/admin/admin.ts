import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatchService } from '../match.service';

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin {
  matchForm: FormGroup;
  matches: any[] = [];
  editMatchId: number | null = null;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private matchService: MatchService
  ) {
    this.matchForm = this.fb.group({
      teamA: ['', Validators.required],
      teamB: ['', Validators.required],
      startDateTime: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadMatches();
  }

  loadMatches() {
    this.matchService.getAllMatches().subscribe({
      next: (matches) => {
        this.matches = matches;
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
        },
        error: (error) => {
          console.error('Error updating match:', error);
        }
      });
    } else {
      this.matchService.createMatch(this.matchForm.value).subscribe({
        next: (response) => {
          console.log('Match created:', response);
          this.matchForm.reset();
          this.loadMatches();
        },
        error: (error) => {
          console.error('Error creating match:', error);
        }
      });
    }

    console.log('Creating match:', matchData);
  }

  setWinner(match: any, winner: string) {
    this.matchService.setWinner(match.id, winner).subscribe({
      next: (res) => {
        this.loadMatches();
      },
      error: (err) => {
        console.error('Error setting winner:', err);
      }
    });
  }

  deleteMatch(matchId: any) {
    if(confirm(`Are you sure you want to delete this match #${matchId}?`)) {
      this.matchService.deleteMatch(matchId).subscribe({
        next: () => {
          this.loadMatches();
        },
        error: (err) => {
          console.error('Error deleting match:', err);
        }
      });
    }
  }
}
