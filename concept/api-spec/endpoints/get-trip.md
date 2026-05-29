# GET /api/trip

Status: `exists-seed`

## Zweck

Liefert den aktiven Trip inklusive Gesamtstatus, Tagesplan, Hubs/Hotel-Informationen und unplatzierten Routen. Ersetzt `seedTrip`.

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Falls kein aktiver Trip aus Auth ableitbar ist. |

## Response 200

```ts
interface TripResponse {
  trip: TripSummary;
}
```

## Business-Regeln

- `TripSummary.days` ist die Quelle fuer Trip-Tab und Draft Days.
- `hotelsToBook`, `routesUsed` etc. duerfen als berechnete Felder kommen, muessen aber konsistent mit `days` und `unplacedRoutes` sein.
- `hub` ist im MVP der einzige aktive Hub des Trips. Multi-Hub wird spaeter als additive Erweiterung modelliert.

## Fehler

- `404`: kein Trip vorhanden. Frontend leitet zum Onboarding oder zeigt Empty State.

## Entscheidungen

- MVP nutzt `GET /api/trip` fuer den aktiven Trip. Multi-Trip-Unterstuetzung ergaenzt spaeter `GET /api/trips` und `GET /api/trips/{tripId}` ohne diesen Endpoint sofort zu entfernen.
