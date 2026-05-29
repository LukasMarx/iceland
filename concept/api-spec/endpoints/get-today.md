# GET /api/today

Status: `exists-seed`

## Zweck

Liefert die aktive Tagesroute mit Fortschritt, Timeline, Fahrzeit, Tageslicht und aktueller Statusmeldung.

Ersetzt `seedToday` und den In-Memory-Demo-State.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Trip gemaess gemeinsamer Trip-Aufloesung. |
| `date` | ISO date | nein | Lokaler Trip-Tag, Default: heute im Trip-Kontext. |

## Response 200

```ts
type GetTodayResponse = TodayResponse;
```

## Business-Regeln

- Es gibt hoechstens eine aktive Tagesroute pro Trip und Datum.
- `RouteStop.state` darf nur eine aktive Station enthalten.
- Tageslicht und Statusupdate kommen aus Backend-Status-/Routing-Kontext.
- Leerer Today-State ist fuer MVP `404`; ein spaeterer Empty-State-Response muss einen eigenen Envelope bekommen, nicht `TodayResponse` mit implizit leeren Pflichtfeldern.

## Fehler

- `404`: keine aktive Route fuer heute. Frontend zeigt Empty State.
- `409`: Route existiert, ist aber stale und muss neu gecheckt werden.

## Entscheidungen

- Keine aktive Route fuer den Tag bleibt `404`, damit der Client gezielt den Today-Empty-State anzeigen kann.
