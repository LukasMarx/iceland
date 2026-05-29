# GET /api/explore

Status: `exists-seed`

## Zweck

Liefert die taegliche Entscheidungsflaeche rund um den aktiven Hub: Hub, Datum, Fahrzeugprofil, Datenalter, Spots mit Status und Smart Routes.

Ersetzt aktuell `seedExplore`, `seedSpots`, lokale Filterlogik und feste Header-/Map-Daten.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `status` | comma-separated `green,yellow,red,unknown` | nein | Statusfilter. Leer bedeutet alle. |
| `category` | comma-separated string | nein | Kategorie-IDs aus `CategoryOption.id`. |
| `vehicle` | `car_2wd`, `car_4wd`, `unknown`, `any` | nein | Fahrzeugprofil fuer F-Road- und Statuslogik. |
| `showFRoads` | boolean | nein | Ob F-Road-Ziele fuer 2WD sichtbar bleiben. |
| `maxDriveMinutes` | number | nein | Max. einfache Fahrzeit ab Hub. |
| `tripId` | string | nein | Trip gemaess gemeinsamer Trip-Aufloesung. |
| `date` | ISO date | nein | Lokaler Trip-Tag, Default: heute im Trip-Kontext. |
| `limit` | number | nein | Default 20, max. 50. |
| `cursor` | string | nein | Cursor fuer weitere Spots. |

## Response 200

```ts
interface ExploreResponse {
  hub: Hub;
  dateLabel: string;
  vehicle: VehicleProfile;
  dataAgeMinutes: number;
  spots: Spot[];
  smartRoutes: SmartRoute[];
  categories?: CategoryOption[];
  pageInfo: PageInfo;
  map?: {
    center: GeoPoint;
    zoomHint: number;
  };
}
```

## Business-Regeln

- Safety-Status wird serverseitig berechnet und darf nicht im Client rekonstruiert werden.
- Sortierung: `green`, `yellow`, `unknown`, `red`; danach Fahrzeit ab Hub, sofern keine andere Sortierung vereinbart wird.
- `Spot.status.sourceTimestamps` muss offizielle Quellen und Alter gemaess Shared Types abbilden.
- Medienfelder kommen ueber `Spot.media`; `spot-images.ts` ist damit nur noch Seed-/Fallback-Datenquelle.

## Fehler

- `400`: ungueltiger Filterwert.
- `404`: kein aktiver Trip/Hub vorhanden.
- `503`: Statusdaten nicht berechenbar; Response sollte optional stale Cache erlauben.

## Entscheidungen

- Kategorien sind IDs mit UI-Labeln in `categories`.
- Explore liefert Spots und kompakte `smartRoutes`; detaillierte Routenvorschlaege bleiben in `GET /api/routes/suggestions`.
