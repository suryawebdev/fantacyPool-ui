import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  showError(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      panelClass: ['snackbar-error']
    });
  }

  showInfo(message: string) {
    this.snackBar.open(message, '', {
      duration: 3000,
      panelClass: ['snackbar-info']
    });
  }

  showWarning(message: string) {   
    this.snackBar.open(message, '', {
      duration: 3000,
      panelClass: ['snackbar-warning']
    });
  }
}