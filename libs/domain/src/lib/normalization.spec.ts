import { describe, expect, it } from 'vitest';
import {
  normalizeAttractionRoute,
  normalizeAuthResponse,
  normalizeExplore,
  normalizeHotelsSearch,
  normalizeHub,
  normalizeInsertPreview,
  normalizeLocation,
  normalizeMedia,
  normalizeMe,
  normalizeOfflineCacheRegion,
  normalizePlacesSearch,
  normalizePlanSpot,
  normalizePlannedRouteMutation,
  normalizePlace,
  normalizeHotel,
  normalizePreferenceUpdate,
  normalizeRouteMutation,
  normalizeRouteStop,
  normalizeRouteSuggestions,
  normalizeSavedSpots,
  normalizeSaveSpot,
  normalizeSpot,
  normalizeSpotContext,
  normalizeStatusSnapshot,
  normalizeToday,
  normalizeTripDay,
  normalizeTripResponse,
} from './normalization';

// ── helpers ─────────────────────────────────────────────────

const now = '2026-05-25T07:42:00.000Z';

function rawSpot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'geysir',
    name: 'Geysir',
    region: 'South Iceland',
    category: 'Geothermal',
    location: { lat: 64.313, lon: -20.3 },
    driveMinutes: 37,
    distanceKm: 52,
    stayMinutes: 35,
    tags: ['geothermal'],
    isFRoad: false,
    status: {
      status: 'green',
      label: 'Open',
      reasons: ['Roads open.'],
      roadStatus: 'Route 1 open',
      weatherStatus: 'Current',
      vehicleCompatibility: '2WD ok',
      sourceTimestamps: [],
      calculatedAt: now,
      validUntil: now,
      version: 1,
    },
    media: [],
    ...overrides,
  };
}

// ── leaf normalizers ────────────────────────────────────────

describe('normalizeLocation', () => {
  it('extracts lat/lon from a valid object', () => {
    expect(normalizeLocation({ lat: 64.3, lon: -20.5 })).toEqual({ lat: 64.3, lon: -20.5 });
  });

  it('returns zeros for non-object input', () => {
    expect(normalizeLocation(null)).toEqual({ lat: 0, lon: 0 });
    expect(normalizeLocation(undefined)).toEqual({ lat: 0, lon: 0 });
  });

  it('parses string numbers', () => {
    expect(normalizeLocation({ lat: '64.3', lon: '-20.5' })).toEqual({ lat: 64.3, lon: -20.5 });
  });
});

describe('normalizeMedia', () => {
  it('extracts media fields', () => {
    const result = normalizeMedia({ id: 'm1', type: 'image', url: 'https://img.jpg', alt: 'A photo' });
    expect(result).toEqual({
      id: 'm1',
      type: 'image',
      url: 'https://img.jpg',
      thumbnailUrl: undefined,
      alt: 'A photo',
      credit: undefined,
    });
  });

  it('falls back to url for id', () => {
    const result = normalizeMedia({ url: 'https://img.jpg' });
    expect(result.id).toBe('https://img.jpg');
  });
});

describe('normalizeStatusSnapshot', () => {
  it('builds a full snapshot from raw data', () => {
    const result = normalizeStatusSnapshot(
      { status: 'yellow', label: 'Caution', reasons: ['Wind'], roadStatus: 'Slow', weatherStatus: 'Gusty', vehicleCompatibility: '4WD only', sourceTimestamps: [], calculatedAt: now, validUntil: now, version: 2 },
      'geysir',
    );
    expect(result.status).toBe('yellow');
    expect(result.spotId).toBe('geysir');
    expect(result.version).toBe(2);
  });

  it('falls back to level field for status', () => {
    const result = normalizeStatusSnapshot({ level: 'red' }, 'spot-1');
    expect(result.status).toBe('red');
  });

  it('returns unknown for invalid status strings', () => {
    const result = normalizeStatusSnapshot({ status: 'purple' }, 'spot-1');
    expect(result.status).toBe('unknown');
  });

  it('wraps a single reason into an array', () => {
    const result = normalizeStatusSnapshot({ status: 'green', reason: 'All clear' }, 'spot-1');
    expect(result.reasons).toEqual(['All clear']);
  });
});

