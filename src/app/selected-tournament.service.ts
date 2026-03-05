import { Injectable } from '@angular/core';

const STORAGE_KEY = 'selectedTournamentId';

/**
 * Remembers the user's selected tournament across Dashboard and Leaderboard (and page refresh).
 */
@Injectable({
  providedIn: 'root'
})
export class SelectedTournamentService {
  private memory: number | null = null;

  getSelectedTournamentId(): number | null {
    if (this.memory != null) return this.memory;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const id = Number(stored);
        if (!Number.isNaN(id)) return id;
      }
    } catch (_) {}
    return null;
  }

  setSelectedTournamentId(id: number | null): void {
    this.memory = id;
    try {
      if (id != null) {
        localStorage.setItem(STORAGE_KEY, String(id));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }

  /**
   * Pick the best initial selection from the list: use stored id if it's in the list, otherwise first.
   */
  resolveSelection(tournamentIds: number[]): number | null {
    if (tournamentIds.length === 0) return null;
    const stored = this.getSelectedTournamentId();
    if (stored != null && tournamentIds.includes(stored)) return stored;
    return tournamentIds[0];
  }
}
