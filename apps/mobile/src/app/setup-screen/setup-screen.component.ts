import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { LibButtonDirective } from '../../../../../libs/ui/src/lib/button/button.directive';
import { LibCalendarComponent } from '../../../../../libs/ui/src/lib/calendar/calendar.component';
import {
  LucideCarFront,
  LucideCompass,
  LucideHouse,
  LucideLightbulb,
  LucideMountain,
  LucideRoute,
} from '../../../../../libs/ui/src/lib/icons';
import { LibOptionGroupComponent, LibOptionGroupItemComponent } from '../../../../../libs/ui/src/lib/option-group/option-group.component';
import { LibScreenIntroComponent } from '../../../../../libs/ui/src/lib/screen-intro/screen-intro.component';
import { LibSwitchComponent } from '../../../../../libs/ui/src/lib/switch/switch.component';
import { LibWizardHeaderComponent } from '../../../../../libs/ui/src/lib/wizard-header/wizard-header.component';
import { AppScreenBase } from '../screen-base';
import { AddressService } from '../services/address.service';
import { LibAutocompleteComponent } from '@islandhub/ui';

@Component({
  imports: [
    LibButtonDirective,
    LibCalendarComponent,
    LibOptionGroupComponent,
    LibOptionGroupItemComponent,
    LibScreenIntroComponent,
    LibSwitchComponent,
    LibWizardHeaderComponent,
    LucideCarFront,
    LucideCompass,
    LucideHouse,
    LucideLightbulb,
    LucideMountain,
    LucideRoute,
    LibAutocompleteComponent,
  ],
  selector: 'app-setup-screen',
  templateUrl: './setup-screen.component.html',
  styleUrl: './setup-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupScreenComponent extends AppScreenBase {
  private addressService = inject(AddressService);
  private destroyRef = inject(DestroyRef);

  protected addressResults = signal<string[]>([]);
  protected addressLoading = signal(false);
  protected selectedAddress = signal<string | null>(null);

  private searchQuery = new Subject<string>();

  constructor() {
    super();

    const sub = this.searchQuery.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query.trim()) {
          return of([]);
        }
        return this.addressService.searchAddress(query);
      }),
    ).subscribe((results) => {
      console.log('Address search results:', results);
      this.addressResults.set(results);
      this.addressLoading.set(false);
    });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  protected onAddressQueryChange(query: string): void {
    if (query.trim()) {
      this.addressLoading.set(true);
    } else {
      this.addressResults.set([]);
      this.addressLoading.set(false);
    }
    this.searchQuery.next(query);
  }

  protected setLocale(locale: 'en' | 'de' | 'is'): void {
    void this.app.setProfilePreference({ locale });
  }

  protected selectPlanningMode(mode: 'draft' | 'hub' | 'road-trip'): void {
    this.app.selectSetupPlanningMode(mode);
  }

  protected selectVehicle(vehicle: 'car_2wd' | 'car_4wd' | 'unknown'): void {
    this.app.selectSetupVehicle(vehicle);
  }

  protected setDateRange(range: { start: string; end: string }): void {
    this.app.setSetupDateRange(range.start, range.end);
  }

  protected back(): void {
    this.app.backSetup();
  }

  protected mode: 'left' | 'right' = 'left';
}
