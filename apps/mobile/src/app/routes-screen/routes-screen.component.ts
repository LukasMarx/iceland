import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibEmptyStateComponent, LibScreenIntroComponent, LucideArrowRight, LucidePlus, LucideSlidersHorizontal } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  imports: [NgClass, LibButtonDirective, LibChipComponent, LibEmptyStateComponent, LibScreenIntroComponent, LucideArrowRight, LucidePlus, LucideSlidersHorizontal],
  selector: 'app-routes-screen',
  templateUrl: './routes-screen.component.html',
  styleUrl: './routes-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesScreenComponent extends AppScreenBase {}
