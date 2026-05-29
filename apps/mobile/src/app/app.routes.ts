import type { Route } from '@angular/router';
import { setupCompleteGuard, setupPendingGuard } from './setup.guard';

const guarded = [setupCompleteGuard];

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'setup' },
  {
    path: 'setup',
    canActivate: [setupPendingGuard],
    loadComponent: () => import('./setup-screen/setup-screen.component').then((component) => component.SetupScreenComponent),
  },
  {
    path: 'explore',
    canActivate: guarded,
    loadComponent: () => import('./explore-screen/explore-screen.component').then((component) => component.ExploreScreenComponent),
  },
  {
    path: 'routes',
    canActivate: guarded,
    loadComponent: () => import('./routes-screen/routes-screen.component').then((component) => component.RoutesScreenComponent),
  },
  {
    path: 'routes/add',
    canActivate: guarded,
    loadComponent: () => import('./add-route-screen/add-route-screen.component').then((component) => component.AddRouteScreenComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'step1' },
      { path: 'step1', loadComponent: () => import('./add-route-screen/step1/add-route-step1.component').then((component) => component.AddRouteStep1Component) },
      { path: 'step2', loadComponent: () => import('./add-route-screen/step2/add-route-step2.component').then((component) => component.AddRouteStep2Component) },
      { path: 'step3', loadComponent: () => import('./add-route-screen/step3/add-route-step3.component').then((component) => component.AddRouteStep3Component) },
      { path: 'step4', loadComponent: () => import('./add-route-screen/step4/add-route-step4.component').then((component) => component.AddRouteStep4Component) },
      { path: 'step5', loadComponent: () => import('./add-route-screen/step5/add-route-step5.component').then((component) => component.AddRouteStep5Component) },
    ],
  },
  {
    path: 'spot-action',
    canActivate: guarded,
    loadComponent: () => import('./spot-action-screen/spot-action-screen.component').then((component) => component.SpotActionScreenComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'step1' },
      { path: 'step1', loadComponent: () => import('./spot-action-screen/step1/spot-action-step1.component').then((component) => component.SpotActionStep1Component) },
      { path: 'step2', loadComponent: () => import('./spot-action-screen/step2/spot-action-step2.component').then((component) => component.SpotActionStep2Component) },
    ],
  },
  {
    path: 'route-detail',
    canActivate: guarded,
    loadComponent: () => import('./route-detail-screen/route-detail-screen.component').then((component) => component.RouteDetailScreenComponent),
  },
  {
    path: 'today',
    canActivate: guarded,
    loadComponent: () => import('./today-screen/today-screen.component').then((component) => component.TodayScreenComponent),
  },
  {
    path: 'trip',
    canActivate: guarded,
    loadComponent: () => import('./trip-screen/trip-screen.component').then((component) => component.TripScreenComponent),
  },
  {
    path: 'profile',
    canActivate: guarded,
    loadComponent: () => import('./profile-screen/profile-screen.component').then((component) => component.ProfileScreenComponent),
  },
  { path: '**', redirectTo: 'setup' },
];
