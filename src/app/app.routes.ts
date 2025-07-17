import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Signup } from './signup/signup';
import { Signin } from './signin/signin';
import { authGuard } from './auth.guard';
import { Admin } from './admin/admin';
import { adminGuard } from './admin.guard';
import { UserDashboard } from './user-dashboard/user-dashboard';
import { Leaderboard } from './leaderboard/leaderboard';

export const routes: Routes = [
    // {path: '', component: Home},
    {path: 'signup', component: Signup},
    {path: 'signin', component: Signin},
    {
        path: 'home', 
        component: Home, 
        canActivate: [authGuard]
    },
    {path: 'admin', component: Admin, canActivate: [adminGuard]},
    {path: 'user-dashboard', component: UserDashboard, canActivate: [authGuard]},
    {path: 'leaderboard', component: Leaderboard, canActivate: [authGuard]},
    {path: '**', redirectTo: '/signin', pathMatch: 'full'}//Default route
];
