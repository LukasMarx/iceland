# POST /api/spots/{spotId}/status-refresh

Status: `draft`

## Zweck

Fordert eine Aktualisierung des Status fuer einen Spot an. Der Unknown-/Stale-Flow im Frontend zeigt aktuell nur ein Sheet, hat aber keinen echten Refresh.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `spotId` | string | ID des Spots. |

## Body

```ts
interface SpotStatusRefreshRequest {
  tripId?: string;
  date?: string;
  force?: boolean;
}
```

## Response 200

```ts
interface SpotStatusRefreshResponse {
  spot: Spot;
  refreshed: boolean;
  message: string;
  sourceTimestamps: SourceTimestamp[];
}
```

## Response 202

```ts
interface SpotStatusRefreshJobResponse {
  refreshJobId: string;
  state: 'queued' | 'running';
  message: string;
}
```

## Business-Regeln

- Wenn offizielle Quellen noch im Cache-Fenster liegen, darf `refreshed` false sein und der letzte Snapshot zurueckkommen.
- Synchroner MVP: Wenn alle benoetigten Quellen innerhalb von 2 Sekunden antworten, liefert der Server `200`.
- Asynchroner Pfad: Wenn externe Quellen laenger brauchen, liefert der Server `202` mit `refreshJobId`; Status kann spaeter ueber einen eigenen Job-Endpoint ergaenzt werden.
- Rate Limit gilt pro Nutzer und Spot; bei `429` wird `Retry-After` gesetzt.

## Fehler

- `404`: Spot nicht gefunden.
- `429`: Refresh zu haeufig angefordert.
- `503`: externe Quelle nicht erreichbar.

## Entscheidungen

- MVP unterstuetzt synchronen Refresh plus `202` als Fallback. Ein sichtbarer Refresh-Job-Status ist erst noetig, wenn der asynchrone Pfad produktiv genutzt wird.
