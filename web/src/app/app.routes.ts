import { Routes } from '@angular/router';
import { guestGuard, sessionGuard } from './core/auth/session.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'entrar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'perfil',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'grupos/nuevo',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./features/groups/create-group/create-group.component').then(
        (m) => m.CreateGroupComponent,
      ),
  },
  {
    path: 'grupos/:groupId/invitar',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./features/groups/invite-member/invite-member.component').then(
        (m) => m.InviteMemberComponent,
      ),
  },
  {
    path: 'grupos/:groupId',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./features/groups/group-detail/group-detail.component').then(
        (m) => m.GroupDetailComponent,
      ),
  },
  {
    path: 'privacidad',
    loadComponent: () =>
      import('./features/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
