# IslandHub API Spec Draft

Stand: 2026-05-29

Diese Spezifikation ist ein erster, bewusst pragmatischer Vertrag zwischen Mobile-Frontend und Backend. Sie beschreibt die Endpunkte, die noetig sind, um die aktuell gemockten oder seed-basierten Stellen in der Mobile App schrittweise durch echte Backend-Daten zu ersetzen.

## Scope

- Basis ist die bestehende Angular Mobile App und die aktuelle NestJS Walking-Skeleton-API.
- Implementierung ist nicht Teil dieses Dokuments.
- Bestehende Response-Shapes aus `libs/api-contracts` werden respektiert, wo sie schon vorhanden sind.
- Neue Shapes sind als Vorschlag markiert und sollen vor Implementierung iteriert werden.
- Gemeinsame Regeln und Typen stehen in [API Conventions](./conventions.md), [Shared Types](./types.md) und [Route Workflows](./route-workflows.md). Endpoint-Dateien definieren nur Abweichungen oder endpoint-spezifische Felder.

## Status-Legende

- `exists-seed`: Endpunkt existiert, liefert aber Demo-/Seed-Daten oder In-Memory-State.
- `frontend-local`: Flow existiert nur im Frontend und braucht einen neuen Backend-Vertrag.
- `draft`: Noch nicht implementierter Vorschlag.

## Endpoint-Liste

### Bereits vorhandene Seed-API

- [GET /api/health](./endpoints/get-health.md)
- [GET /api/explore](./endpoints/get-explore.md)
- [GET /api/spots/{spotId}/context](./endpoints/get-spot-context.md)
- [POST /api/spots/{spotId}/status-refresh](./endpoints/post-spot-status-refresh.md)
- [GET /api/today](./endpoints/get-today.md)
- [POST /api/routes/today/insert-preview](./endpoints/post-routes-today-insert-preview.md)
- [POST /api/routes/today/stops](./endpoints/post-routes-today-stops.md)
- [POST /api/routes/today](./endpoints/post-routes-today.md)
- [PATCH /api/routes/today/stops/{stopId}/done](./endpoints/patch-routes-today-stops-done.md)
- [GET /api/routes/suggestions](./endpoints/get-routes-suggestions.md)
- [POST /api/routes/suggestions/start](./endpoints/post-routes-suggestions-start.md)
- [GET /api/saved-spots](./endpoints/get-saved-spots.md)
- [POST /api/saved-spots](./endpoints/post-saved-spots.md)
- [DELETE /api/saved-spots/{spotId}](./endpoints/delete-saved-spot.md)
- [GET /api/trip](./endpoints/get-trip.md)
- [POST /api/draft-days](./endpoints/post-draft-days.md)

### Neue Endpunkte fuer Frontend-only-Mocks

- [GET /api/me](./endpoints/get-me.md)
- [PATCH /api/me/preferences](./endpoints/patch-me-preferences.md)
- [POST /api/onboarding](./endpoints/post-onboarding.md)
- [GET /api/places/search](./endpoints/get-places-search.md)
- [GET /api/hotels/search](./endpoints/get-hotels-search.md)
- [POST /api/routes/preview](./endpoints/post-routes-preview.md)
- [POST /api/routes](./endpoints/post-routes.md)
- [PATCH /api/routes/{routeId}](./endpoints/patch-route.md)
- [POST /api/routes/{routeId}/stops](./endpoints/post-route-stops.md)
- [DELETE /api/routes/{routeId}/stops/{stopId}](./endpoints/delete-route-stop.md)
- [POST /api/offline/cache-regions](./endpoints/post-offline-cache-regions.md)
- [GET /api/offline/cache-jobs/{cacheJobId}](./endpoints/get-offline-cache-job.md)

## Gemeinsame Entscheidungen

- Auth, Trip-Aufloesung, Fehlerformat, Pagination, Zeitformate, ID-Konventionen und Optimistic Locking sind in [API Conventions](./conventions.md) verbindlich festgelegt.
- Gemeinsame DTOs wie `Spot`, `RouteStop`, `TripSummary`, `TodayResponse`, `AttractionRouteSummary`, `PlaceRef` und `GeoPoint` stehen in [Shared Types](./types.md).
- Route-Erstellung, Preview, Today-Start und Stop-Mutationen folgen [Route Workflows](./route-workflows.md).
