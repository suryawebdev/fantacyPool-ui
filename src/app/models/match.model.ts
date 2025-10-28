export interface Match {
  id: number;
  teamA: string;
  teamB: string;
  startDateTime: string;
  endDateTime?: string;
  winner?: 'A' | 'B';
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tournamentId: number;
  tournamentName?: string; // For display purposes
  userPick?: 'A' | 'B'; // User's prediction
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatchRequest {
  teamA: string;
  teamB: string;
  startDateTime: string;
  endDateTime?: string;
  tournamentId: number;
}

export interface UpdateMatchRequest {
  teamA?: string;
  teamB?: string;
  startDateTime?: string;
  endDateTime?: string;
  winner?: 'A' | 'B';
  status?: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tournamentId?: number;
}

