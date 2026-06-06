import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { SpotsListComponent } from './spots/spots-list/spots-list.component';
import { SpotCreateComponent } from './spots/spot-create/spot-create.component';
import { SpotDetailComponent } from './spots/spot-detail/spot-detail.component';
import { ImportOsmComponent } from './import-osm/import-osm.component';
import { PlacesListComponent } from './places/places-list.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'places', pathMatch: 'full' },
      { path: 'spots', component: SpotsListComponent },
      { path: 'spots/new', component: SpotCreateComponent },
      { path: 'spots/:id', component: SpotDetailComponent },
      { path: 'places', component: PlacesListComponent },
      { path: 'import', component: ImportOsmComponent },
    ],
  },
  { path: '**', redirectTo: 'places' },
];
