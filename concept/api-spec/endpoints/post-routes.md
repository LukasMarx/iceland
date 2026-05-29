# POST /api/routes

Status: `frontend-local`

## Zweck

Persistiert eine neue geplante Route oder Direktroute. Ersetzt `createDirectRouteFromSpot`, `saveWizardDraftDay`-Vorbereitung und lokale Route-Erzeugung aus Explore/Spot Action.

## Body

```ts
interface CreateRouteRequest {
  tripId?: string;
  title?: string;
  date?: string;
  start: PlaceRef | GeoPoint;
  destination?: PlaceRef | GeoPoint;
  direction: 'ONE-WAY' | 'LOOP';
  spotIds: string[];
  source: 'wizard' | 'spot-action' | 'manual';
  makeActiveToday?: boolean;
  replaceExistingToday?: boolean;
  idempotencyKey?: string;
}
```

## Response 201

```ts
interface CreateRouteResponse {
  route: AttractionRouteSummary;
  today?: TodayResponse;
  trip?: TripSummary;
  message: string;
}
```

## Business-Regeln

- Backend berechnet Fahrzeit, Distanz, Status und Summary.
- `makeActiveToday` erzeugt zuerst eine geplante Route und startet sie danach ueber denselben Pfad wie `POST /api/routes/today`; sonst landet Route im Trip/Route-Pool.
- Existiert bereits eine aktive Today-Route, ist `replaceExistingToday: true` erforderlich.
- Direktroute ist `spotIds` mit einem Zielspot und `direction: 'LOOP'`.

## Fehler

- `400`: ungueltige Route.
- `404`: Spot/Trip/Place nicht gefunden.
- `409`: aktive Today-Route wuerde ohne `replaceExistingToday` ersetzt oder Versions-/Idempotenzkonflikt.

## Entscheidungen

- Response enthaelt immer `route`; `trip` wird mitgeliefert, wenn sich Trip-Sammlungen oder Tagesplaene sichtbar aendern. Bei `makeActiveToday` enthaelt die Response zusaetzlich `today`.
