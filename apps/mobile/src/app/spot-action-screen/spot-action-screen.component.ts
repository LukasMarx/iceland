import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppScreenBase } from '../screen-base';
import { SpotActionWizardService } from './spot-action-wizard.service';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-spot-action-screen',
  templateUrl: './spot-action-screen.component.html',
  styleUrl: './spot-action-screen.component.scss',
})
export class SpotActionScreenComponent extends AppScreenBase implements OnInit, OnDestroy {
  protected readonly service = inject(SpotActionWizardService);
  private readonly router = inject(Router);
  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.service.completed$.subscribe((result) => {
        if (result.action === 'direct-route') {
          (this.app as any).createDirectRouteFromSpot();
        } else if (result.action === 'add-to-route' && result.routeId) {
          (this.app as any).addSpotToExistingRoute(result.routeId);
        }
      }),
    );
    this.subs.add(
      this.service.cancelled$.subscribe(() => {
        void this.router.navigateByUrl('/explore');
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  protected back(): void {
    const step = this.service.step();
    if (step === 1) {
      this.service.cancel();
    } else {
      this.service.step.set(1);
      void this.router.navigateByUrl('/spot-action/step1');
    }
  }
}
