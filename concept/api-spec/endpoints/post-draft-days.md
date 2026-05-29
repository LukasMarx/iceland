# POST /api/draft-days

Status: `exists-seed`

## Zweck

Legt einen Spot oder eine Route als Draft Day im Trip ab. Ersetzt lokale Mutation in `planRouteSheetSpotForLater` und `addDraftDay`.

## Body

```ts
interface PlanSpotRequest {
  spotId?: string;
  routeId?: string;
  tripId?: string;
  title?: string;
  date?: string;
  idempotencyKey?: string;
}
```

## Response 200

```ts
interface PlanSpotResponse {
  trip: TripSummary;
  message: string;
}
```

## Business-Regeln

- Operation ist idempotent fuer denselben Spot/Route-Draft, wenn kein Datum angegeben ist.
- Server waehlt sinnvollen Draft-Slot oder haengt an `unplacedRoutes` an, wenn der Kalender voll ist.
- Bei `routeId` entsteht eine unplatzierte Route, wenn kein `date` angegeben ist; bei `spotId` entsteht ein Draft Day mit einer einfachen Route-Schale.
- Wenn `date` angegeben ist, wird der Draft auf genau diesen Trip-Tag gelegt, sofern dieser im Trip-Zeitraum liegt.

## Fehler

- `400`: weder `spotId` noch `routeId` angegeben.
- `404`: Spot, Route oder Trip nicht gefunden.
- `422`: Datum liegt ausserhalb des Trip-Zeitraums.

## Entscheidungen

- Fuer MVP bleibt `POST /api/draft-days`; spaeterer Multi-Trip-Ausbau kann einen REST-nahen Alias `POST /api/trips/{tripId}/draft-days` einfuehren.
