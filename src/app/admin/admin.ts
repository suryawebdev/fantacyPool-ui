import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatchService } from '../match.service';
import { TournamentService } from '../tournament.service';
import { NotificationService } from '../notification.service';
import { TournamentManagement } from '../tournament-management/tournament-management';
import { Tournament } from '../models/tournament.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TournamentManagement],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin implements OnInit {
  matchForm: FormGroup;
  matches: any[] = [];
  tournaments: Tournament[] = [];
  editMatchId: number | null = null;
  errorMessage: string = '';
  isFormVisible: boolean = false;
  activeTab: 'matches' | 'tournaments' = 'matches';

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private matchService: MatchService,
    private tournamentService: TournamentService,
    private notification: NotificationService
  ) {
    this.matchForm = this.fb.group({
      teamA: ['', Validators.required],
      teamB: ['', Validators.required],
      startDateTime: ['', Validators.required],
      status: ['SCHEDULED', Validators.required],
      tournamentId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadMatches();
    this.loadTournaments();
  }

  setActiveTab(tab: 'matches' | 'tournaments') {
    this.activeTab = tab;
    // Refresh tournaments when switching to matches tab to ensure we have latest data
    if (tab === 'matches') {
      this.loadTournaments();
    }
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
        console.log('All matches loaded:', matches);
        // Sort matches and log tournament info
        this.matches = matches.sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        
        // Debug: Check if matches have tournament info
        this.matches.forEach(match => {
          console.log(`Match ${match.id}: tournamentId=${match.tournamentId}, tournamentName=${match.tournamentName}`);
          console.log('Full match object:', match);
        });
        
        // Check if ANY matches have tournamentId
        const matchesWithTournament = this.matches.filter(m => m.tournamentId);
        console.log(`Matches with tournamentId: ${matchesWithTournament.length}/${this.matches.length}`);
        
        if (matchesWithTournament.length === 0) {
          console.warn('⚠️  Backend is not returning tournamentId in match objects!');
          console.warn('Backend needs to be updated to include tournamentId field in match responses.');
        }
        
        // Frontend workaround: If backend doesn't return tournament names, populate them from our tournaments list
        this.matches.forEach(match => {
          if (match.tournamentId && !match.tournamentName) {
            const tournament = this.tournaments.find(t => t.id === match.tournamentId);
            if (tournament) {
              match.tournamentName = tournament.name;
              console.log(`Frontend workaround: Added tournament name "${tournament.name}" to match ${match.id}`);
            }
          }
        });
      },
      error: (error) => {
        console.error('Error loading matches:', error);
      }
    })
  }

  loadTournaments() {
    this.tournamentService.getAllTournaments().subscribe({
      next: (tournaments) => {
        console.log('All tournaments loaded:', tournaments);
        // Filter to show only active and upcoming tournaments
        const activeTournaments = tournaments.filter(t => 
          t.status === 'active' || t.status === 'upcoming'
        );
        
        // If no active/upcoming tournaments, show all tournaments
        this.tournaments = activeTournaments.length > 0 ? activeTournaments : tournaments;
        console.log('Tournaments for dropdown:', this.tournaments);
        
        // If still no tournaments and we're in development, add a test tournament
        if (this.tournaments.length === 0) {
          console.log('No tournaments found, adding test tournament for development');
          this.tournaments = [{
            id: 1,
            name: 'Test Tournament',
            description: 'Development test tournament',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            status: 'upcoming' as const,
            maxParticipants: 100,
            currentParticipants: 0,
            entryFee: 0,
            prizePool: 1000,
            rules: 'Test rules',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 1
          }];
        }
      },
      error: (error) => {
        console.error('Error loading tournaments:', error);
        this.notification.showError('Failed to load tournaments');
        
        // Add test tournament on API error for development
        console.log('API error, adding test tournament for development');
        this.tournaments = [{
          id: 1,
          name: 'Test Tournament',
          description: 'Development test tournament',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const,
          maxParticipants: 100,
          currentParticipants: 0,
          entryFee: 0,
          prizePool: 1000,
          rules: 'Test rules',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 1
        }];
      }
    });
  }

  startEdit(match: any) {
    this.editMatchId = match.id;
    this.isFormVisible = true; // ✅ Expand the form when editing
    this.matchForm.setValue({
      teamA: match.teamA,
      teamB: match.teamB,
      startDateTime: match.startDateTime,
      status: match.status || 'SCHEDULED',
      tournamentId: match.tournamentId || ''
    });
  }

  cancelEdit() {
    this.editMatchId = null;
    this.matchForm.reset();
  }

  onTeamNameInput(event: any, fieldName: string) {
    const input = event.target;
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    const newValue = oldValue.toUpperCase().trim();
    
    // Only update if the value actually changed
    if (newValue !== oldValue) {
      this.matchForm.get(fieldName)?.setValue(newValue, { emitEvent: false });
      
      // Restore cursor position after the value change
      setTimeout(() => {
        input.setSelectionRange(cursorPosition, cursorPosition);
      }, 0);
    }
  }

  onCreateMatch() {
    if (this.matchForm.invalid) {
      return;
    }

    const matchData = this.matchForm.value;
    
    // Convert team names to uppercase
    if (matchData.teamA) {
      matchData.teamA = matchData.teamA.toUpperCase().trim();
    }
    if (matchData.teamB) {
      matchData.teamB = matchData.teamB.toUpperCase().trim();
    }
    
    console.log('Creating/updating match with data:', matchData);
    
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
          console.log('✅ Match created successfully:', response);
          console.log('📋 Full response object:', JSON.stringify(response, null, 2));
          console.log('🏆 Tournament info in response:', {
            tournamentId: response.tournamentId,
            tournamentName: response.tournamentName,
            hasTournamentId: !!response.tournamentId
          });
          
          if (!response.tournamentId) {
            console.error('❌ Backend is NOT returning tournamentId in create response!');
            console.error('Sent tournamentId:', matchData.tournamentId);
            console.error('Received tournamentId:', response.tournamentId);
          }
          
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
