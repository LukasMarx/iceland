# POST /api/routes/today/stops

Status: `exists-seed`

## Zweck

Fuegt einen Spot in die aktive Tagesroute ein und gibt die aktualisierte Today-Route zurueck. Ersetzt lokale Fallback-Mutation in `insertStop`.

## Body

```ts
interface AddRouteStopRequest {
  spotId: string;
  position: number | 'recommended' | 'end';
  tripId?: string;
  date?: string;
  allowUnsafe?: boolean;
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

- Backend verhindert doppelte Spot-Stopps in derselben Tagesroute; ein erneuter Insert desselben `spotId` liefert `409 spot_already_in_route`.
- Route wird nach Insert neu berechnet: Fahrzeit, Timeline-Meta, Statusupdate, Tageslicht.
- Bei `expectedVersion`-Konflikt gibt der Server `409` zurueck.
- Rote Spots duerfen nur eingefuegt werden, wenn Produktregeln das erlauben und `allowUnsafe: true` gesetzt ist; sonst `422 safety_rule_blocked`.

## Fehler

- `404`: aktive Tagesroute oder Spot nicht gefunden.
- `409`: Versionskonflikt oder Spot bereits vorhanden.
- `422`: Spot kann wegen Safety-Regel nicht eingefuegt werden, falls harte Blockade konfiguriert ist.

## Entscheidungen

- Bewusstes Einfuegen roter Spots ist nur mit `allowUnsafe: true` erlaubt und muss im Backend als Audit Event protokolliert werden.
