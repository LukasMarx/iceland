# POST /api/offline/cache-regions

Status: `frontend-local`

## Zweck

Plant oder aktualisiert Offline-Cache-Regionen fuer Karte, aktive Today-Route und Trip-Daten. Ersetzt statische Profile-Angaben wie `Reykholt - 60 km` und `4 stops`.

## Body

```ts
interface OfflineCacheRegionRequest {
  tripId?: string;
  mode: 'map-area' | 'today-route' | 'trip-core';
  center?: GeoPoint;
  radiusKm?: number;
  includeTodayRoute?: boolean;
}
```

## Response 202

```ts
interface OfflineCacheRegionResponse {
  cacheJobId: string;
  label: string;
  estimatedBytes?: number;
  includes: Array<'map' | 'today-route' | 'trip' | 'saved-spots' | 'status-snapshots'>;
  message: string;
}
```

## Business-Regeln

- Der Endpunkt plant serverseitig, welche Daten offline relevant sind; Map-Tiles koennen clientseitig ueber Capacitor/Map SDK laufen.
- Response darf `202` sein, weil Cache-Aufbereitung asynchron sein kann.
- Fortschritt wird ueber `GET /api/offline/cache-jobs/{cacheJobId}` abgefragt.
- Profile zeigt nach Abschluss ueber `GET /api/me` den aktuellen Offline-Status an.

## Fehler

- `400`: fehlende Center/Radius-Angaben fuer `map-area`.
- `404`: Trip oder Today-Route nicht gefunden.
- `413`: angeforderter Cache zu gross.

## Entscheidungen

- Ein Job-Status-Endpoint ist Teil des MVP-Vertrags, weil `202` ohne Polling-Ziel fuer die Mobile App nicht nutzbar ist.
