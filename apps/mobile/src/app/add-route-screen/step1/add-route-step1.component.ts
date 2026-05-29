import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective } from '@islandhub/ui';
import type { WizardBase } from '../add-route-wizard.service';
import { AddRouteWizardService, KEFLAVIK_BASE } from '../add-route-wizard.service';

@Component({
  standalone: true,
  imports: [LibButtonDirective],
  selector: 'app-add-route-step1',
  templateUrl: './add-route-step1.component.html',
})
export class AddRouteStep1Component {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  protected selectBase(base: WizardBase): void {
    this.service.selectBase(base);
  }

  protected selectCurrentLocation(): void {
    this.service.selectBase({ ...KEFLAVIK_BASE, id: 'current', name: 'Current location' });
  }

  protected continue(): void {
    if (this.service.base()) {
      this.service.step.set(2);
      void this.router.navigateByUrl('/routes/add/step2');
    }
  }
}
