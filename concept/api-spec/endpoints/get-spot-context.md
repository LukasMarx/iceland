# GET /api/spots/{spotId}/context

Status: `exists-seed`

## Zweck

Liefert Detailkontext fuer einen Spot inklusive Statuserklaerung, Quellen, CTA-Labels und moeglicher Alternativen. Ersetzt `buildSpotContext` und statische Detail-Sheet-Varianten.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `spotId` | string | ID des Spots. |

## Query

| Name | Typ | Pflicht | Beschreibung |
| --- | --- | --- | --- |
| `tripId` | string | nein | Trip-Kontext fuer Hub, Fahrzeug und Datum. |
| `date` | ISO date | nein | Datum der Bewertung. |

## Response 200

```ts
interface SpotContextResponse {
  spot: Spot;
  primaryAction: SpotAction;
  secondaryAction?: SpotAction;
  sourceSummary: string;
  alternatives?: Spot[];
  media?: MediaAsset[];
}

interface SpotAction {
  code: 'add_to_today' | 'plan_later' | 'refresh_status' | 'show_alternatives' | 'open_route_preview';
  label: string;
  disabled?: boolean;
  reason?: string;
}
```

## Business-Regeln

- CTA-Entscheidung gehoert serverseitig an den berechneten Status: gruen/gelb kann zur Route, rot zeigt Alternativen, unknown bietet Refresh.
- Alternativen fuer rote Spots werden nach Safety-Status, Fahrzeit ab Hub und Kategorie-Aehnlichkeit sortiert; MVP liefert maximal 3 Alternativen.
- Quellenzusammenfassung muss kurz genug fuer das Sheet sein, Details bleiben in `spot.status.sourceTimestamps`.
- Frontend darf auf `SpotAction.code` reagieren; `label` ist ein lokalisierbares Anzeigenlabel.

## Fehler

- `404`: Spot existiert nicht oder ist fuer den aktiven Trip nicht sichtbar.
- `409`: Trip-Kontext unvollstaendig, z. B. kein Hub oder Fahrzeug.

## Entscheidungen

- Der Server liefert Action-Codes und Labels. Der Client nutzt Codes fuer Logik und darf Labels bei Bedarf lokal ueberschreiben.
