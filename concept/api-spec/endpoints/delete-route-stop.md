# DELETE /api/routes/{routeId}/stops/{stopId}

Status: `frontend-local`

## Zweck

Entfernt einen Spot aus einer geplanten Route. Im UI existiert bereits eine `removeSpotFromSelectedRoute`-Mutation fuer Route Detail, aktuell lokal.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `routeId` | string | ID der geplanten Route. |
| `stopId` | string | Stop-Instanz, die entfernt werden soll. |

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Aktiver Trip. |
| `expectedVersion` | number | nein | Optimistic Locking. |

## Response 200

```ts
interface RemoveRouteStopResponse {
  route: AttractionRouteSummary;
  today?: TodayResponse;
  message: string;
}
```

## Business-Regeln

- Backend berechnet Stops, Fahrzeit, Distanz und Status neu.
- Entfernen des letzten Stops liefert `422 last_stop_required`; leere Routen werden im MVP nicht gespeichert.
- Wenn Route im Today-State aktiv ist, muss der Endpunkt entweder Route und Today transaktional aktualisieren und `today` zurueckgeben oder `409 active_route_requires_today_endpoint` liefern.

## Fehler

- `404`: Route oder Stop nicht gefunden.
- `409`: Versionskonflikt oder aktive Route braucht Today-Endpoint.
- `422`: letzter Stop darf nicht entfernt werden.

## Entscheidungen

- Unsave eines Spots bereinigt Routen nicht automatisch. Saved-Status und Routenplanung bleiben entkoppelt.
