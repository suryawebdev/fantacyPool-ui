import { Injectable } from '@angular/core';

export interface TableScrollRestoreOptions {
  /** When no stored value, scroll to bottom (e.g. latest rows). */
  defaultToBottom?: boolean;
  /** When no stored value, scroll to top. Ignored if defaultToBottom is true. */
  defaultToTop?: boolean;
  maxAttempts?: number;
  retryDelayMs?: number;
}

/**
 * Persists vertical scrollTop for scrollable table bodies (localStorage).
 * Keys are scoped by viewer, tournament, and table id so multiple tabs/users stay isolated.
 */
@Injectable({
  providedIn: 'root'
})
export class TableScrollPersistenceService {
  private readonly prefix = 'fantacyPool.tableScroll.v1';

  storageKey(params: {
    area: string;
    viewerUsername: string;
    tournamentId: number | null | undefined;
    tableId: string;
    /** Optional segment (e.g. leaderboard row username). */
    suffix?: string;
  }): string | null {
    const tid = params.tournamentId;
    if (tid == null || Number.isNaN(Number(tid))) return null;
    const u = encodeURIComponent((params.viewerUsername ?? 'user').trim() || 'user');
    const suf = params.suffix != null && params.suffix !== ''
      ? `.${encodeURIComponent(String(params.suffix))}`
      : '';
    return `${this.prefix}.${params.area}.${u}.${tid}.${params.tableId}${suf}`;
  }

  read(key: string | null): number | null {
    if (!key) return null;
    try {
      const v = localStorage.getItem(key);
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    } catch {
      return null;
    }
  }

  write(key: string | null, scrollTop: number): void {
    if (!key) return;
    try {
      localStorage.setItem(key, String(Math.round(scrollTop)));
    } catch {
      /* quota / private mode */
    }
  }

  /**
   * Restore scrollTop after layout; retries until the element has scrollable height or maxAttempts.
   */
  restoreScroll(
    el: HTMLElement | null | undefined,
    key: string | null,
    options?: TableScrollRestoreOptions
  ): void {
    if (!el) return;
    const max = options?.maxAttempts ?? 10;
    const delay = options?.retryDelayMs ?? 50;
    const attempt = (n: number) => {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (maxScroll <= 0 && n < max) {
        setTimeout(() => attempt(n + 1), delay);
        return;
      }
      const stored = this.read(key);
      if (stored != null) {
        el.scrollTop = Math.min(stored, maxScroll);
        return;
      }
      if (options?.defaultToBottom) {
        el.scrollTop = maxScroll;
      } else if (options?.defaultToTop) {
        el.scrollTop = 0;
      }
    };
    attempt(0);
  }
}