describe('normalizeSpot', () => {
  it('normalizes a complete spot', () => {
    const result = normalizeSpot(rawSpot());
    expect(result.id).toBe('geysir');
    expect(result.name).toBe('Geysir');
    expect(result.driveMinutes).toBe(37);
    expect(result.distanceKm).toBe(52);
    expect(result.status.status).toBe('green');
  });

  it('falls back to driveMinutesFromHub and distanceKmFromHub', () => {
    const result = normalizeSpot(rawSpot({ driveMinutes: undefined, distanceKm: undefined, driveMinutesFromHub: 45, distanceKmFromHub: 60 }));
    expect(result.driveMinutes).toBe(45);
    expect(result.distanceKm).toBe(60);
  });

  it('estimates distance from drive time when both are missing', () => {
    const result = normalizeSpot(rawSpot({ driveMinutes: 30, distanceKm: undefined, distanceKmFromHub: undefined }));
    expect(result.distanceKm).toBe(36); // 30 * 1.2
  });

  it('falls back to categoryIds for category and tags', () => {
    const result = normalizeSpot(rawSpot({ category: undefined, tags: [], categoryIds: ['waterfall'] }));
    expect(result.category).toBe('waterfall');
    expect(result.tags).toEqual(['waterfall']);
  });

  it('returns defaults for null input', () => {
    const result = normalizeSpot(null);
    expect(result.id).toBe('');
    expect(result.name).toBe('Unknown spot');
    expect(result.status.status).toBe('unknown');
  });
});

describe('normalizeHub', () => {
  it('extracts hub fields', () => {
    const result = normalizeHub({ id: 'h1', name: 'Cabin', location: { lat: 64, lon: -21 }, dateRange: 'May', nights: 5 });
    expect(result.id).toBe('h1');
    expect(result.nights).toBe(5);
  });

  it('uses provided defaults for dateRange and nights', () => {
    const result = normalizeHub({}, 'Jun 1-10', 9);
    expect(result.dateRange).toBe('Jun 1-10');
    expect(result.nights).toBe(9);
  });
});

// ── route stop ──────────────────────────────────────────────

describe('normalizeRouteStop', () => {
  it('normalizes a stop with all fields', () => {
    const result = normalizeRouteStop({
      id: 'stop-1',
      spotId: 'geysir',
      title: 'Geysir stop',
      meta: '30 min drive',
      driveFromPreviousMinutes: 30,
      stayMinutes: 45,
      status: { status: 'green' },
      state: 'active',
    });
    expect(result.id).toBe('stop-1');
    expect(result.spotId).toBe('geysir');
    expect(result.driveFromPreviousMinutes).toBe(30);
    expect(result.state).toBe('active');
    expect(result.status).toBe('green');
  });

  it('maps pending state to open', () => {
    const result = normalizeRouteStop({ id: 's1', state: 'pending' });
    expect(result.state).toBe('open');
  });

  it('falls back to driveMinutesFromPrevious', () => {
    const result = normalizeRouteStop({ id: 's1', driveFromPreviousMinutes: undefined, driveMinutesFromPrevious: 20 });
    expect(result.driveFromPreviousMinutes).toBe(20);
  });
});

// ── trip day ────────────────────────────────────────────────

describe('normalizeTripDay', () => {
  it('normalizes a trip day', () => {
    const result = normalizeTripDay({ date: '2026-05-14', title: 'South Coast', status: 'active' }, 0);
    expect(result.date).toBe('2026-05-14');
    expect(result.day).toBe('14');
    expect(result.weekday).toBe('THU');
    expect(result.today).toBe(true);
    expect(result.status).toBe('yellow');
    expect(result.dayLabel).toBe('DAY 1');
  });

  it('maps done status to green', () => {
    const result = normalizeTripDay({ status: 'done' }, 2);
    expect(result.status).toBe('green');
  });

  it('maps cancelled status to red', () => {
    const result = normalizeTripDay({ status: 'cancelled' }, 0);
    expect(result.status).toBe('red');
  });
});

// ── response normalizers ────────────────────────────────────

describe('normalizeExplore', () => {
  it('normalizes a full explore response', () => {
    const result = normalizeExplore({
      hub: { id: 'h1', name: 'Cabin', location: { lat: 64, lon: -21 }, dateRange: 'May', nights: 5 },
      dateLabel: 'Today',
      vehicle: 'car_2wd',
      dataAgeMinutes: 8,
      spots: [rawSpot()],
      smartRoutes: [],
    });
    expect(result.hub.id).toBe('h1');
    expect(result.spots).toHaveLength(1);
    expect(result.vehicle).toBe('car_2wd');
  });

  it('handles null input gracefully', () => {
    const result = normalizeExplore(null);
    expect(result.spots).toEqual([]);
    expect(result.vehicle).toBe('unknown');
  });
});

