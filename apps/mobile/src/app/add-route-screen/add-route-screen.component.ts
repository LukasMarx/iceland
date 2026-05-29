import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppScreenBase } from '../screen-base';
import { AddRouteWizardService } from './add-route-wizard.service';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-add-route-screen',
  templateUrl: './add-route-screen.component.html',
  styleUrl: './add-route-screen.component.scss',
})
export class AddRouteScreenComponent extends AppScreenBase implements OnInit, OnDestroy {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);
  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.service.completed$.subscribe(() => {
        (this.app as any).actionNotice.set('Route-Editor kommt im nächsten Schritt.');
        void this.router.navigateByUrl('/routes');
      }),
    );
    this.subs.add(
      this.service.cancelled$.subscribe(() => {
        void this.router.navigateByUrl(this.service.flow() === 'edit' && this.app.selectedRoute() ? '/route-detail' : '/routes');
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  protected back(): void {
    const step = this.service.step();
    this.service.sheetExpanded.set(false);
    if (this.service.flow() === 'edit') {
      if (step === 5) {
        this.service.step.set(4);
        void this.router.navigateByUrl('/routes/add/step4');
      } else {
        this.service.cancel();
      }
      return;
    }

    if (step === 1) {
      this.service.cancel();
    } else if (step === 2) {
      this.service.step.set(1);
      void this.router.navigateByUrl('/routes/add/step1');
    } else if (step === 3) {
      this.service.step.set(2);
      void this.router.navigateByUrl('/routes/add/step2');
    } else if (step === 4) {
      const previousStep = this.service.tripType() === 'one-way' ? 3 : 2;
      this.service.step.set(previousStep);
      void this.router.navigateByUrl(`/routes/add/step${previousStep}`);
    } else if (step === 5) {
      this.service.step.set(4);
      void this.router.navigateByUrl('/routes/add/step4');
    }
  }
}
