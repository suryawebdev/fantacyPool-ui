export interface Tournament {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  maxParticipants?: number;
  currentParticipants?: number;
  entryFee?: number;
  prizePool?: number;
  rules?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number; // Admin user ID
}

export interface CreateTournamentRequest {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants?: number;
  entryFee?: number;
  prizePool?: number;
  rules?: string;
}

export interface UpdateTournamentRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  entryFee?: number;
  prizePool?: number;
  rules?: string;
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

