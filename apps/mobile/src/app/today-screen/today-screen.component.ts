import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibScreenIntroComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideChevronsDown } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  imports: [NgClass, LibButtonDirective, LibChipComponent, LibScreenIntroComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideChevronsDown],
  selector: 'app-today-screen',
  templateUrl: './today-screen.component.html',
  styleUrl: './today-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayScreenComponent extends AppScreenBase {}
