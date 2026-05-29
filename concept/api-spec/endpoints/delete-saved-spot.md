# DELETE /api/saved-spots/{spotId}

Status: `frontend-local`

## Zweck

Entfernt einen gespeicherten Spot aus dem aktiven Trip. Schliesset den Save/Unsave-Vertrag zu `POST /api/saved-spots`.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `spotId` | string | Spot, der aus der Saved-Liste entfernt werden soll. |

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Aktiver Trip gemaess gemeinsamer Trip-Aufloesung. |

## Response 200

```ts
interface UnsaveSpotResponse {
  savedSpotIds: string[];
  message: string;
}
```

## Business-Regeln

- Operation ist idempotent: Wenn der Spot nicht gespeichert ist, bleibt die Saved-Liste unveraendert und der Server antwortet trotzdem `200`.
- Unsave veraendert geplante oder aktive Routen nicht automatisch. Routen bleiben bewusst vom Saved-Status entkoppelt.
- Spot-Status und Audit-Historie bleiben erhalten.

## Fehler

- `404`: Spot oder Trip nicht gefunden.