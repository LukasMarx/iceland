import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibIllustratedEmptyStateComponent, LibScreenComponent, LibScreenIntroComponent, LucideArrowRight, LucidePlus, LucideSlidersHorizontal } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  imports: [NgClass, LibButtonDirective, LibChipComponent, LibScreenComponent, LibIllustratedEmptyStateComponent, LibScreenIntroComponent, LucideArrowRight, LucidePlus, LucideSlidersHorizontal],
  selector: 'app-routes-screen',
  templateUrl: './routes-screen.component.html',
  styleUrl: './routes-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutesScreenComponent extends AppScreenBase {
  protected readonly hasRoutes = computed(() => this.app.routeSuggestions().length > 0);

  protected handleEmptyStateAction(): void {
    this.app.addCustomRoute();
  }
}
