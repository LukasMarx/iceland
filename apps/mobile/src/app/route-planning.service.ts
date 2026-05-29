import { Injectable } from '@angular/core';
import type { AttractionRouteSummary, ExploreResponse, InsertPreviewResponse, TodayResponse, TripResponse } from '@islandhub/api-contracts';
import type { Hub, RouteStop, SafetyStatus, Spot } from '@islandhub/domain';
import { seedRouteSuggestions, seedSpots } from './seed-data';

export interface SelectedRouteStop {
  spot: Spot;
  driveFromPrevMinutes: number;
  distanceKm: number;
}

@Injectable({ providedIn: 'root' })
export class RoutePlanningService {
  selectedRouteStops(route: AttractionRouteSummary | null, spots: Spot[]): SelectedRouteStop[] {
    if (!route) {
      return [];
    }

    return route.spotIds
      .map((spotId, index) => {
        const spot = this.findSpot(spotId, spots);
        const driveFromPrevMinutes = index === 0
          ? (spot?.driveMinutes ?? 30)
          : Math.max(12, Math.round((spot?.driveMinutes ?? 45) / 3));
        const distanceKm = index === 0
          ? (spot?.distanceKm ?? 0)
          : Math.max(5, Math.round((spot?.distanceKm ?? 20) / 3));

        return { spot, driveFromPrevMinutes, distanceKm };
      })
      .filter((entry): entry is SelectedRouteStop => Boolean(entry.spot));
  }

  createDirectRouteFromSpot(spot: Spot, hub: Hub): AttractionRouteSummary {
    return {
      id: `direct-${spot.id}-${Date.now()}`,
      title: `Route to ${spot.name}`,
      summary: `Direct day trip from ${hub.name} to ${spot.name} and back.`,
      driveMinutes: spot.driveMinutes * 2,
      stops: 1,
      distanceKm: spot.distanceKm * 2,
      highestStatus: spot.status.status,
      spotIds: [spot.id],
      daylight: 'ample',
      reason: 'Created from Explore.',
    };
  }

  addSpotToRoute(route: AttractionRouteSummary, spot: Spot): AttractionRouteSummary {
    const spotIds = [...route.spotIds, spot.id];
    const highestStatus = this.highestStatus([spot.status.status, route.highestStatus]);
    const divisor = Math.max(1, route.stops + 2);
    const addedKm = Math.max(4, Math.round(spot.distanceKm / divisor));
    const addedMinutes = Math.max(8, Math.round(spot.driveMinutes / divisor));

    return {
      ...route,
      spotIds,
      stops: spotIds.length,
      distanceKm: route.distanceKm + addedKm,
      driveMinutes: route.driveMinutes + addedMinutes,
      highestStatus,
      summary: `${spotIds.length} stops including ${spot.name}.`,
    };
  }

  updateRouteFromSpotIds(route: AttractionRouteSummary, spotIds: string[], spots: Spot[]): AttractionRouteSummary {
    const selectedSpots = spotIds
      .map((spotId) => this.findSpot(spotId, spots))
      .filter((spot): spot is Spot => Boolean(spot));
    const highestStatus = this.highestStatus(selectedSpots.map((spot) => spot.status.status));
    const driveMinutes = Math.max(45, selectedSpots.reduce((sum, spot) => sum + Math.max(8, Math.round(spot.driveMinutes / 5)), 0) + 90);
    const distanceKm = Math.max(30, selectedSpots.reduce((sum, spot) => sum + Math.max(5, Math.round(spot.distanceKm / 3)), 0) + 45);

    return {
      ...route,
      spotIds,
      stops: spotIds.length,
      driveMinutes,
      distanceKm,
      highestStatus,
      summary: spotIds.length ? `${spotIds.length} stops adjusted from the route editor.` : 'Direct route without sightseeing stops.',
    };
  }

  fallbackInsertPreview(spot: Spot): InsertPreviewResponse {
    return {
      spot,
      recommendedAfterStopId: 'geysir',
      recommendedBeforeStopId: 'gullfoss',
      addedDriveMinutes: spot.id === 'seljalandsfoss' ? 18 : Math.max(12, Math.round(spot.driveMinutes / 4)),
      statusImpact: spot.status.status === 'yellow' ? 'stays amber' : spot.status.label.toLowerCase(),
      daylightImpact: spot.driveMinutes > 140 ? 'tight' : 'ample',
      warnings: spot.status.status === 'green' ? [] : spot.status.reasons,
    };
  }

