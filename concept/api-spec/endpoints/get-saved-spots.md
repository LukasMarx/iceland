# GET /api/saved-spots

Status: `exists-seed`

## Zweck

Liefert gespeicherte Spots des Nutzers im aktiven Trip. Ersetzt harte `savedSpotIds` und In-Memory-Demo-State.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Trip gemaess gemeinsamer Trip-Aufloesung. |
| `limit` | number | nein | Default 20, max. 50. |
| `cursor` | string | nein | Cursor fuer weitere gespeicherte Spots. |

## Response 200

```ts
interface SavedSpotsResponse {
  savedSpotIds: string[];
  spots: Spot[];
  pageInfo: PageInfo;
}
```

## Business-Regeln

- Reihenfolge sollte die Speicherreihenfolge oder eine definierte Sortierung sein.
- Spot-Status wird im aktuellen Trip-Kontext geliefert, nicht als alter Save-Snapshot.
- Saved Spots sind trip-spezifisch. User-globale Favoriten waeren spaeter ein separater Scope.

## Fehler

- `404`: Trip nicht gefunden.

## Entscheidungen

- MVP speichert nur Spot-Zugehoerigkeit pro Trip. Notizen, Prioritaet und Bucket-Listen bleiben spaetere Erweiterungen.
