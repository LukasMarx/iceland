import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibEmptyStateComponent, LibScreenIntroComponent, LucideArrowRight, LucidePlus, LucideSlidersHorizontal } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  standalone: true,
  imports: [CommonModule, LibButtonDirective, LibChipComponent, LibEmptyStateComponent, LibScreenIntroComponent, LucideArrowRight, LucidePlus, LucideSlidersHorizontal],
  selector: 'app-routes-screen',
  templateUrl: './routes-screen.component.html',
  styleUrl: './routes-screen.component.scss',
})
export class RoutesScreenComponent extends AppScreenBase {}
