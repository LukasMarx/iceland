import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Spot } from '@islandhub/domain';

export type SpotActionType = 'direct-route' | 'add-to-route';

export interface SpotActionResult {
  action: SpotActionType;
  routeId?: string;
}

@Injectable({ providedIn: 'root' })
export class SpotActionWizardService {
  readonly targetSpot = signal<Spot | null>(null);
  readonly action = signal<SpotActionType | null>(null);
  readonly step = signal<1 | 2>(1);

  /** Emits when the wizard finishes successfully. */
  readonly completed$ = new Subject<SpotActionResult>();
  /** Emits when the user cancels. */
  readonly cancelled$ = new Subject<void>();

  readonly totalSteps = 2;

  stepDots(): number[] {
    return Array.from({ length: this.totalSteps }, (_, i) => i + 1);
  }

  init(spot: Spot): void {
    this.targetSpot.set(spot);
    this.action.set(null);
    this.step.set(1);
  }

  selectAction(action: SpotActionType): void {
    this.action.set(action);
  }

  cancel(): void {
    this.cancelled$.next();
  }

  complete(routeId?: string): void {
    const action = this.action();
    if (action) {
      this.completed$.next({ action, routeId });
    }
  }
}
