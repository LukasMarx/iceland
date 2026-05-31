import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LibButtonDirective, LibChipComponent, LucideCalendarDays, LucideCheck, LucideCircleUser, LucideCompass, LucideNavigation, LucideRoute, LucideTriangleAlert, LucideX } from '@islandhub/ui';
import { AppStateService } from './app-state.service';

@Component({
  imports: [NgClass, RouterOutlet, LibButtonDirective, LibChipComponent, LucideCalendarDays, LucideCheck, LucideCircleUser, LucideCompass, LucideNavigation, LucideRoute, LucideTriangleAlert, LucideX],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly appState = inject(AppStateService);

  protected readonly activeTab = this.appState.activeTab;
  protected readonly setupDone = this.appState.setupDone;
  protected readonly selectedSpot = this.appState.selectedSpot;
  protected readonly filterOpen = this.appState.filterOpen;
  protected readonly routeSheet = this.appState.routeSheet;
  protected readonly returnSheet = this.appState.returnSheet;
  protected readonly actionNotice = this.appState.actionNotice;
  protected readonly offlineMode = this.appState.offlineMode;
  protected readonly apiState = this.appState.apiState;
  protected readonly explore = this.appState.explore;
  protected readonly today = this.appState.today;
  protected readonly statusFilters = this.appState.statusFilters;
  protected readonly categoryFilters = this.appState.categoryFilters;
  protected readonly vehicleFilter = this.appState.vehicleFilter;
  protected readonly showFRoads = this.appState.showFRoads;
  protected readonly maxDriveMinutes = this.appState.maxDriveMinutes;
  protected readonly visibleSpots = this.appState.visibleSpots;
  protected readonly availableCategories = this.appState.availableCategories;
  protected readonly exploreLoading = this.appState.exploreLoading;
  protected readonly nextStop = this.appState.nextStop;
  protected readonly insertPreviewLabels = this.appState.insertPreviewLabels;
  protected readonly saferAlternatives = this.appState.saferAlternatives;

  protected readonly retryApi = this.appState.retryApi.bind(this.appState);
  protected readonly dismissActionNotice = this.appState.dismissActionNotice.bind(this.appState);
  protected readonly navigateToTab = this.appState.navigateToTab.bind(this.appState);
  protected readonly closeSpot = this.appState.closeSpot.bind(this.appState);
  protected readonly statusClass = this.appState.statusClass.bind(this.appState);
  protected readonly spotBackground = this.appState.spotBackground.bind(this.appState);
  protected readonly statusVariant = this.appState.statusVariant.bind(this.appState);
  protected readonly minutesToDrive = this.appState.minutesToDrive.bind(this.appState);
  protected readonly saveSelectedSpot = this.appState.saveSelectedSpot.bind(this.appState);
  protected readonly handleSpotPrimaryAction = this.appState.handleSpotPrimaryAction.bind(this.appState);
  protected readonly closeRouteSheet = this.appState.closeRouteSheet.bind(this.appState);
  protected readonly insertRouteStop = this.appState.insertRouteStop.bind(this.appState);
  protected readonly createRouteFromSpot = this.appState.createRouteFromSpot.bind(this.appState);
  protected readonly planRouteSheetSpotForLater = this.appState.planRouteSheetSpotForLater.bind(this.appState);
  protected readonly saveRouteSheetSpot = this.appState.saveRouteSheetSpot.bind(this.appState);
  protected readonly openSpot = this.appState.openSpot.bind(this.appState);
  protected readonly markActiveStopDone = this.appState.markActiveStopDone.bind(this.appState);
  protected readonly resetFilters = this.appState.resetFilters.bind(this.appState);
  protected readonly toggleStatusFilter = this.appState.toggleStatusFilter.bind(this.appState);
  protected readonly setVehicleFilter = this.appState.setVehicleFilter.bind(this.appState);
  protected readonly setShowFRoads = this.appState.setShowFRoads.bind(this.appState);
  protected readonly setMaxDriveMinutes = this.appState.setMaxDriveMinutes.bind(this.appState);
  protected readonly toggleCategoryFilter = this.appState.toggleCategoryFilter.bind(this.appState);
}
