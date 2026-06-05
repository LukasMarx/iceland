import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LibButtonDirective, LucideKeyRound, LucideMail } from '@islandhub/ui';
import { Router } from '@angular/router';
import { LibInputComponent } from '../../../../../libs/ui/src/lib/input/input.component';
import { AppScreenBase } from '../screen-base';
import { AuthService } from '../services/auth.service';

@Component({
  imports: [LibButtonDirective, LibInputComponent, LucideMail, LucideKeyRound],
  selector: 'app-auth-screen',
  templateUrl: './auth-screen.component.html',
  styleUrl: './auth-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthScreenComponent extends AppScreenBase {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly password = signal('');
  protected readonly locale = signal<'EN' | 'DE' | 'IS'>('EN');
  protected readonly primaryLabel = computed(() => 'Sign in');

  constructor() {
    super();
    this.auth.backToEmailStep('login');
  }

  protected continueWithEmail(email: string): void {
    this.auth.continueWithEmail(email);
  }

  protected async submitPassword(): Promise<void> {
    const success = await this.auth.submitPassword(this.password());
    if (success) {
      this.password.set('');
    }
  }

  protected goToRegister(): void {
    this.auth.backToEmailStep('register');
    void this.router.navigateByUrl('/register');
  }

  protected switchLocale(): void {
    const next = this.locale() === 'EN' ? 'DE' : this.locale() === 'DE' ? 'IS' : 'EN';
    this.locale.set(next);
  }
}