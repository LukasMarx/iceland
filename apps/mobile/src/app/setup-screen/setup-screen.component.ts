import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LibButtonDirective, LibScreenIntroComponent } from '@islandhub/ui';
import { LibCalendarComponent } from '../../../../../libs/ui/src/lib/calendar/calendar.component';
import { AppScreenBase } from '../screen-base';

@Component({
  imports: [LibButtonDirective, LibCalendarComponent, LibScreenIntroComponent],
  selector: 'app-setup-screen',
  templateUrl: './setup-screen.component.html',
  styleUrl: './setup-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupScreenComponent extends AppScreenBase {
  protected setLocale(locale: 'en' | 'de' | 'is'): void {
    void this.app.setProfilePreference({ locale });
  }

  protected selectPlanningMode(mode: 'draft' | 'hub' | 'road-trip'): void {
    this.app.selectSetupPlanningMode(mode);
  }

  protected selectVehicle(vehicle: 'car_2wd' | 'car_4wd' | 'unknown'): void {
    this.app.selectSetupVehicle(vehicle);
  }
}
