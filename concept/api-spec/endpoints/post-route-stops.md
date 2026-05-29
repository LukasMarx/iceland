# POST /api/routes/{routeId}/stops

Status: `frontend-local`

## Zweck

Fuegt einen Spot zu einer geplanten Route hinzu. Ersetzt lokale `addSpotToRoute`-Berechnung aus dem Spot-Action Wizard.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `routeId` | string | ID der geplanten Route. |

## Body

```ts
interface AddPlannedRouteStopRequest {
  tripId?: string;
  spotId: string;
  position?: number | 'recommended' | 'end';
  allowUnsafe?: boolean;
  expectedVersion?: number;
}
```

## Response 200

```ts
interface AddPlannedRouteStopResponse {
  route: AttractionRouteSummary;
  today?: TodayResponse;
  addedDriveMinutes: number;
  addedDistanceKm: number;
  warnings: string[];
  message: string;
}
```

## Business-Regeln

- `recommended` nutzt Routing Engine fuer beste Insert-Position.
- Doppelte Spots liefern `409 spot_already_in_route`.
- Wenn Route im Today-State aktiv ist, muss der Endpunkt entweder Route und Today transaktional aktualisieren und `today` zurueckgeben oder `409 active_route_requires_today_endpoint` liefern.
- Rote Spots brauchen `allowUnsafe: true`, wenn Safety-Regeln kein hartes Verbot verlangen.

## Fehler

- `404`: Route oder Spot nicht gefunden.
- `409`: Versionskonflikt, aktive Route braucht Today-Endpoint oder Spot bereits vorhanden.
- `422`: Spot kann wegen Safety-Regel nicht eingefuegt werden.

## Entscheidungen

- Preview ist optional fuer UI-Vorschau; dieser Mutations-Endpunkt berechnet und liefert Einfuegekosten immer erneut serverseitig.
