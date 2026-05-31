import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective } from '@islandhub/ui';
import type { WizardBase } from '../add-route-wizard.service';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective],
  selector: 'app-add-route-step1',
  templateUrl: './add-route-step1.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep1Component {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  protected selectBase(base: WizardBase): void {
    this.service.selectBase(base);
  }

  protected selectCurrentLocation(): void {
    navigator.geolocation?.getCurrentPosition((position) => {
      this.service.setCurrentLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
    });
  }

  protected continue(): void {
    if (this.service.base()) {
      this.service.step.set(2);
      void this.router.navigateByUrl('/routes/add/step2');
    }
  }
}
