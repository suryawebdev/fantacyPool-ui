import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor() {}

  showSuccess(message: string) {
    console.log('✅ Success:', message);
    // Simple alert for now - can be enhanced later
    alert(`Success: ${message}`);
  }

  showError(message: string) {
    console.error('❌ Error:', message);
    alert(`Error: ${message}`);
  }

  showInfo(message: string) {
    console.info('ℹ️ Info:', message);
    alert(`Info: ${message}`);
  }

  showWarning(message: string) {   
    console.warn('⚠️ Warning:', message);
    alert(`Warning: ${message}`);
  }
}