describe('normalizeToday', () => {
  it('normalizes a today response', () => {
    const result = normalizeToday({
      title: 'Loop',
      dateLabel: 'Thu 14 May',
      recheckedMinutesAgo: 5,
      stopProgress: '2/4',
      driveMinutes: 120,
      daylightLeft: '14h',
      update: 'Updated',
      stops: [],
    });
    expect(result.title).toBe('Loop');
    expect(result.driveMinutes).toBe(120);
    expect(result.stops).toEqual([]);
  });

  it('falls back to totalDriveMinutes', () => {
    const result = normalizeToday({ driveMinutes: undefined, totalDriveMinutes: 90 });
    expect(result.driveMinutes).toBe(90);
  });
});

describe('normalizeTripResponse', () => {
  it('normalizes a trip response', () => {
    const result = normalizeTripResponse({
      trip: {
        title: 'Iceland',
        startsOn: '2026-05-13',
        endsOn: '2026-05-22',
        vehicle: 'car_2wd',
        pace: 'Relaxed',
        hub: { id: 'h1', name: 'Cabin', location: { lat: 64, lon: -21 } },
        status: 'active',
        totalDays: 10,
        daysPlanned: 5,
        routesUsed: 3,
        totalRoutes: 5,
        hotelsToBook: 2,
        unplacedRoutes: [],
        days: [{ date: '2026-05-14', title: 'Day 1' }],
      },
    });
    expect(result.trip.title).toBe('Iceland');
    expect(result.trip.days).toHaveLength(1);
    expect(result.trip.hub.dateRange).toBe('2026-05-13 - 2026-05-22');
  });
});

describe('normalizeSavedSpots', () => {
  it('normalizes saved spots response', () => {
    const result = normalizeSavedSpots({ savedSpotIds: ['geysir'], spots: [rawSpot()] });
    expect(result.savedSpotIds).toEqual(['geysir']);
    expect(result.spots).toHaveLength(1);
  });
});

describe('normalizeRouteSuggestions', () => {
  it('normalizes route suggestions with clean RouteSuggestion shapes', () => {
    const result = normalizeRouteSuggestions({
      savedSpots: [rawSpot()],
      routes: [
        {
          suggestionId: 'sug-1',
          route: {
            id: 'r1',
            title: 'Loop',
            stops: 3,
            totalDriveMinutes: 90,
            distanceKm: 50,
            highestStatus: 'green',
            spotIds: ['geysir'],
          },
          reason: 'Good conditions',
          expiresAt: now,
        },
      ],
      pageInfo: { hasMore: true, nextCursor: 'cursor-1' },
    });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].id).toBe('r1');
    expect(result.routes[0].suggestionId).toBe('sug-1');
    expect(result.routes[0].driveMinutes).toBe(90);
    expect(result.routes[0].highestStatus).toBe('green');
    expect(result.pageInfo?.hasMore).toBe(true);
  });

  it('handles stops as number', () => {
    const result = normalizeRouteSuggestions({
      savedSpots: [],
      routes: [
        {
          suggestionId: 'sug-1',
          route: { title: 'Loop', stops: 5 },
          reason: 'test',
          expiresAt: now,
        },
      ],
    });
    expect(result.routes[0].stops).toBe(5);
  });

  it('handles stops as array of objects with spotId', () => {
    const result = normalizeRouteSuggestions({
      savedSpots: [],
      routes: [
        {
          suggestionId: 'sug-1',
          route: {
            title: 'Loop',
            stops: [{ spotId: 'a' }, { spotId: 'b' }],
          },
          reason: 'test',
          expiresAt: now,
        },
      ],
    });
    expect(result.routes[0].stops).toBe(2);
    expect(result.routes[0].spotIds).toEqual(['a', 'b']);
  });

  it('handles highestStatus as string', () => {
    const result = normalizeRouteSuggestions({
      savedSpots: [],
      routes: [
        {
          suggestionId: 'sug-1',
          route: { title: 'Loop', highestStatus: 'yellow' },
          reason: 'test',
          expiresAt: now,
        },
      ],
    });
    expect(result.routes[0].highestStatus).toBe('yellow');
  });

  it('handles highestStatus as object with level', () => {
    const result = normalizeRouteSuggestions({
      savedSpots: [],
      routes: [
        {
          suggestionId: 'sug-1',
          route: { title: 'Loop', highestStatus: { level: 'red' } },
          reason: 'test',
          expiresAt: now,
        },
      ],
    });
    expect(result.routes[0].highestStatus).toBe('red');
  });

  it('returns unknown for invalid highestStatus', () => {
    const result = normalizeRouteSuggestions({
      savedSpots: [],
      routes: [
        {
          suggestionId: 'sug-1',
          route: { title: 'Loop', highestStatus: 'purple' },
          reason: 'test',
          expiresAt: now,
        },
      ],
    });
    expect(result.routes[0].highestStatus).toBe('unknown');
  });
});

