import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { SpotsListComponent } from './spots/spots-list/spots-list.component';
import { SpotCreateComponent } from './spots/spot-create/spot-create.component';
import { SpotDetailComponent } from './spots/spot-detail/spot-detail.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'spots', pathMatch: 'full' },
      { path: 'spots', component: SpotsListComponent },
      { path: 'spots/new', component: SpotCreateComponent },
      { path: 'spots/:id', component: SpotDetailComponent },
    ],
  },
  { path: '**', redirectTo: 'spots' },
];
