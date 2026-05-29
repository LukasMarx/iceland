# POST /api/saved-spots

Status: `exists-seed`

## Zweck

Speichert einen Spot fuer den aktiven Trip und liefert aktualisierte Saved-IDs. Ersetzt lokalen Save-Fallback.

## Body

```ts
interface SaveSpotRequest {
  spotId: string;
  tripId?: string;
}
```

## Response 200

```ts
interface SaveSpotResponse {
  spot: Spot;
  savedSpotIds: string[];
  message: string;
}
```

## Business-Regeln

- Operation ist idempotent: mehrfaches Speichern erzeugt keine Duplikate.
- Bei roten/unsicheren Spots sollte ein Audit Event entstehen, aber Save bleibt erlaubt, solange Produktentscheidung nichts anderes sagt.
- Saved Spots sind trip-spezifisch; der aktive Trip wird gemaess gemeinsamer Trip-Aufloesung bestimmt.
- Entfernen erfolgt ueber `DELETE /api/saved-spots/{spotId}`.

## Fehler

- `404`: Spot oder Trip nicht gefunden.
- `409`: Spot ist fuer diesen Trip nicht zulaessig, falls spaeter Regeln greifen.

## Entscheidungen

- Unsave ist als eigener idempotenter Endpoint spezifiziert.
