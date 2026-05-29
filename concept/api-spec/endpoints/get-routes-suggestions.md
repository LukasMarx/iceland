# GET /api/routes/suggestions

Status: `exists-seed`

## Zweck

Liefert Routenvorschlaege aus gespeicherten Spots und aktuellem Tages-/Trip-Kontext. Ersetzt `seedRouteSuggestions` und `localRouteSuggestions`.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Trip gemaess gemeinsamer Trip-Aufloesung. |
| `date` | ISO date | nein | Lokaler Trip-Tag fuer Bewertung. |
| `limit` | number | nein | Default 20, max. 50. |
| `cursor` | string | nein | Cursor fuer weitere Vorschlaege. |

## Response 200

```ts
interface RouteSuggestionsResponse {
  savedSpots: Spot[];
  routes: RouteSuggestion[];
  pageInfo: PageInfo;
}

interface RouteSuggestion {
  suggestionId: string;
  route: AttractionRouteSummary;
  reason: string;
  expiresAt: string;
}
```

## Business-Regeln

- Vorschlaege basieren auf gespeicherten Spots, Hub, Fahrzeug, Tageslicht, Status und Routing.
- Wenn keine Saved Spots existieren, ist `routes: []` gueltig.
- `reason` soll UI-freundlich erklaeren, warum der Vorschlag passt.
- `suggestionId` ist fluechtig und darf nur zum Starten einer Today-Route genutzt werden; persistierte Routen entstehen erst ueber `POST /api/routes` oder `POST /api/routes/today`.

## Fehler

- `404`: Trip/Hub nicht gefunden.
- `503`: Routing Engine nicht verfuegbar; optional mit gecachtem Vorschlag antworten.

## Entscheidungen

- Vorschlaege bleiben berechnete Empfehlungen. Persistenz entsteht erst durch explizites Speichern oder Starten.
