import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LibInputComponent, LibButtonDirective } from '@islandhub/ui';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, LibInputComponent, LibButtonDirective],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  error: string | null = null;
  submitting = false;

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = null;
    this.submitting = true;

    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: (response) => {
        this.auth.handleLoginSuccess(response);
      },
      error: (err) => {
        this.submitting = false;
        if (err.status === 401) {
          this.error = 'Invalid email or password.';
        } else {
          this.error = 'An error occurred. Please try again.';
        }
      },
    });
  }
}