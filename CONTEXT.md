# IslandHub Domain Vocabulary

Canonical definitions for the core domain concepts used across the codebase. Prefer these terms in all code, tests, documentation, and issue titles.

## Core Entities

### Spot
A point of interest in Iceland — a waterfall, crater, geyser, etc. Each Spot has a location (lat/lon), a current safety status snapshot, and metadata such as category, region, and drive time from the active hub.

### Hub
The traveler's base of operations — a hotel or guesthouse serving as the center of daily reach calculations. Every day's drive times and distances are calculated relative to the Hub.

### Trip
A multi-day itinerary anchored to a Hub. A Trip contains ordered TripDays, may include unplaced routes, and tracks planning state (draft → planned → active → completed).

### TripDay
A single day within a Trip. Each TripDay may contain a planned route and/or sleep/accommodation information.

### Route
A sequence of RouteStops forming a driving itinerary. Routes have a direction (ONE-WAY or LOOP) and a safety profile derived from the status of their stops.

### RouteStop
A single waypoint on a route. Each stop references a Spot (by spotId), records drive time from the previous stop, stay duration, and its current state (start → active → done → open → return).

### RouteSuggestion
A clean, normalized route proposal returned by the suggestion engine. Contains singular field shapes: `stops: number`, `highestStatus: SafetyStatus`. Raw API union shapes are handled internally by `normalizeRouteSuggestion()`.

## Safety

### SafetyStatus
The four-tier safety classification: `'green'` (Open), `'yellow'` (Caution), `'red'` (Closed), `'unknown'` (No data).

### SpotStatusSnapshot
A point-in-time safety assessment of a Spot, including road status, weather status, vehicle compatibility, source attribution, and validity window.

### Safety Ranking
`statusRank` maps SafetyStatus to a numeric order: green (0) < yellow (1) < unknown (2) < red (3). `sortBySafetyThenDrive` uses this to sort Spots by safety, breaking ties by drive time.

## Geography

### GeoPoint
A latitude/longitude pair representing a geographic coordinate.

### MapPoint
A GeoPoint projected onto a bounded Iceland canvas, adding canvas coordinates (x, y). Produced by `projectIcelandPoint`.

## Routing

### DrivingPath
A road-network path between two GeoPoints, carrying an ordered coordinate array (the geometry to draw on the map), a drive-time estimate, a distance, and a warnings list. Distinct from the itinerary **Route** — a DrivingPath is a single origin→destination leg, not a sequence of stops. Multiple DrivingPaths can be stitched together to power a Route's stop-to-stop legs. In the interim, DrivingPaths are computed by an external routing provider (OpenRouteService) behind a swappable `RoutingProvider` adapter; F-road/4WD/closure awareness is deferred to the Valhalla phase and surfaces via the `warnings` field without changing the contract.

## Locale

### LocaleCode
Supported language codes: `'en'` (English), `'de'` (German), `'is'` (Icelandic).

### I18nService
Angular injectable that holds the current locale signal and provides template interpolation via `t(key, params)`.

## Package Structure

All types and runtime utilities live in `@islandhub/domain`, organized into focused modules:

| Module | Exports |
|--------|---------|
| `types.ts` | Domain types + API request/response types |
| `safety.ts` | SafetyStatus, statusRank, sortBySafetyThenDrive |
| `map.ts` | GeoPoint, MapPoint, projectIcelandPoint |
| `locale.ts` | LocaleCode, localeNames, appCopy, I18nService |

The barrel `src/index.ts` re-exports everything. Raw API union types (e.g. `RawRouteSuggestion`) are exported for use by API normalization layers but should be consumed via `normalizeRouteSuggestion()`.
