export interface Match {
  id: number;
  teamA: string;
  teamB: string;
  startDateTime: string;
  endDateTime?: string;
  winner?: string; // Team name (e.g. "RCB") or legacy "A"|"B"
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tournamentId: number;
  tournamentName?: string; // For display purposes
  userPick?: string; // Team name (e.g. "RCB") or legacy "A"|"B"
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
  winner?: string;
  status?: 'upcoming' | 'live' | 'completed' | 'cancelled';
  tournamentId?: number;
}

