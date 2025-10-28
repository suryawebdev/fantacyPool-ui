import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Signup } from './signup/signup';
import { Signin } from './signin/signin';
import { ForgotPassword } from './forgot-password/forgot-password';
import { ResetPassword } from './reset-password/reset-password';
import { authGuard } from './auth.guard';
import { Admin } from './admin/admin';
import { adminGuard } from './admin.guard';
import { UserDashboard } from './user-dashboard/user-dashboard';
import { Leaderboard } from './leaderboard/leaderboard';
import { SelectionsFeed } from './selections-feed/selections-feed';
import { TournamentManagement } from './tournament-management/tournament-management';
import { guestGuard } from './guest.guard';

export const routes: Routes = [
    // {path: '', component: Home},
    {path: 'signup', component: Signup, canActivate: [guestGuard]},
    {path: 'signin', component: Signin, canActivate: [guestGuard]},
    {path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard]},
    {path: 'reset-password', component: ResetPassword, canActivate: [guestGuard]},
    {
        path: 'home', 
        component: Home, 
        canActivate: [authGuard]
    },
    {path: 'admin', component: Admin, canActivate: [adminGuard]},
    {path: 'tournament-management', component: TournamentManagement, canActivate: [adminGuard]},
    {path: 'user-dashboard', component: UserDashboard, canActivate: [authGuard]},
    {path: 'leaderboard', component: Leaderboard},
    {path: 'selections-feed', component: SelectionsFeed},
    {path: '**', redirectTo: '/signin', pathMatch: 'full'}//Default route
];
