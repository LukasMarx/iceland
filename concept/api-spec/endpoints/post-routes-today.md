# POST /api/routes/today

Status: `exists-seed`

## Zweck

Erzeugt oder ersetzt die aktive Tagesroute. Wird aktuell fuer `CreateTodayRouteRequest` aus einem Spot genutzt und sollte auch Wizard-Routen starten koennen.

## Body

```ts
interface CreateTodayRouteRequest {
  spotId?: string;
  routeId?: string;
  suggestionId?: string;
  tripId?: string;
  date?: string;
  start?: GeoPoint | PlaceRef;
  destination?: GeoPoint | PlaceRef;
  spotIds?: string[];
  direction?: 'ONE-WAY' | 'LOOP';
  replaceExisting?: boolean;
  expectedVersion?: number;
}
```

## Response 200

```ts
interface RouteMutationResponse {
  today: TodayResponse;
}
```

## Business-Regeln

- Dieser Endpoint ist der kanonische Start-Endpunkt fuer aktive Today-Routen, siehe [Route Workflows](../route-workflows.md).
- Fuer MVP reicht `spotId` fuer Out-and-back, `routeId` fuer persistierte Routen und `suggestionId` fuer berechnete Routenvorschlaege.
- Wizard-Fall sollte dieselbe Route Engine verwenden und nicht im Client rechnen.
- Ersetzen einer aktiven Route erfordert `replaceExisting: true`.
- `spotIds` meint Spot-IDs, nicht Stop-Instanz-IDs; Stop-IDs entstehen erst in der Today-Route.

## Fehler

- `400`: weder `spotId`, `routeId`, `suggestionId` noch vollstaendige Wizard-Route angegeben.
- `404`: referenzierte Ressource nicht gefunden.
- `409`: aktive Route existiert ohne `replaceExisting`, Versionskonflikt oder stale Suggestion.

## Entscheidungen

- `POST /api/routes/today` bleibt der breite Start-Endpunkt. `POST /api/routes/suggestions/start` ist nur ein Kompatibilitaetsalias.
