import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LucideArrowRight, LucideRepeat2 } from '@islandhub/ui';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LucideArrowRight, LucideRepeat2],
  selector: 'app-add-route-step2',
  templateUrl: './add-route-step2.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep2Component {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  protected selectTripType(tripType: 'return' | 'one-way'): void {
    this.service.selectTripType(tripType);
  }

  protected continue(): void {
    const tripType = this.service.tripType();
    if (tripType === 'return') {
      this.service.step.set(4);
      void this.router.navigateByUrl('/routes/add/step4');
    } else if (tripType === 'one-way') {
      this.service.step.set(3);
      void this.router.navigateByUrl('/routes/add/step3');
    }
  }

  protected get continueLabel(): string {
    const tripType = this.service.tripType();
    if (!tripType) return 'Choose how your trip ends';
    return tripType === 'return' ? 'Plan stops along the route →' : 'Choose end location →';
  }
}
