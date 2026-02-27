import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WelcomeMessageService {
  private message: string | null = null;

  setMessage(msg: string): void {
    this.message = msg;
  }

  getMessage(): string | null {
    return this.message;
  }

  clearMessage(): void {
    this.message = null;
  }
}
