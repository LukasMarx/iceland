import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { LibButtonDirective, LibScreenIntroComponent } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  standalone: true,
  imports: [CommonModule, LibButtonDirective, LibScreenIntroComponent],
  selector: 'app-setup-screen',
  templateUrl: './setup-screen.component.html',
  styleUrl: './setup-screen.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SetupScreenComponent extends AppScreenBase {}
