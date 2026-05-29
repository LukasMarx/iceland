# GET /api/hotels/search

Status: `frontend-local`

## Zweck

Liefert Hotel-/Overnight-Ziele fuer Add-Route Step 3. Ersetzt `WIZARD_HOTELS` und feste Hotelmarker.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Aktiver Trip-Kontext. |
| `nearLat` | number | nein | Startpunkt fuer Distanzberechnung. |
| `nearLon` | number | nein | Startpunkt fuer Distanzberechnung. |
| `region` | string | nein | Region-Filter. |
| `q` | string | nein | Suchtext. |
| `limit` | number | nein | Default 20, max. 50. |

## Response 200

```ts
interface HotelsSearchResponse {
  hotels: HotelSuggestion[];
}

interface HotelSuggestion {
  id: string;
  name: string;
  region: string;
  distanceKm?: number;
  stars?: number;
  location: GeoPoint;
  media?: MediaAsset[];
  bookingState?: 'not_booked' | 'booked' | 'unknown';
}
```

## Business-Regeln

- Distanz bezieht sich auf Startpunkt oder aktiven Hub.
- Hotels koennen spaeter aus eigener DB, Affiliate-Partnern oder User-Hotels kommen.
- `bookingState` darf fuer MVP `unknown` sein.
- Hotel-Ergebnisse koennen als `PlaceRef` mit `type: 'hotel'` in Routen- und Onboarding-Requests verwendet werden.

## Fehler

- `400`: ungueltige Koordinaten.

## Entscheidungen

- MVP liefert Overnight-Ziele und gespeicherte/User-Hotels, aber keine buchbaren Live-Angebote.
