import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LibButtonDirective, LibInputComponent, LucideKeyRound, LucideMail } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';
import { AuthService } from '../services/auth.service';

@Component({
  imports: [LibButtonDirective, LibInputComponent, LucideMail, LucideKeyRound],
  selector: 'app-register-screen',
  templateUrl: './register-screen.component.html',
  styleUrl: '../auth-screen/auth-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterScreenComponent extends AppScreenBase {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly password = signal('');
  protected readonly locale = signal<'EN' | 'DE' | 'IS'>('EN');
  protected readonly primaryLabel = computed(() => 'Create account');

  constructor() {
    super();
    this.auth.backToEmailStep('register');
  }

  protected continueWithEmail(email: string): void {
    this.auth.continueWithEmail(email, 'register');
  }

  protected async submitPassword(): Promise<void> {
    const success = await this.auth.submitPassword(this.password());
    if (success) {
      this.password.set('');
    }
  }

  protected goToSignIn(): void {
    this.auth.backToEmailStep('login');
    void this.router.navigateByUrl('/auth');
  }

  protected switchLocale(): void {
    const next = this.locale() === 'EN' ? 'DE' : this.locale() === 'DE' ? 'IS' : 'EN';
    this.locale.set(next);
  }
}