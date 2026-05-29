import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppScreenBase } from '../screen-base';

@Component({
  selector: 'app-profile-screen',
  templateUrl: './profile-screen.component.html',
  styleUrl: './profile-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileScreenComponent extends AppScreenBase {}
