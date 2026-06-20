import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective, LibMapComponent, LibWizardBodyComponent, LibBottomSheetComponent } from '@islandhub/ui';
import type { MapMarker } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import type { WizardHotel } from '../add-route-wizard.service';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibMapComponent, LibWizardBodyComponent, LibBottomSheetComponent],
  selector: 'app-add-route-step3',
  templateUrl: './add-route-step3.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./add-route-step3.component.scss'],
})
export class AddRouteStep3Component extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  protected readonly peekLabel = computed(() => {
    const hotel = this.service.endHotel();
    if (hotel) {
      return `${hotel.name} · ${hotel.distanceKm} km`;
    }
    if (this.service.hotelsLoading()) {
      return 'Loading hotels from API';
    }
    return `${this.service.hotels().length} hotels in this region`;
  });

  constructor() {
    super();
    this.service.step.set(3);
    if (!this.service.base()) {
      this.service.init(this.app.currentWizardBase());
    }
  }

  protected readonly wizardMarkers = computed((): MapMarker[] => {
    const hub = this.service.base() ?? this.app.explore().hub;
    const selected = this.service.endHotel();
    const hubMarker: MapMarker = {
      id: 'hub',
      coordinates: hub.location,
      color: '#101114',
      size: 'lg',
      label: hub.name,
    };
    const hotelMarkers: MapMarker[] = this.service.hotels().map((h) => ({
      id: h.id,
      coordinates: h.location,
      color: selected?.id === h.id ? '#101114' : '#666a73',
      size: 'sm',
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
