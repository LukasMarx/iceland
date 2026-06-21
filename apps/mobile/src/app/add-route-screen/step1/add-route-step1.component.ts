import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LibWizardBodyComponent, LibWizardFooterComponent, LucideBookmark, LucideHouse } from '@islandhub/ui';
import { AppStateService } from '../../services/app-state.service';
import type { WizardBase } from '../add-route-wizard.service';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibOptionGroupComponent, LibOptionGroupItemComponent, LibWizardBodyComponent, LibWizardFooterComponent, LucideBookmark, LucideHouse],
  selector: 'app-add-route-step1',
  templateUrl: './add-route-step1.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./add-route-step1.component.scss'],
})
export class AddRouteStep1Component {
  protected readonly app = inject(AppStateService);
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.service.step.set(1);
    if (!this.service.base()) {
      this.service.init(this.app.currentWizardBase());
    }

    const spotId = this.route.snapshot.queryParamMap.get('spotId');
    if (spotId) {
      this.service.selectedStopIds.set([spotId]);
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
