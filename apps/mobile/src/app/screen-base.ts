import { inject } from '@angular/core';
import { AppStateService } from './app-state.service';

export abstract class AppScreenBase {
  protected readonly app = inject(AppStateService);
}