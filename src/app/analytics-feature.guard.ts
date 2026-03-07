import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/environments';

/** Redirects to /user-dashboard when the analytics feature is disabled. Use after authGuard. */
export const analyticsFeatureGuard = () => {
  if (environment?.features?.analytics !== false) {
    return true;
  }
  return inject(Router).createUrlTree(['/user-dashboard']);
};
