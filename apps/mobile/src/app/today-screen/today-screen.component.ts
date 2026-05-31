import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibIllustratedEmptyStateComponent, LibScreenIntroComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideChevronsDown } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

@Component({
  imports: [NgClass, LibButtonDirective, LibChipComponent, LibIllustratedEmptyStateComponent, LibScreenIntroComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideChevronsDown],
  selector: 'app-today-screen',
  templateUrl: './today-screen.component.html',
  styleUrl: './today-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayScreenComponent extends AppScreenBase {
  protected readonly hasStops = computed(() => this.app.today().stops.length > 0);
  protected readonly screenTitle = computed(() => this.hasStops() ? this.app.today().title : 'Today');
  protected readonly emptyStateMessage = computed(() =>
    this.app.routeSuggestions().length > 0
      ? 'Choose one of your planned routes first, then start navigation for today from here.'
      : 'You do not have a route in progress yet. Build one first, then come back here to navigate.'
  );
  protected readonly emptyStateActionLabel = computed(() => this.app.routeSuggestions().length > 0 ? 'Choose a route' : 'Build a route');

  protected handleEmptyStateAction(): void {
    if (this.app.routeSuggestions().length > 0) {
      this.app.navigateToTab('routes');
      return;
    }

    this.app.addCustomRoute();
  }
}
