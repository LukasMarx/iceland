import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { statusClass, spotBackground, statusVariant, minutesToDrive } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LucideCalendarDays, LucideCheck, LucideCircleUser, LucideCompass, LucideNavigation, LucideRoute, LucideTriangleAlert, LucideX } from '@islandhub/ui';
import { AuthService } from './services/auth.service';
import { AppStateFacade } from './services/app-state-facade.service';

@Component({
  imports: [NgClass, RouterOutlet, LibButtonDirective, LibChipComponent, LucideCalendarDays, LucideCheck, LucideCircleUser, LucideCompass, LucideNavigation, LucideRoute, LucideTriangleAlert, LucideX],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly facade = inject(AppStateFacade);
  private readonly auth = inject(AuthService);

  protected readonly activeTab = this.facade.activeTab;
  protected readonly authReady = this.auth.ready;
  protected readonly authRestoring = this.auth.isRestoringSession;
  protected readonly setupDone = this.facade.setupState.setupDone;
  protected readonly authRoute = this.facade.authRoute;
  protected readonly selectedSpot = this.facade.selectedSpot;
  protected readonly filterOpen = this.facade.filterOpen;
  protected readonly routeSheet = this.facade.routeSheet;
  protected readonly returnSheet = this.facade.returnSheet;
  protected readonly actionNotice = this.facade.actionNotice;
  protected readonly offlineMode = this.facade.offlineMode;
  protected readonly apiState = this.facade.apiState;
  protected readonly explore = this.facade.exploreState.explore;
  protected readonly today = this.facade.todayState.today;
  protected readonly statusFilters = this.facade.filterState.statusFilters;
  protected readonly categoryFilters = this.facade.filterState.categoryFilters;
  protected readonly vehicleFilter = this.facade.filterState.vehicleFilter;
  protected readonly showFRoads = this.facade.filterState.showFRoads;
  protected readonly maxDriveMinutes = this.facade.filterState.maxDriveMinutes;
  protected readonly visibleSpots = this.facade.exploreState.visibleSpots;
  protected readonly availableCategories = this.facade.exploreState.availableCategories;
  protected readonly exploreLoading = this.facade.exploreState.exploreLoading;
  protected readonly nextStop = this.facade.todayState.nextStop;
  protected readonly insertPreviewLabels = this.facade.insertPreviewLabels;
  protected readonly saferAlternatives = this.facade.saferAlternatives;

  protected readonly retryApi = this.facade.retryApi.bind(this.facade);
  protected readonly dismissActionNotice = this.facade.dismissActionNotice.bind(this.facade);
  protected readonly navigateToTab = this.facade.navigateToTab.bind(this.facade);
  protected readonly closeSpot = this.facade.closeSpot.bind(this.facade);
  protected readonly statusClass = statusClass;
  protected readonly spotBackground = spotBackground;
  protected readonly statusVariant = statusVariant;
  protected readonly minutesToDrive = minutesToDrive;
  protected readonly saveSelectedSpot = this.facade.saveSelectedSpot.bind(this.facade);
  protected readonly handleSpotPrimaryAction = this.facade.handleSpotPrimaryAction.bind(this.facade);
  protected readonly closeRouteSheet = this.facade.closeRouteSheet.bind(this.facade);
  protected readonly insertRouteStop = this.facade.insertRouteStop.bind(this.facade);
  protected readonly createRouteFromSpot = this.facade.createRouteFromSpot.bind(this.facade);
  protected readonly planRouteSheetSpotForLater = this.facade.planRouteSheetSpotForLater.bind(this.facade);
  protected readonly saveRouteSheetSpot = this.facade.saveRouteSheetSpot.bind(this.facade);
  protected readonly openSpot = this.facade.openSpot.bind(this.facade);
  protected readonly markActiveStopDone = this.facade.markActiveStopDone.bind(this.facade);
  protected readonly resetFilters = this.facade.resetFilters.bind(this.facade);
  protected readonly toggleStatusFilter = this.facade.toggleStatusFilter.bind(this.facade);
  protected readonly setVehicleFilter = this.facade.setVehicleFilter.bind(this.facade);
  protected readonly setShowFRoads = this.facade.setShowFRoads.bind(this.facade);
  protected readonly setMaxDriveMinutes = this.facade.setMaxDriveMinutes.bind(this.facade);
  protected readonly toggleCategoryFilter = this.facade.toggleCategoryFilter.bind(this.facade);
}
