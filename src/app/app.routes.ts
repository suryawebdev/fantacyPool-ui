import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Signup } from './signup/signup';
import { Signin } from './signin/signin';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { Admin } from './admin/admin';
import { adminGuard } from './admin.guard';
import { UserDashboard } from './user-dashboard/user-dashboard';
import { Leaderboard } from './leaderboard/leaderboard';
import { SelectionsFeed } from './selections-feed/selections-feed';

export const routes: Routes = [
    {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
    {path: 'signup', component: Signup, canActivate: [guestGuard]},
    {path: 'signin', component: Signin, canActivate: [guestGuard]},
    // {
    //     path: 'home', 
    //     component: Home, 
    //     canActivate: [authGuard]
    // },
    {path: 'admin', component: Admin, canActivate: [adminGuard]},
    {path: 'user-dashboard', component: UserDashboard, canActivate: [authGuard]},
    {path: 'dashboard', component: UserDashboard, canActivate: [authGuard]}, // Alias for user-dashboard
    {path: 'leaderboard', component: Leaderboard},
    {path: 'feed', component: SelectionsFeed, canActivate: [authGuard]},
    {path: '**', redirectTo: '/dashboard', pathMatch: 'full'}//Default route - will be handled by authGuard
];
