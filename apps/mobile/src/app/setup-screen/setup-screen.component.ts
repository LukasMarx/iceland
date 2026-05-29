import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LibButtonDirective, LibScreenIntroComponent } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  imports: [LibButtonDirective, LibScreenIntroComponent],
  selector: 'app-setup-screen',
  templateUrl: './setup-screen.component.html',
  styleUrl: './setup-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupScreenComponent extends AppScreenBase {}
