# IslandHub API Conventions

Stand: 2026-05-29

Diese Regeln gelten fuer alle Endpoint-Specs in diesem Ordner, sofern ein Endpoint nicht ausdruecklich etwas Spezifischeres definiert.

## Auth und Nutzerkontext

- MVP ohne echtes Auth: Der Server verwendet einen festen Demo-Nutzer. Endpoints duerfen trotzdem bereits `401` dokumentieren, wenn sie spaeter Auth benoetigen.
- Spaeterer Auth-Vertrag: `Authorization: Bearer <token>`; daraus wird `userId` abgeleitet.
- `userId` wird nie als Query-, Path- oder Body-Parameter angenommen.
- Wenn Auth fehlt und kein Demo-Modus aktiv ist, antwortet der Server mit `401`.

## Trip-Kontext

- Trip-bezogene Endpoints loesen den Trip in dieser Reihenfolge auf:
  1. explizites `tripId` aus Query oder Body,
  2. aktiver Trip des angemeldeten Nutzers,
  3. Demo-Trip im Demo-Modus.
- Wenn mehrere aktive Kandidaten existieren und kein `tripId` uebergeben wurde, antwortet der Server mit `409` und Error-Code `trip_context_ambiguous`.
- Wenn kein Trip aufloesbar ist, antwortet der Server mit `404` und Error-Code `trip_not_found`.
- `tripId` bezeichnet immer einen Trip des aktuellen Nutzers; fremde Trips liefern `404`, nicht `403`, damit keine IDs geleakt werden.

## IDs und Referenzen

- `spotId`: stabile Attraction-/POI-ID.
- `placeId`: stabile Orts-ID aus `GET /api/places/search`; darf fuer Hubs, Hotels, Airports, Cities oder Custom Places stehen.
- `routeId`: persistierte geplante Route oder aktive Today-Route, nie eine rein berechnete Suggestion.
- `suggestionId`: fluechtige ID aus `GET /api/routes/suggestions`; nur fuer Suggestion-Start gueltig.
- `stopId`: eindeutige Stop-Instanz innerhalb einer Route. `stopId` ist nicht zwingend identisch mit `spotId`, weil derselbe Spot theoretisch in verschiedenen Routen vorkommen kann.
- Reservierte IDs muessen dokumentiert sein. Aktuell erlaubt nur `PATCH /api/routes/today/stops/{stopId}/done` den reservierten Wert `active`.

## PlaceRef und GeoPoint

- `GeoPoint` verwendet WGS84 mit `{ lat, lon }` in Dezimalgrad.
- `PlaceRef` verweist auf einen bekannten Ort. Wenn `PlaceRef.location` fehlt, loest der Server die Koordinate ueber `PlaceRef.id` auf.
- Wenn ein Request sowohl ID als auch Koordinate braucht, sollte `PlaceRef` genutzt werden; reine `GeoPoint`s sind fuer freie Custom-Orte.
- Wenn `PlaceRef.id` und `PlaceRef.location` widersprechen, ist die ID fuehrend und der Server darf `409` mit `place_location_mismatch` liefern.

## Datum, Zeit und Zeitzone

- Zeitpunkte sind ISO-8601 UTC-Strings, z. B. `2026-05-29T07:42:00Z`.
- Kalendertage sind lokale Trip-Tage im Format `YYYY-MM-DD`. Fuer Island ist die IANA-Zeitzone `Atlantic/Reykjavik` zu verwenden.
- Serverseitige Labels wie `dateLabel` oder `daylightLeftLabel` sind rein anzeigende Felder. Client-Logik muss strukturierte Felder wie `date`, `checkedAt`, `daylightLeftMinutes` verwenden.
- Relative Felder wie `recheckedMinutesAgo` sollten nur optional als Komfortfeld geliefert werden; absolute Zeitpunkte sind die Quelle der Wahrheit.

## Fehlerformat

Alle Fehlerantworten nutzen dieses Envelope:

```ts
interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}
```

- `400`: syntaktisch ungueltige Anfrage oder ungueltiger Parameterwert.
- `401`: nicht angemeldet.
- `404`: Ressource im aktuellen Nutzer-/Trip-Kontext nicht gefunden.
- `409`: Konflikt mit aktuellem Serverzustand, z. B. Version, aktive Route, mehrdeutiger Trip-Kontext oder doppelte Ressource.
- `422`: fachlich gueltige Anfrage, die wegen Produkt-/Safety-Regeln nicht ausgefuehrt werden darf.
- `429`: Rate Limit; Response enthaelt `Retry-After`.
- `503`: abhaengiger Dienst nicht verfuegbar; `details.staleCacheAvailable` kann true sein.

## Pagination

- Listen-Endpunkte, die mehr als eine Bildschirmseite liefern koennen, unterstuetzen `limit` und optional `cursor`.
- Default `limit`: 20, ausser Suchendpunkte dokumentieren explizit einen kleineren Default.
- Maximum `limit`: 50.
- Cursor-Responses verwenden:

```ts
interface PageInfo {
  nextCursor?: string;
  hasMore: boolean;
}
```

## Versionierung und Idempotenz

- Mutationen an Trip, geplanten Routen und Today-State geben eine `version` zurueck.
- Clients senden `expectedVersion`, sobald sie eine Version kennen. Bei Mismatch: `409` mit `version_conflict` und aktueller Version in `details.currentVersion`.
- Retry-faehige POST-Mutationen duerfen optional `Idempotency-Key` als Header akzeptieren. Ohne Key definieren die Endpoints ihre Idempotenz explizit.
- `POST /api/saved-spots` und `DELETE /api/saved-spots/{spotId}` sind idempotent.