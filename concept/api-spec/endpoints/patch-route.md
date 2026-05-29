# PATCH /api/routes/{routeId}

Status: `frontend-local`

## Zweck

Aktualisiert eine bestehende Route aus dem Route-Editor/Wizard. Ersetzt lokale `updateRouteFromSpotIds`-Mutation.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `routeId` | string | ID der geplanten Route. |

## Body

```ts
interface UpdateRouteRequest {
  tripId?: string;
  title?: string;
  start?: PlaceRef | GeoPoint;
  destination?: PlaceRef | GeoPoint;
  spotIds?: string[];
  direction?: 'ONE-WAY' | 'LOOP';
  expectedVersion?: number;
}
```

Mindestens eines der optionalen fachlichen Felder (`title`, `start`, `destination`, `spotIds`, `direction`) muss gesetzt sein.

## Response 200

```ts
interface UpdateRouteResponse {
  route: AttractionRouteSummary;
  trip?: TripSummary;
  today?: TodayResponse;
  message: string;
}
```

## Business-Regeln

- Backend berechnet alle abhaengigen Felder neu.
- Wenn die Route aktive Today-Route ist, muss `today` ebenfalls aktualisiert oder `409 active_route_requires_today_endpoint` geliefert werden.
- `expectedVersion` schuetzt vor parallelen Aenderungen.
- Stille Teilupdates zwischen Route- und Today-State sind nicht erlaubt.

## Fehler

- `404`: Route nicht gefunden.
- `409`: Versionskonflikt oder aktive Route kann nicht still aktualisiert werden.

## Entscheidungen

- Geplante Route und aktive Today-Route bleiben vorerst ein gemeinsames Modell mit transaktionaler Synchronisierung gemaess [Route Workflows](../route-workflows.md).
