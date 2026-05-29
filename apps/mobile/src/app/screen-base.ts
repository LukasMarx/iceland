import { inject } from '@angular/core';
import { App } from './app';

export abstract class AppScreenBase {
  protected readonly app = inject(App) as any;
}