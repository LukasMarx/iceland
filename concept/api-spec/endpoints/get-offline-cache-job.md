# GET /api/offline/cache-jobs/{cacheJobId}

Status: `frontend-local`

## Zweck

Liefert Fortschritt und Ergebnis eines Offline-Cache-Jobs, der mit `POST /api/offline/cache-regions` gestartet wurde.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `cacheJobId` | string | ID aus der `POST /api/offline/cache-regions` Response. |

## Response 200

```ts
interface OfflineCacheJobResponse {
  cacheJobId: string;
  state: 'queued' | 'running' | 'completed' | 'failed';
  progressPercent: number;
  label: string;
  estimatedBytes?: number;
  completedAt?: string; // ISO-8601 UTC
  error?: {
    code: string;
    message: string;
  };
}
```

## Business-Regeln

- `progressPercent` liegt zwischen 0 und 100.
- Nach `completed` aktualisiert `GET /api/me` die Offline-Zusammenfassung.
- Map-Tile-Downloads duerfen weiterhin clientseitig laufen; dieser Job beschreibt serverseitig planbare API-/Statusdaten.

## Fehler

- `404`: Job nicht gefunden oder gehoert nicht zum aktuellen Nutzer.