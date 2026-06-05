import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AppScreenBase } from '../screen-base';
import { LibScreenComponent } from '@islandhub/ui';

@Component({
  selector: 'app-profile-screen',
  templateUrl: './profile-screen.component.html',
  styleUrl: './profile-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibScreenComponent],
})
export class ProfileScreenComponent extends AppScreenBase {
  protected readonly auth = inject(AuthService);

  protected joinedLabel(joinedAt: string): string {
    if (!joinedAt) return '';

    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(joinedAt));
  }

  protected localeLabel(locale: string): string {
    return ({ en: 'English', de: 'Deutsch', is: 'Íslenska' } as Record<string, string>)[locale] ?? locale.toUpperCase();
  }

  protected async toggleLanguage(): Promise<void> {
    const current = this.app.me()?.preferences.locale ?? 'en';
    const next = current === 'en' ? 'de' : current === 'de' ? 'is' : 'en';
    await this.app.setProfilePreference({ locale: next });
  }

  protected async toggleUnits(): Promise<void> {
    const current = this.app.me()?.preferences.units ?? 'metric';
    await this.app.setProfilePreference({ units: current === 'metric' ? 'imperial' : 'metric' });
  }

  protected async toggleCurrency(): Promise<void> {
    const current = this.app.me()?.preferences.currency ?? 'EUR';
    const next = current === 'EUR' ? 'ISK' : current === 'ISK' ? 'USD' : 'EUR';
    await this.app.setProfilePreference({ currency: next });
  }
}
