import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective, LibMapComponent } from '@islandhub/ui';
import type { MapMarker } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import type { WizardHotel } from '../add-route-wizard.service';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibMapComponent],
  selector: 'app-add-route-step3',
  templateUrl: './add-route-step3.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep3Component extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  protected readonly wizardMarkers = computed((): MapMarker[] => {
    const hub = this.service.base() ?? this.app.explore().hub;
    const selected = this.service.endHotel();
    const hubMarker: MapMarker = {
      id: 'hub',
      coordinates: [hub.location.lon, hub.location.lat],
      color: '#101114',
      size: 'lg',
      label: hub.name,
    };
    const hotelMarkers: MapMarker[] = this.service.hotels().map((h) => ({
      id: h.id,
      coordinates: [h.location.lon, h.location.lat],
      color: selected?.id === h.id ? '#3b82f6' : '#94a3b8',
      size: 'md',
      label: h.name,
    }));
    return [hubMarker, ...hotelMarkers];
  });

  protected onMarkerClick(id: string): void {
    if (id !== 'hub') this.service.selectHotelFromPin(id);
  }

  protected selectEndHotel(hotel: WizardHotel): void {
    this.service.selectEndHotel(hotel);
  }

  protected continue(): void {
    if (this.service.endHotel()) {
      this.service.step.set(4);
      void this.router.navigateByUrl('/routes/add/step4');
    }
  }
}
