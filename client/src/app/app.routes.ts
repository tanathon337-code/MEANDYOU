import { Routes } from '@angular/router'
import { Home } from './home/home'
import { Login } from './login/login'
import { Profile } from './profile/profile'
import { Missions } from './missions/missions'
import { ServerError } from './server-error/server-error'
import { NotFound } from './not-found/not-found'
import { authGuard } from './_guard/auth-guard'
import { logoutGuard } from './_guard/logout-guard'

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'login', component: Login },
    { path: 'profile', component: Profile, canActivate: [authGuard] },
    { path: 'profile/:display_name', component: Profile, canActivate: [authGuard] },
    { path: 'friends', component: Profile, canActivate: [authGuard] },
    { path: 'missions', component: Missions, canActivate: [authGuard] },
    { path: 'my-missions', component: Missions, canActivate: [authGuard] },
    { path: 'history', component: Missions, canActivate: [authGuard] },
    { path: 'server-error', component: ServerError },
    { path: 'not-found', component: NotFound },
    { path: 'logout', canActivate: [logoutGuard], component: Home },
    { path: '**', redirectTo: 'not-found' },
]
