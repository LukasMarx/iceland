# GET /api/places/search

Status: `frontend-local`

## Zweck

Sucht Startpunkte, Hubs, Orte, Airports und Unterkuenfte fuer Onboarding und Add-Route Step 1. Ersetzt `WIZARD_BASES`, `KEFLAVIK_BASE`, `Current location` und readonly Suchfelder.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `q` | string | nein | Suchtext. Leer darf Vorschlaege liefern. |
| `type` | comma-separated | nein | `city,hotel,home,airport,custom`. |
| `lat` | number | nein | Nutzerposition fuer Naehe-Sortierung. |
| `lon` | number | nein | Nutzerposition fuer Naehe-Sortierung. |
| `limit` | number | nein | Default 10, max. 50. |

## Response 200

```ts
interface PlacesSearchResponse {
  places: PlaceSuggestion[];
}

interface PlaceSuggestion {
  id: string;
  name: string;
  region: string;
  type: 'city' | 'hotel' | 'home' | 'airport' | 'custom';
  location: GeoPoint;
  distanceKm?: number;
  source: 'database' | 'osm' | 'user-location' | 'seed';
}
```

## Business-Regeln

- Ohne Suchtext koennen kontextuelle Vorschlaege geliefert werden, z. B. aktive Hubs oder bekannte Orte.
- `Current location` sollte vom Client mit Device-Geolocation angefragt und optional als `custom` gespeichert werden.
- Ergebnisse muessen als `PlaceRef` nutzbar sein: `PlaceRef.id` entspricht `PlaceSuggestion.id`, `PlaceRef.type` entspricht `PlaceSuggestion.type`.

## Fehler

- `400`: ungueltige Koordinaten oder zu kurzer Suchtext, falls Mindestlaenge gilt.

## Entscheidungen

- MVP darf Seed-Orte und OSM-kompatible Ergebnisse mischen; `source` macht die Herkunft sichtbar, `id` bleibt stabil innerhalb der Quelle.
