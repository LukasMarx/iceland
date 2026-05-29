# POST /api/routes/preview

Status: `frontend-local`

## Zweck

Berechnet eine unverbindliche Routenvorschau fuer Add-Route Wizard, Spot-Action Wizard und Route-Editor. Ersetzt lokale Kandidaten-Auswahl, Fahrzeit-Schaetzungen und Added-Km/Minutes-Berechnung.

## Body

```ts
interface RoutePreviewRequest {
  tripId?: string;
  date?: string;
  start: PlaceRef | GeoPoint;
  destination?: PlaceRef | GeoPoint;
  mode: 'return' | 'one-way' | 'insert-spot' | 'edit-route';
  routeId?: string;
  spotIds?: string[];
  targetSpotId?: string;
  vehicle?: VehicleProfile;
  maxCandidates?: number;
}
```

Pflichtfelder pro `mode` stehen in [Route Workflows](../route-workflows.md).

## Response 200

```ts
interface RoutePreviewResponse {
  title: string;
  directDriveMinutes: number;
  totalDriveMinutes: number;
  totalTripMinutes: number;
  distanceKm: number;
  highestStatus: SafetyStatus;
  recommendedStopIds: string[];
  candidateStops: Spot[];
  routeStops: RouteStop[];
  candidateRoutes?: Array<{
    routeId: string;
    addedDriveMinutes: number;
    addedDistanceKm: number;
    warnings: string[];
  }>;
  warnings: string[];
  daylightImpact: 'ample' | 'tight' | 'unknown';
}
```

## Business-Regeln

- Preview mutiert keine Route.
- Empfehlungen beruecksichtigen Routing-Korridor, Status, Besuchsdauer und Fahrzeugprofil.
- `insert-spot` liefert pro bestehender Zielroute Added-Km/Minutes in `candidateRoutes`, wenn mehrere Routen verglichen werden.
- `candidateRoutes` wird nur fuer `insert-spot` genutzt, wenn mehrere Zielrouten verglichen werden.

## Fehler

- `400`: unvollstaendige Start-/Zielangaben.
- `404`: Route oder Spot nicht gefunden.
- `503`: Routing Engine nicht verfuegbar.

## Entscheidungen

- Fuer MVP bleibt ein breiter Preview-Endpunkt, aber `mode` hat verbindliche Pflichtfelder gemaess [Route Workflows](../route-workflows.md).
