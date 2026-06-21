import { Injectable, inject } from '@angular/core';
import type { AttractionRouteSummary, SafetyStatus, Spot } from '@islandhub/domain';
import { statusClass, statusVariant, minutesToDrive, spotBackground, routeStatusSummary, routeCardClass } from '@islandhub/domain';
import type { LibChipVariant } from '@islandhub/ui';
import { AddRouteWizardService } from '../add-route-screen/add-route-wizard.service';
import { SpotActionWizardService } from '../spot-action-screen/spot-action-wizard.service';
import { AppStateFacade } from './app-state-facade.service';

/**
 * Backward-compatible thin wrapper that delegates to {@link AppStateFacade}
 * and the domain-focused state services.
 *
 * New code should inject the specific state services directly
 * (ExploreStateService, FilterStateService, TodayStateService,
 *  RouteStateService, SetupStateService) or AppStateFacade for
 * cross-cutting coordination.
 *
 * This class is kept for the root App component and existing tests
 * during the transition period.
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly facade = inject(AppStateFacade);

  // ---- Expose wizard services (used by templates) ------------------------

  readonly wizard = inject(AddRouteWizardService);
  readonly spotActionWizard = inject(SpotActionWizardService);

  // ---- Re-export facade signals & methods --------------------------------

  readonly activeTab = this.facade.activeTab;
  readonly setupStep = this.facade.setupState.setupStep;
  readonly setupDone = this.facade.setupState.setupDone;
  readonly authRoute = this.facade.authRoute;
  readonly selectedSpot = this.facade.selectedSpot;
  readonly filterOpen = this.facade.filterOpen;
  readonly routeSheet = this.facade.routeSheet;
  readonly selectedRoute = this.facade.routeState.selectedRoute;
  readonly returnSheet = this.facade.returnSheet;
  readonly actionNotice = this.facade.actionNotice;
  readonly offlineMode = this.facade.offlineMode;
  readonly apiHealth = this.facade.apiHealth;
  readonly me = this.facade.me;
  readonly apiState = this.facade.apiState;
  readonly explore = this.facade.exploreState.explore;
  readonly today = this.facade.todayState.today;
  readonly trip = this.facade.trip;
  readonly routeSuggestions = this.facade.routeState.routeSuggestions;
  readonly savedSpotIds = this.facade.savedSpotIds;
  readonly exploreLoading = this.facade.exploreState.exploreLoading;
  readonly activeRoute = this.facade.todayState.activeRoute;
  readonly setupPlanningSelection = this.facade.setupState.setupPlanningSelection;
  readonly setupVehicleSelection = this.facade.setupState.setupVehicleSelection;
  readonly setupSelectedStartDate = this.facade.setupState.setupSelectedStartDate;
  readonly setupSelectedEndDate = this.facade.setupState.setupSelectedEndDate;
  readonly statusFilters = this.facade.filterState.statusFilters;
  readonly categoryFilters = this.facade.filterState.categoryFilters;
  readonly categoryOptions = this.facade.exploreState.categoryOptions;
  readonly vehicleFilter = this.facade.filterState.vehicleFilter;
  readonly showFRoads = this.facade.filterState.showFRoads;
  readonly maxDriveMinutes = this.facade.filterState.maxDriveMinutes;
  readonly setupScreens = this.facade.setupState.setupScreens;
  readonly visibleSpots = this.facade.exploreState.visibleSpots;
  readonly mapPoints = this.facade.exploreState.mapPoints;
  readonly statusCounts = this.facade.exploreState.statusCounts;
  readonly selectedRouteStops = this.facade.routeState.selectedRouteStops;
  readonly availableCategories = this.facade.exploreState.availableCategories;
  readonly nextStop = this.facade.todayState.nextStop;
  readonly navigationLabel = this.facade.todayState.navigationLabel;
  readonly savedCount = this.facade.savedCount;
  readonly savedSpots = this.facade.savedSpots;
  readonly setupSelectedDates = this.facade.setupState.setupSelectedDates;
  readonly setupCalendar = this.facade.setupState.setupCalendar;
  readonly insertPreviewLabels = this.facade.insertPreviewLabels;
  readonly saferAlternatives = this.facade.saferAlternatives;
  readonly setupPlanningMode = this.facade.setupState.setupPlanningMode;
  readonly setupVehicle = this.facade.setupState.setupVehicle;
  readonly setupDateSummary = this.facade.setupState.setupDateSummary;

  // ---- Methods bound to facade -------------------------------------------

  continueSetup = this.facade.continueSetup.bind(this.facade);
  backSetup = this.facade.backSetup.bind(this.facade);
  skipSetup = this.facade.skipSetup.bind(this.facade);
  retryApi = this.facade.retryApi.bind(this.facade);
  openSpot = this.facade.openSpot.bind(this.facade);
  openMapPoint = this.facade.openMapPoint.bind(this.facade);
  closeSpot = this.facade.closeSpot.bind(this.facade);
  createTodayRoute = this.facade.createTodayRoute.bind(this.facade);
  navigateToTab = this.facade.navigateToTab.bind(this.facade);
  isSaved = this.facade.isSaved.bind(this.facade);
  isAllCategories = (): boolean => this.facade.filterState.isAllCategories(this.facade.exploreState.availableCategories().length);
  setCategoryPreset = (category: string | null): void => {
    this.facade.filterState.setCategoryPreset(category);
    void this.exploreStateLoad();
  };
  handleSpotPrimaryAction = this.facade.handleSpotPrimaryAction.bind(this.facade);
  closeRouteSheet = this.facade.closeRouteSheet.bind(this.facade);
  openRouteDetail = this.facade.openRouteDetail.bind(this.facade);
  editRoute = this.facade.editRoute.bind(this.facade);
  openBestRoute = this.facade.openBestRoute.bind(this.facade);
  addCustomRoute = this.facade.addCustomRoute.bind(this.facade);
  openSpotAction = this.facade.openSpotAction.bind(this.facade);
  addSpotToExistingRoute = this.facade.addSpotToExistingRoute.bind(this.facade);
  closeRouteDetail = this.facade.closeRouteDetail.bind(this.facade);
  applyWizardRouteEdit = this.facade.applyWizardRouteEdit.bind(this.facade);
  routeDetailTotalMinutes = this.facade.routeState.routeDetailTotalMinutes.bind(this.facade.routeState);
  removeSpotFromSelectedRoute = this.facade.routeState.removeSpotFromSelectedRoute.bind(this.facade.routeState);
  dismissActionNotice = this.facade.dismissActionNotice.bind(this.facade);
  insertRouteStop = this.facade.insertRouteStop.bind(this.facade);
  createRouteFromSpot = this.facade.createRouteFromSpot.bind(this.facade);
  saveSelectedSpot = this.facade.saveSelectedSpot.bind(this.facade);
  saveSelectedSpotFromList = this.facade.saveSelectedSpotFromList.bind(this.facade);
  saveRouteSheetSpot = this.facade.saveRouteSheetSpot.bind(this.facade);
  planRouteSheetSpotForLater = this.facade.planRouteSheetSpotForLater.bind(this.facade);
  startRoute = this.facade.startRoute.bind(this.facade);
  routeSpotName = this.facade.routeState.routeSpotName.bind(this.facade.routeState);
  routeSpotImage = (spotId: string): string => {
    const spot = this.facade.exploreState.findSpot(spotId);
    const fallback = 'linear-gradient(135deg, #dfe7e2 0%, #8da39a 48%, #52655f 100%)';
    return spot ? spotBackground(spot, fallback) : fallback;
  };
  spotBackground = (spot: Spot): string => spotBackground(spot);
  routeStatusSummary = (route: AttractionRouteSummary): string => routeStatusSummary(route);
  routeCardClass = (route: AttractionRouteSummary, index: number): string => routeCardClass(route, index);
  openNavigation = this.facade.openNavigation.bind(this.facade);
  markActiveStopDone = this.facade.markActiveStopDone.bind(this.facade);
  cacheCurrentTripMap = this.facade.cacheCurrentTripMap.bind(this.facade);
  setProfilePreference = this.facade.setProfilePreference.bind(this.facade);
  toggleSafetyPreference = this.facade.toggleSafetyPreference.bind(this.facade);
  selectSetupPlanningMode = this.facade.setupState.selectPlanningMode.bind(this.facade.setupState);
  selectSetupVehicle = (vehicle: 'car_2wd' | 'car_4wd' | 'unknown'): void => {
    this.facade.setupState.selectVehicle(vehicle);
    this.trip.update((t) => ({ trip: { ...t.trip, vehicle } }));
    this.facade.filterState.setVehicleFilter(vehicle === 'unknown' ? 'any' : vehicle);
    void this.exploreStateLoad();
  };
  setSetupDateRange = this.facade.setupState.setDateRange.bind(this.facade.setupState);
  toggleStatusFilter = (status: SafetyStatus): void => {
    this.facade.filterState.toggleStatusFilter(status);
    void this.exploreStateLoad();
  };
  toggleCategoryFilter = (category: string): void => {
    this.facade.filterState.toggleCategoryFilter(category);
    void this.exploreStateLoad();
  };
  setVehicleFilter = (vehicle: 'car_2wd' | 'car_4wd' | 'any'): void => {
    this.facade.filterState.setVehicleFilter(vehicle);
    void this.exploreStateLoad();
  };
  setShowFRoads = (show: boolean): void => {
    this.facade.filterState.setShowFRoads(show);
    void this.exploreStateLoad();
  };
  setMaxDriveMinutes = (minutes: number): void => {
    this.facade.filterState.setMaxDriveMinutes(minutes);
    void this.exploreStateLoad();
  };
  resetFilters = (): void => {
    this.facade.filterState.reset();
    void this.exploreStateLoad();
  };
  statusClass = (status: SafetyStatus): string => statusClass(status);
  statusVariant = (status: SafetyStatus): LibChipVariant => statusVariant(status);
  mapPointStatus = this.facade.exploreState.mapPointStatus.bind(this.facade.exploreState);
  statusCount = this.facade.exploreState.statusCount.bind(this.facade.exploreState);
  minutesToDrive = (minutes: number): string => minutesToDrive(minutes);
  setWizardTodayRoute = this.facade.setWizardTodayRoute.bind(this.facade);
  saveWizardDraftDay = this.facade.saveWizardDraftDay.bind(this.facade);
  setRouteEditorComingSoonNotice = this.facade.setRouteEditorComingSoonNotice.bind(this.facade);
  currentWizardBase = this.facade.routeState.currentWizardBase.bind(this.facade.routeState);

  // ---- Private helpers ----------------------------------------------------

  private activeTripDate(): string | undefined {
    return this.trip().trip.days.find((d) => d.today)?.date;
  }

  private exploreStateLoad(): Promise<void> {
    return this.facade.exploreState.load(
      this.activeTripDate(),
      (msg) => { this.facade.actionNotice.set(msg); },
    );
  }
}
