import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-screen',
  template: `<section class="screen">
    <ng-content></ng-content>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      height: 100%;
      width: 100%;
    }

    .screen {
      display: flex;
      flex-direction: column;
      padding: 24px;
      height: 100%;
      widht: 100%;
      flex: 1;
    }
  `,
})
export class LibScreenComponent {}
