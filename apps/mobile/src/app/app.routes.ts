import { Route } from '@angular/router';
import { AddRouteScreenComponent } from './add-route-screen/add-route-screen.component';
import { AddRouteStep1Component } from './add-route-screen/step1/add-route-step1.component';
import { AddRouteStep2Component } from './add-route-screen/step2/add-route-step2.component';
import { AddRouteStep3Component } from './add-route-screen/step3/add-route-step3.component';
import { AddRouteStep4Component } from './add-route-screen/step4/add-route-step4.component';
import { AddRouteStep5Component } from './add-route-screen/step5/add-route-step5.component';
import { ExploreScreenComponent } from './explore-screen/explore-screen.component';
import { ProfileScreenComponent } from './profile-screen/profile-screen.component';
import { RouteDetailScreenComponent } from './route-detail-screen/route-detail-screen.component';
import { RoutesScreenComponent } from './routes-screen/routes-screen.component';
import { SetupScreenComponent } from './setup-screen/setup-screen.component';
import { SpotActionScreenComponent } from './spot-action-screen/spot-action-screen.component';
import { SpotActionStep1Component } from './spot-action-screen/step1/spot-action-step1.component';
import { SpotActionStep2Component } from './spot-action-screen/step2/spot-action-step2.component';
import { TodayScreenComponent } from './today-screen/today-screen.component';
import { TripScreenComponent } from './trip-screen/trip-screen.component';

export const appRoutes: Route[] = [
	{ path: '', pathMatch: 'full', redirectTo: 'setup' },
	{ path: 'setup', component: SetupScreenComponent },
	{ path: 'explore', component: ExploreScreenComponent },
	{ path: 'routes', component: RoutesScreenComponent },
	{
		path: 'routes/add',
		component: AddRouteScreenComponent,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'step1' },
			{ path: 'step1', component: AddRouteStep1Component },
			{ path: 'step2', component: AddRouteStep2Component },
			{ path: 'step3', component: AddRouteStep3Component },
			{ path: 'step4', component: AddRouteStep4Component },
			{ path: 'step5', component: AddRouteStep5Component },
		],
	},
	{
		path: 'spot-action',
		component: SpotActionScreenComponent,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'step1' },
			{ path: 'step1', component: SpotActionStep1Component },
			{ path: 'step2', component: SpotActionStep2Component },
		],
	},
	{ path: 'route-detail', component: RouteDetailScreenComponent },
	{ path: 'today', component: TodayScreenComponent },
	{ path: 'trip', component: TripScreenComponent },
	{ path: 'profile', component: ProfileScreenComponent },
	{ path: '**', redirectTo: 'setup' },
];
