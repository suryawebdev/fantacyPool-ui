import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatchService } from '../match.service';
import { TournamentService } from '../tournament.service';
import { AdminService, PendingUser } from '../admin.service';
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
  activeTab: 'matches' | 'tournaments' | 'approvals' | 'livefeed' = 'matches';
  pendingUsers: PendingUser[] = [];
  approvingId: number | null = null;
  rejectingId: number | null = null;

  liveFeedEnabled = false;
  liveFeedTournamentId: number | null = null;
  liveFeedSaving = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private matchService: MatchService,
    private tournamentService: TournamentService,
    private adminService: AdminService,
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
    this.loadPendingUsers();
  }

  setActiveTab(tab: 'matches' | 'tournaments' | 'approvals' | 'livefeed') {
    this.activeTab = tab;
    if (tab === 'matches') {
      this.loadTournaments();
    }
    if (tab === 'approvals') {
      this.loadPendingUsers();
    }
    if (tab === 'livefeed') {
      this.loadTournaments();
      this.loadLiveFeedConfig();
    }
  }

  loadLiveFeedConfig() {
    this.adminService.getLiveFeedConfig().subscribe({
      next: (config) => {
        this.liveFeedEnabled = config?.enabled ?? false;
        this.liveFeedTournamentId = config?.tournamentId ?? null;
      },
      error: () => {
        this.liveFeedEnabled = false;
        this.liveFeedTournamentId = null;
      }
    });
  }

  onLiveFeedToggle(enabled: boolean) {
    this.liveFeedSaving = true;
    if (enabled && (this.liveFeedTournamentId == null || this.liveFeedTournamentId === 0)) {
      this.notification.showError('Select a tournament before turning the feed on');
      this.liveFeedSaving = false;
      return;
    }
    const payload = enabled
      ? { enabled: true, tournamentId: this.liveFeedTournamentId ?? undefined }
      : { enabled: false };
    this.adminService.updateLiveFeedConfig(payload).subscribe({
      next: () => {
        this.liveFeedEnabled = enabled;
        this.liveFeedSaving = false;
        this.notification.showSuccess(enabled ? 'Live feed turned on' : 'Live feed turned off');
      },
      error: () => {
        this.liveFeedSaving = false;
        this.notification.showError('Failed to update live feed');
      }
    });
  }

  onLiveFeedTournamentSelect(value: string) {
    const id = value === '' ? null : Number(value);
    this.liveFeedTournamentId = Number.isNaN(id) ? null : id;
    if (!this.liveFeedEnabled) return;
    this.liveFeedSaving = true;
    this.adminService.updateLiveFeedConfig({
      enabled: true,
      tournamentId: this.liveFeedTournamentId ?? undefined
    }).subscribe({
      next: () => {
        this.liveFeedSaving = false;
        this.notification.showSuccess('Live feed tournament updated');
      },
      error: () => {
        this.liveFeedSaving = false;
        this.notification.showError('Failed to update live feed');
      }
    });
  }

  loadPendingUsers() {
    this.adminService.getPendingUsers().subscribe({
      next: (users) => {
        this.pendingUsers = users;
      },
      error: (err) => {
        this.notification.showError('Failed to load pending users');
      }
    });
  }

  approveUser(user: PendingUser) {
    this.approvingId = user.id;
    this.adminService.approveUser(user.id).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== user.id);
        this.approvingId = null;
        this.notification.showSuccess(`${user.username} approved`);
      },
      error: () => {
        this.approvingId = null;
        this.notification.showError('Failed to approve user');
      }
    });
  }

  rejectUser(user: PendingUser) {
    if (!confirm(`Reject and remove user "${user.username}"? This cannot be undone.`)) {
      return;
    }
    this.rejectingId = user.id;
    this.adminService.rejectUser(user.id).subscribe({
      next: () => {
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== user.id);
        this.rejectingId = null;
        this.notification.showSuccess(`${user.username} rejected and removed`);
      },
      error: () => {
        this.rejectingId = null;
        this.notification.showError('Failed to reject user');
      }
    });
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

  /** Groups matches by tournament for display (one table per tournament). */
  getMatchesGroupedByTournament(): { tournamentId: number | null; tournamentName: string; matches: any[] }[] {
    const byId = new Map<number | null, any[]>();
    for (const m of this.matches) {
      const tid = m.tournamentId ?? null;
      if (!byId.has(tid)) byId.set(tid, []);
      byId.get(tid)!.push(m);
    }
    const result: { tournamentId: number | null; tournamentName: string; matches: any[] }[] = [];
    const sortedIds = Array.from(byId.keys()).sort((a, b) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return a - b;
    });
    for (const tid of sortedIds) {
      const tournamentName = tid != null
        ? (this.tournaments.find(t => t.id === tid)?.name ?? `Tournament #${tid}`)
        : 'No tournament';
      result.push({
        tournamentId: tid,
        tournamentName,
        matches: byId.get(tid)!
      });
    }
    return result;
  }
}
