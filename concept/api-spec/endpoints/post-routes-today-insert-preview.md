# POST /api/routes/today/insert-preview

Status: `exists-seed`

## Zweck

Berechnet, wo und mit welchem Effekt ein Spot in die aktive Tagesroute eingefuegt wuerde. Ersetzt `fallbackInsertPreview` und feste UI-Texte wie `between Geysir and Gullfoss`.

## Body

```ts
interface InsertPreviewRequest {
  spotId: string;
  tripId?: string;
  date?: string;
  positionMode?: 'recommended' | 'end';
}
```

## Response 200

```ts
interface InsertPreviewResponse {
  spot: Spot;
  recommendedAfterStopId?: string;
  recommendedBeforeStopId?: string;
  addedDriveMinutes: number;
  addedDistanceKm: number;
  statusImpact: string;
  daylightImpact: 'ample' | 'tight' | 'unknown';
  warnings: string[];
  previewStops?: RouteStop[];
}
```

## Business-Regeln

- Preview ist unverbindlich und mutiert keine Route.
- Empfehlung basiert auf Routing Engine, Oeffnungs-/Sicherheitsstatus und Tageslicht.
- `previewStops` erlaubt dem Frontend, die Insert-Vorschau ohne harte Stop-Namen zu rendern.
- `recommendedAfterStopId` und `recommendedBeforeStopId` sind Stop-Instanz-IDs. Bei Insert am Anfang oder Ende darf jeweils eines der Felder fehlen.

## Fehler

- `404`: Spot oder aktive Tagesroute nicht gefunden.
- `409`: Spot ist bereits Teil der Route.

## Entscheidungen

- MVP liefert genau eine Empfehlung. Mehrere Optionen koennen spaeter als `options[]` ergaenzt werden.
