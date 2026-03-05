import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TournamentService } from '../tournament.service';
import { AdminService, ApprovedUser } from '../admin.service';
import { NotificationService } from '../notification.service';
import { Tournament, CreateTournamentRequest } from '../models/tournament.model';

@Component({
  selector: 'app-tournament-management',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tournament-management.html',
  styleUrl: './tournament-management.scss'
})
export class TournamentManagement implements OnInit {
  tournaments: Tournament[] = [];
  showCreateForm = false;
  createTournamentForm: FormGroup;
  editingTournament: Tournament | null = null;
  loading = false;

  participantsModalOpen = false;
  selectedTournament: Tournament | null = null;
  participants: any[] = [];
  allUsers: ApprovedUser[] = [];
  /** Local selection: user ids that should be participants when Save is clicked. */
  selectedUserIds: number[] = [];
  loadingParticipants = false;
  loadingUsers = false;
  savingParticipants = false;

  constructor(
    private tournamentService: TournamentService,
    private adminService: AdminService,
    private notification: NotificationService,
    private fb: FormBuilder
  ) {
    this.createTournamentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      maxParticipants: [null, [Validators.min(2)]],
      entryFee: [0, [Validators.min(0)]],
      prizePool: [0, [Validators.min(0)]],
      rules: ['']
    });
  }

  ngOnInit() {
    this.loadTournaments();
  }

  loadTournaments() {
    this.loading = true;
    this.tournamentService.getMyTournaments().subscribe({
      next: (tournaments) => {
        this.tournaments = tournaments;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tournaments:', error);
        this.notification.showError('Failed to load tournaments');
        this.loading = false;
      }
    });
  }

  showCreateTournamentForm() {
    this.showCreateForm = true;
    this.editingTournament = null;
    this.createTournamentForm.reset();
  }

  editTournament(tournament: Tournament) {
    this.editingTournament = tournament;
    this.showCreateForm = true;
    this.createTournamentForm.patchValue({
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startDate.split('T')[0], // Convert to date input format
      endDate: tournament.endDate.split('T')[0],
      maxParticipants: tournament.maxParticipants,
      entryFee: tournament.entryFee,
      prizePool: tournament.prizePool,
      rules: tournament.rules
    });
  }

  cancelForm() {
    this.showCreateForm = false;
    this.editingTournament = null;
    this.createTournamentForm.reset();
  }

  onSubmit() {
    if (this.createTournamentForm.valid) {
      const formData = this.createTournamentForm.value;
      const tournamentData: CreateTournamentRequest = {
        name: formData.name,
        description: formData.description,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        maxParticipants: formData.maxParticipants,
        entryFee: formData.entryFee || 0,
        prizePool: formData.prizePool || 0,
        rules: formData.rules
      };

      if (this.editingTournament) {
        // Update existing tournament
        this.tournamentService.updateTournament(this.editingTournament.id, tournamentData).subscribe({
          next: (updatedTournament) => {
            const index = this.tournaments.findIndex(t => t.id === updatedTournament.id);
            if (index !== -1) {
              this.tournaments[index] = updatedTournament;
            }
            this.notification.showSuccess('Tournament updated successfully');
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error updating tournament:', error);
            this.notification.showError('Failed to update tournament');
          }
        });
      } else {
        // Create new tournament
        this.tournamentService.createTournament(tournamentData).subscribe({
          next: (newTournament) => {
            this.tournaments.unshift(newTournament);
            this.notification.showSuccess('Tournament created successfully');
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error creating tournament:', error);
            this.notification.showError('Failed to create tournament');
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  deleteTournament(tournament: Tournament) {
    if (confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone.`)) {
      this.tournamentService.deleteTournament(tournament.id).subscribe({
        next: () => {
          this.tournaments = this.tournaments.filter(t => t.id !== tournament.id);
          this.notification.showSuccess('Tournament deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting tournament:', error);
          this.notification.showError('Failed to delete tournament');
        }
      });
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.createTournamentForm.controls).forEach(key => {
      const control = this.createTournamentForm.get(key);
      control?.markAsTouched();
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'upcoming': return 'status-upcoming';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  openParticipantsModal(tournament: Tournament) {
    this.selectedTournament = tournament;
    this.participantsModalOpen = true;
    this.participants = [];
    this.allUsers = [];
    this.loadParticipants();
    this.loadAllUsers();
  }

  closeParticipantsModal() {
    this.participantsModalOpen = false;
    this.selectedTournament = null;
    this.participants = [];
    this.allUsers = [];
    this.selectedUserIds = [];
  }

  loadParticipants() {
    if (!this.selectedTournament) return;
    this.loadingParticipants = true;
    this.tournamentService.getTournamentParticipants(this.selectedTournament.id).subscribe({
      next: (list) => {
        this.participants = list || [];
        this.selectedUserIds = (this.participants as any[]).map((p: any) => p.userId);
        this.loadingParticipants = false;
      },
      error: () => {
        this.notification.showError('Failed to load participants');
        this.loadingParticipants = false;
      }
    });
  }

  loadAllUsers() {
    this.loadingUsers = true;
    this.adminService.getApprovedUsers().subscribe({
      next: (list) => {
        this.allUsers = list || [];
        this.loadingUsers = false;
      },
      error: () => {
        this.notification.showError('Failed to load users');
        this.loadingUsers = false;
      }
    });
  }

  /** Whether this user is currently selected (local state, not yet saved). */
  isParticipant(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }

  get allParticipantsSelected(): boolean {
    return this.allUsers.length > 0 && this.allUsers.every(u => this.selectedUserIds.includes(u.id));
  }

  /** True if selection differs from saved participants (enables Save button). */
  get hasParticipantChanges(): boolean {
    const current = (this.participants as any[]).map((p: any) => p.id ?? p.userId).sort((a, b) => a - b);
    const selected = [...this.selectedUserIds].sort((a, b) => a - b);
    if (current.length !== selected.length) return true;
    return current.some((id, i) => id !== selected[i]);
  }

  onSelectAllToggle(checked: boolean) {
    if (checked) {
      this.selectedUserIds = this.allUsers.map(u => u.id);
    } else {
      this.selectedUserIds = [];
    }
  }

  onParticipantToggle(user: ApprovedUser, checked: boolean) {
    if (checked) {
      if (!this.selectedUserIds.includes(user.id)) {
        this.selectedUserIds = [...this.selectedUserIds, user.id];
      }
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== user.id);
    }
  }

  saveParticipants() {
    if (!this.selectedTournament || this.savingParticipants || !this.hasParticipantChanges) return;
    this.savingParticipants = true;
    this.tournamentService.setParticipants(this.selectedTournament.id, this.selectedUserIds).subscribe({
      next: () => {
        this.loadParticipants(); // reloads and syncs selectedUserIds
        this.savingParticipants = false;
        this.notification.showSuccess('Participants updated');
      },
      error: (err) => {
        this.savingParticipants = false;
        this.notification.showError(err?.error?.message || 'Failed to save participants');
      }
    });
  }

  getUserDisplayName(u: ApprovedUser): string {
    if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(' ');
    return u.username || `User #${u.id}`;
  }
}

