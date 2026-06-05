import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
