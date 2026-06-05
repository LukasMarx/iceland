import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LibWizardBodyComponent, LibWizardFooterComponent, LucideBookmark, LucideHouse } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import type { WizardBase } from '../add-route-wizard.service';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LibWizardBodyComponent, LibWizardFooterComponent, LucideBookmark, LucideHouse],
  selector: 'app-add-route-step1',
  templateUrl: './add-route-step1.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./add-route-step1.component.scss'],
})
export class AddRouteStep1Component extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  constructor() {
    super();
    this.service.step.set(1);
    if (!this.service.base()) {
      this.service.init(this.app.currentWizardBase());
    }
  }

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