describe('normalizeSpotContext', () => {
  it('normalizes a spot context response', () => {
    const result = normalizeSpotContext({
      spot: rawSpot(),
      primaryAction: 'Add to route',
      secondaryAction: 'Save',
      sourceSummary: 'Live',
    });
    expect(result.spot.id).toBe('geysir');
    expect(result.primaryAction).toBe('Add to route');
  });
});

describe('normalizeInsertPreview', () => {
  it('normalizes an insert preview response', () => {
    const result = normalizeInsertPreview({
      spot: rawSpot(),
      recommendedAfterStopId: 's1',
      recommendedBeforeStopId: 's2',
      addedDriveMinutes: 10,
      statusImpact: 'green',
      daylightImpact: 'ample',
      warnings: ['Narrow road'],
    });
    expect(result.addedDriveMinutes).toBe(10);
    expect(result.daylightImpact).toBe('ample');
    expect(result.warnings).toEqual(['Narrow road']);
  });
});

describe('normalizeRouteMutation', () => {
  it('wraps a today response', () => {
    const result = normalizeRouteMutation({
      today: { title: 'Loop', dateLabel: 'Today', stops: [] },
    });
    expect(result.today.title).toBe('Loop');
  });
});

describe('normalizePlanSpot', () => {
  it('normalizes a plan spot response', () => {
    const result = normalizePlanSpot({
      trip: { title: 'Trip', vehicle: 'car_2wd', hub: {}, days: [] },
      message: 'Planned.',
    });
    expect(result.trip.title).toBe('Trip');
    expect(result.message).toBe('Planned.');
  });
});

describe('normalizeSaveSpot', () => {
  it('normalizes a save spot response', () => {
    const result = normalizeSaveSpot({
      spot: rawSpot(),
      savedSpotIds: ['geysir'],
      message: 'Saved.',
    });
    expect(result.spot.id).toBe('geysir');
    expect(result.savedSpotIds).toEqual(['geysir']);
    expect(result.message).toBe('Saved.');
  });
});

describe('normalizeMe', () => {
  it('normalizes a full me response', () => {
    const result = normalizeMe({
      user: { id: 'u1', displayName: 'Lukas', initials: 'LK', email: 'l@x.io', joinedAt: now },
      subscription: { plan: 'premium', trialAvailable: false, headline: 'Pro', subcopy: 'Full' },
      preferences: { locale: 'en', units: 'metric', temperatureUnit: 'C', currency: 'EUR' },
      safety: { pushAlertsTomorrowRoute: true, notifyStatusWorsensEnRoute: false, emergencyContactsCount: 2 },
      offline: { cachedMapAreaLabel: 'South', cachedTodayRouteStops: 4, lastSyncedAt: now },
    });
    expect(result.user.id).toBe('u1');
    expect(result.subscription.plan).toBe('premium');
    expect(result.preferences.locale).toBe('en');
    expect(result.safety.emergencyContactsCount).toBe(2);
    expect(result.offline.cachedTodayRouteStops).toBe(4);
  });

  it('handles null/missing fields with defaults', () => {
    const result = normalizeMe({});
    expect(result.user.id).toBe('');
    expect(result.preferences.locale).toBe('en');
    expect(result.offline.cachedMapAreaLabel).toBeUndefined();
  });
});

describe('normalizePlacesSearch', () => {
  it('normalizes places from "places" key', () => {
    const result = normalizePlacesSearch({
      places: [{ id: 'p1', name: 'Place', type: 'city', location: { lat: 64, lon: -21 } }],
      pageInfo: { hasMore: false },
    });
    expect(result.places).toHaveLength(1);
    expect(result.places[0].id).toBe('p1');
  });

  it('falls back to "suggestions" key', () => {
    const result = normalizePlacesSearch({
      suggestions: [{ id: 'p1', name: 'Place' }],
    });
    expect(result.places).toHaveLength(1);
  });
});