  insertStop(today: TodayResponse, spot: Spot, position: 'recommended' | 'end', formatMinutes: (minutes: number) => string): TodayResponse {
    const alreadyInRoute = today.stops.some((stop) => stop.spotId === spot.id);

    if (alreadyInRoute) {
      return today;
    }

    const newStop: RouteStop = {
      id: spot.id,
      spotId: spot.id,
      title: spot.name,
      meta: `${formatMinutes(spot.driveMinutes)} drive - ${spot.stayMinutes} min stay`,
      driveFromPreviousMinutes: spot.driveMinutes,
      stayMinutes: spot.stayMinutes,
      status: spot.status.status,
      state: 'open',
      note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
    };
    const stops = [...today.stops];
    const returnIndex = stops.findIndex((stop) => stop.state === 'return');
    const recommendedIndex = Math.max(0, stops.findIndex((stop) => stop.id === 'gullfoss') + 1);
    const insertIndex = position === 'recommended' ? recommendedIndex : returnIndex;
    stops.splice(insertIndex, 0, newStop);

    return {
      ...today,
      stops,
      update: `Inserted ${spot.name}. Status rechecked against the same snapshot.`,
    };
  }

  todayRouteFromSpot(current: TodayResponse, spot: Spot, hub: Hub, formatMinutes: (minutes: number) => string): TodayResponse {
    return {
      ...current,
      title: `${spot.name} out-and-back`,
      stopProgress: '0/1',
      driveMinutes: spot.driveMinutes * 2,
      update: `Route created for today from ${hub.name} to ${spot.name} and back.`,
      stops: [
        { id: 'start', title: hub.name, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
        { id: spot.id, spotId: spot.id, title: spot.name, meta: `${formatMinutes(spot.driveMinutes)} drive - ${spot.stayMinutes} min stay`, driveFromPreviousMinutes: spot.driveMinutes, stayMinutes: spot.stayMinutes, status: spot.status.status, state: 'active', note: spot.status.reasons[0] },
        { id: 'return', title: hub.name, meta: 'return', driveFromPreviousMinutes: spot.driveMinutes, stayMinutes: 0, status: 'green', state: 'return' },
      ],
    };
  }

  todayRouteFromSuggestion(current: TodayResponse, route: AttractionRouteSummary, explore: ExploreResponse, formatMinutes: (minutes: number) => string): TodayResponse {
    const windLightMeta = ['12 min drive - 35 min stay', '14 min drive - 40 min stay', '64 min drive - 25 min stay', '52 min drive - 30 min stay'];
    const stops: RouteStop[] = route.spotIds.map((spotId, index) => {
      const spot = this.findSpot(spotId, explore.spots);
      const state: RouteStop['state'] = route.id === 'wind-light-loop' ? index < 2 ? 'done' : index === 2 ? 'active' : 'open' : index === 0 ? 'active' : 'open';
      const defaultDriveMinutes = index === 0 ? spot?.driveMinutes ?? 30 : Math.max(12, Math.round((spot?.driveMinutes ?? 45) / 3));

      return {
        id: spotId,
        spotId,
        title: spot?.name ?? spotId,
        meta: route.id === 'wind-light-loop' ? windLightMeta[index] : `${formatMinutes(defaultDriveMinutes)} drive - ${spot?.stayMinutes ?? 30} min stay`,
        driveFromPreviousMinutes: defaultDriveMinutes,
        stayMinutes: spot?.stayMinutes ?? 30,
        status: spot?.status.status ?? 'unknown',
        state,
        note: spot?.status.status === 'green' ? undefined : spot?.status.reasons[0],
      };
    });

    return {
      ...current,
      title: route.title,
      stopProgress: route.id === 'wind-light-loop' ? `2/${route.spotIds.length}` : `0/${route.spotIds.length}`,
      driveMinutes: route.driveMinutes,
      update: route.id === 'wind-light-loop' ? 'Seljalandsfoss wind gusts rising to 24 m/s. Still passable.' : `${route.title} started from saved highlights.`,
      stops: [
        { id: 'start', title: explore.hub.name, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
        ...stops,
        { id: 'return', title: explore.hub.name, meta: route.id === 'wind-light-loop' ? '18 min drive' : 'return', driveFromPreviousMinutes: Math.max(18, Math.round(route.driveMinutes / 5)), stayMinutes: 0, status: 'green', state: 'return' },
      ],
    };
  }

  markActiveStopDone(today: TodayResponse): TodayResponse {
    const activeIndex = today.stops.findIndex((stop) => stop.state === 'active');

    if (activeIndex < 0) {
      return today;
    }

    const stops = today.stops.map((stop, index) => index === activeIndex ? { ...stop, state: 'done' as const } : stop);
    const nextOpenIndex = stops.findIndex((stop, index) => index > activeIndex && stop.state === 'open');

    if (nextOpenIndex >= 0) {
      stops[nextOpenIndex] = { ...stops[nextOpenIndex], state: 'active' };
    }

    const doneCount = stops.filter((stop) => stop.state === 'done').length;
    const totalStops = stops.filter((stop) => stop.state !== 'start' && stop.state !== 'return').length;

    return {
      ...today,
      stopProgress: `${doneCount}/${totalStops}`,
      update: nextOpenIndex >= 0 ? `${stops[nextOpenIndex].title} is next. Status still ${stops[nextOpenIndex].status}.` : 'All planned stops are complete. Return route is ready.',
      stops,
    };
  }

  wizardTodayRoute(params: {
    current: TodayResponse;
    baseName: string;
    destinationName: string;
    dateLabel: string;
    dataAgeMinutes: number;
    selectedStops: Spot[];
    directDriveMinutes: number;
    totalDriveMinutes: number;
    formatMinutes: (minutes: number) => string;
  }): TodayResponse {
    const routeStops: RouteStop[] = params.selectedStops.map((spot, index) => ({
      id: spot.id,
      spotId: spot.id,
      title: spot.name,
      meta: `${params.formatMinutes(Math.max(8, Math.round(spot.driveMinutes / 5)))} drive - ${spot.stayMinutes} min stay`,
      driveFromPreviousMinutes: Math.max(8, Math.round(spot.driveMinutes / 5)),
      stayMinutes: spot.stayMinutes,
      status: spot.status.status,
      state: index === 0 ? 'active' : 'open',
      note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
    }));

    return {
      ...params.current,
      title: params.selectedStops.length ? 'Roadtrip draft' : 'Direct drive',
      dateLabel: params.dateLabel,
      recheckedMinutesAgo: params.dataAgeMinutes,
      stopProgress: `0/${routeStops.length}`,
      driveMinutes: params.totalDriveMinutes,
      daylightLeft: '14h 32',
      update: params.selectedStops.length ? 'Route checked against current road and weather snapshot.' : 'Direct leg saved without sightseeing stops.',
      stops: [
        { id: 'start', title: params.baseName, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
        ...routeStops,
        { id: 'destination', title: params.destinationName, meta: 'destination', driveFromPreviousMinutes: params.directDriveMinutes, stayMinutes: 0, status: 'green', state: 'return' },
      ],
    };
  }

  addDraftDay(tripResponse: TripResponse, title: string, summary: string, status: SafetyStatus): TripResponse {
    return {
      trip: {
        ...tripResponse.trip,
        days: [
          ...tripResponse.trip.days,
          {
            weekday: 'Draft',
            day: `${13 + tripResponse.trip.days.length}`,
            title,
            summary,
            status,
          },
        ],
      },
    };
  }

  localRouteSuggestions(): AttractionRouteSummary[] {
    return seedRouteSuggestions;
  }

  private findSpot(spotId: string, spots: Spot[]): Spot | undefined {
    return spots.find((spot) => spot.id === spotId) ?? seedSpots.find((spot) => spot.id === spotId);
  }

  private highestStatus(statuses: SafetyStatus[]): SafetyStatus {
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

    return statuses.reduce<SafetyStatus>((highest, status) => order[status] > order[highest] ? status : highest, 'green');
  }
}
