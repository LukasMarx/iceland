import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LibWizardBodyComponent, LibWizardFooterComponent, LucideArrowRight, LucidePlus } from '@islandhub/ui';
import { SpotActionType, SpotActionWizardService } from '../spot-action-wizard.service';

@Component({
  imports: [LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LibWizardBodyComponent, LibWizardFooterComponent, LucideArrowRight, LucidePlus],
  selector: 'app-spot-action-step1',
  templateUrl: './spot-action-step1.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotActionStep1Component {
  protected readonly service = inject(SpotActionWizardService);
  private readonly router = inject(Router);

  protected selectAction(action: SpotActionType): void {
    this.service.selectAction(action);
  }

  protected continue(): void {
    const action = this.service.action();
    if (action === 'direct-route') {
      const spot = this.service.targetSpot();
      if (spot) {
        void this.router.navigateByUrl(`/routes/add/step1?spotId=${spot.id}`);
      }
    } else if (action === 'add-to-route') {
      this.service.step.set(2);
      void this.router.navigateByUrl('/spot-action/step2');
    }
  }

  protected get continueLabel(): string {
    const action = this.service.action();
    if (!action) return 'Choose an option';
    return action === 'direct-route' ? 'Create route →' : 'Pick a route →';
  }
}