describe('normalizeHotelsSearch', () => {
  it('normalizes hotels', () => {
    const result = normalizeHotelsSearch({
      hotels: [{ id: 'h1', name: 'Hotel', stars: 4, bookingState: 'not_booked' }],
    });
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0].type).toBe('hotel');
    expect(result.hotels[0].stars).toBe(4);
  });

  it('falls back to "suggestions" key', () => {
    const result = normalizeHotelsSearch({
      suggestions: [{ id: 'h1', name: 'Hotel' }],
    });
    expect(result.hotels).toHaveLength(1);
  });
});

describe('normalizePlace', () => {
  it('normalizes a place suggestion', () => {
    const result = normalizePlace({ id: 'p1', name: 'City', region: 'North', type: 'city', location: { lat: 65, lon: -18 } });
    expect(result.id).toBe('p1');
    expect(result.type).toBe('city');
  });
});

describe('normalizeHotel', () => {
  it('normalizes a hotel with hero image', () => {
    const result = normalizeHotel({
      id: 'h1',
      name: 'Grand Hotel',
      heroImage: 'https://img.jpg',
      stars: 5,
      bookingState: 'booked',
      media: [{ id: 'm1', url: 'https://other.jpg' }],
    });
    expect(result.type).toBe('hotel');
    expect(result.stars).toBe(5);
    expect(result.media).toHaveLength(2);
    expect(result.media?.[0].url).toBe('https://img.jpg');
  });
});

describe('normalizeOfflineCacheRegion', () => {
  it('normalizes an offline cache region response', () => {
    const result = normalizeOfflineCacheRegion({
      cacheJobId: 'job-1',
      state: 'running',
      label: 'South',
      message: 'Caching...',
    });
    expect(result.state).toBe('running');
    expect(result.cacheJobId).toBe('job-1');
  });
});

describe('normalizePreferenceUpdate', () => {
  it('normalizes a preference update response', () => {
    const result = normalizePreferenceUpdate({
      preferences: { locale: 'de', units: 'metric', temperatureUnit: 'C', currency: 'EUR' },
      safety: { pushAlertsTomorrowRoute: false, notifyStatusWorsensEnRoute: true, emergencyContactsCount: 1 },
    });
    expect(result.preferences.locale).toBe('de');
    expect(result.safety.emergencyContactsCount).toBe(1);
  });
});

describe('normalizeAuthResponse', () => {
  it('normalizes an auth response', () => {
    const result = normalizeAuthResponse({
      accessToken: 'tok-123',
      user: { id: 'u1', displayName: 'Lukas', initials: 'LK', email: 'l@x.io' },
    });
    expect(result.accessToken).toBe('tok-123');
    expect(result.user.id).toBe('u1');
  });
});

describe('normalizeAttractionRoute', () => {
  it('normalizes an attraction route summary', () => {
    const result = normalizeAttractionRoute({
      id: 'r1',
      title: 'Loop',
      spotIds: ['a', 'b'],
      driveMinutes: 90,
      distanceKm: 50,
      highestStatus: 'green',
    });
    expect(result.id).toBe('r1');
    expect(result.spotIds).toEqual(['a', 'b']);
    expect(result.stops).toBe(2);
    expect(result.summary).toBe('2 stops');
  });

  it('extracts spotIds from stops when spotIds is empty', () => {
    const result = normalizeAttractionRoute({
      id: 'r1',
      title: 'Loop',
      stops: [{ spotId: 'a' }, { spotId: 'b' }],
    });
    expect(result.spotIds).toEqual(['a', 'b']);
  });

  it('handles highestStatus as object with level', () => {
    const result = normalizeAttractionRoute({
      id: 'r1',
      title: 'Loop',
      highestStatus: { level: 'red' },
    });
    expect(result.highestStatus).toBe('red');
  });
});

describe('normalizePlannedRouteMutation', () => {
  it('normalizes a planned route mutation', () => {
    const result = normalizePlannedRouteMutation({
      route: { id: 'r1', title: 'Loop', spotIds: ['a'], driveMinutes: 60, distanceKm: 30, highestStatus: 'green' },
      today: { title: 'Today', stops: [] },
      message: 'Created.',
    });
    expect(result.route.id).toBe('r1');
    expect(result.today?.title).toBe('Today');
    expect(result.message).toBe('Created.');
  });

  it('handles missing today', () => {
    const result = normalizePlannedRouteMutation({
      route: { id: 'r1', title: 'Loop' },
      message: 'Updated.',
    });
    expect(result.today).toBeUndefined();
  });
});
