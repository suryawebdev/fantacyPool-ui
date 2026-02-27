import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { WelcomeMessageService } from "./welcome-message.service";

export const authGuard = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const welcomeMessage = inject(WelcomeMessageService);

    if (authService.isAuthenticated()) {
        return true;
    }
    if (welcomeMessage.getMessage()) {
        return true;
    }
    router.navigate(['/signin']);
    return false;
};