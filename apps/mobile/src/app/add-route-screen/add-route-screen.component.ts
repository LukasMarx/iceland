import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { LibScreenComponent, LibWizardHeaderComponent } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';
import { AddRouteWizardService } from './add-route-wizard.service';

@Component({
  imports: [LibWizardHeaderComponent, RouterOutlet, LibScreenComponent],
  selector: 'app-add-route-screen',
  templateUrl: './add-route-screen.component.html',
  styleUrl: './add-route-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteScreenComponent extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    super();

    this.service.completed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.app.setRouteEditorComingSoonNotice();
        void this.router.navigateByUrl('/routes');
      });

    this.service.cancelled$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.router.navigateByUrl(this.service.flow() === 'edit' && this.app.selectedRoute() ? '/route-detail' : '/routes');
      });
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
