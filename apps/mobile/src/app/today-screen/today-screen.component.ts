import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibScreenIntroComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideChevronsDown } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  standalone: true,
  imports: [CommonModule, LibButtonDirective, LibChipComponent, LibScreenIntroComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideChevronsDown],
  selector: 'app-today-screen',
  templateUrl: './today-screen.component.html',
  styleUrl: './today-screen.component.scss',
})
export class TodayScreenComponent extends AppScreenBase {}
