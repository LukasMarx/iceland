# POST /api/routes/suggestions/start

Status: `exists-seed`

## Zweck

Startet einen Routenvorschlag als aktive Tagesroute. Ersetzt lokale Fallback-Erzeugung in `todayRouteFromSuggestion`.

## Body

```ts
interface StartSuggestedRouteRequest {
  suggestionId: string;
  tripId?: string;
  date?: string;
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

- `suggestionId` stammt aus `GET /api/routes/suggestions` und ist keine persistierte `routeId`.
- Dieser Endpoint ist ein Kompatibilitaetsalias fuer `POST /api/routes/today` mit `suggestionId`.
- Starten erzeugt eine Today-Timeline mit Start, Stopps, Return und initialem Progress.
- Bei bestehender aktiver Route ist `replaceExisting: true` erforderlich.

## Fehler

- `404`: Vorschlag nicht mehr gueltig.
- `409`: aktive Route existiert ohne `replaceExisting`, Versionskonflikt oder Vorschlag ist stale.

## Entscheidungen

- Neue Clients sollen `POST /api/routes/today` nutzen. Dieser Endpoint darf fuer bestehende Seed-/Demo-Clients erhalten bleiben.
