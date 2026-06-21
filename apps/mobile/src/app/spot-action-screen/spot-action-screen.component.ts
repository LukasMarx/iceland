import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { LibWizardHeaderComponent, LibScreenComponent } from '@islandhub/ui';
import { AppStateService } from '../services/app-state.service';
import { SpotActionWizardService } from './spot-action-wizard.service';

@Component({
  imports: [LibWizardHeaderComponent, RouterOutlet, LibScreenComponent],
  selector: 'app-spot-action-screen',
  templateUrl: './spot-action-screen.component.html',
  styleUrl: './spot-action-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotActionScreenComponent {
  protected readonly app = inject(AppStateService);
  protected readonly service = inject(SpotActionWizardService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.service.completed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.action === 'add-to-route' && result.routeId) {
          void this.app.addSpotToExistingRoute(result.routeId);
        }
      });

    this.service.cancelled$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.router.navigateByUrl('/explore');
      });
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
