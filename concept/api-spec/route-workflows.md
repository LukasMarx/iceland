# IslandHub Route Workflows

Stand: 2026-05-29

Diese Seite klaert, welcher Route-Endpoint fuer welchen UI-Flow verwendet wird.

## Grundregel

- `POST /api/routes/preview`: Nur rechnen, nie speichern.
- `POST /api/routes`: Persistierte geplante Route erzeugen.
- `PATCH /api/routes/{routeId}`: Persistierte geplante Route bearbeiten.
- `POST /api/routes/today`: Eine Route, einen Spot oder freie Wizard-Auswahl als aktive Tagesroute starten.
- `POST /api/routes/today/stops`: Stop in die aktive Tagesroute einfuegen.
- `POST /api/routes/{routeId}/stops`: Stop in eine geplante, nicht aktive Route einfuegen.

## Start einer aktiven Today-Route

`POST /api/routes/today` ist der kanonische Start-Endpunkt.

- Direkt aus Spot: `spotId`.
- Aus persistierter Route: `routeId`.
- Aus Suggestion: `suggestionId`.
- Aus Wizard ohne vorheriges Speichern: `start`, `destination`, `spotIds`, `direction`.

`POST /api/routes/suggestions/start` bleibt als Kompatibilitaetsalias fuer bestehende Seed-API erhalten und soll intern dieselbe Logik wie `POST /api/routes/today` mit `suggestionId` nutzen.

## Geplante Route speichern und optional starten

`POST /api/routes` erzeugt zuerst eine geplante Route. Wenn der Request `makeActiveToday: true` enthaelt, fuehrt der Server danach denselben Startpfad wie `POST /api/routes/today` aus und gibt zusaetzlich `today` zurueck.

Existiert bereits eine aktive Route fuer denselben Trip-Tag, antwortet der Server mit `409 active_today_route_exists`, ausser der Endpoint dokumentiert ein explizites `replaceExisting: true`.

## Aktive Route mutieren

Wenn eine geplante Route gleichzeitig die aktive Today-Route ist, muessen Mutations-Endpunkte konsistent bleiben:

- Entweder aktualisiert die Mutation Route und Today in einer Transaktion und gibt `today` zurueck.
- Oder sie lehnt die Mutation mit `409 active_route_requires_today_endpoint` ab.

Stille Teilupdates sind nicht erlaubt.

## Preview-Modi

`POST /api/routes/preview` nutzt diese Modi:

| Mode | Pflichtfelder | Zweck |
| --- | --- | --- |
| `return` | `start`, `spotIds` | Loop vom Start ueber Stops zurueck zum Start. |
| `one-way` | `start`, `destination`, `spotIds` | Route von Start zu Ziel ueber Stops. |
| `insert-spot` | `routeId`, `targetSpotId` | Insert-Kosten fuer bestehende Route berechnen. |
| `edit-route` | `routeId`, optional neue `start`/`destination`/`spotIds`/`direction` | Auswirkungen einer Route-Editor-Aenderung berechnen. |

## Stop-Identitaet

Routenoperationen verwenden `stopId`, wenn eine konkrete Stop-Instanz gemeint ist, und `spotId`, wenn ein Spot neu eingefuegt oder als Ziel referenziert wird.