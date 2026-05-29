# PATCH /api/routes/today/stops/{stopId}/done

Status: `exists-seed`

## Zweck

Markiert den aktiven oder angegebenen Stop als erledigt und schiebt die Timeline weiter. Ersetzt lokale Fallback-Mutation in `markActiveStopDone`.

## Path

| Name | Typ | Beschreibung |
| --- | --- | --- |
| `stopId` | string | Stop-ID oder reserviert `active`, falls der aktive Stop erledigt werden soll. |

## Body

Optional:

```ts
interface MarkStopDoneRequest {
  tripId?: string;
  date?: string;
  completedAt?: string;
  undo?: boolean;
  expectedVersion?: number;
}
```

## Response 200

```ts
interface RouteMutationResponse {
  today: TodayResponse;
}
```

## Business-Regeln

- `stopId` ist eine Stop-Instanz-ID. Der reservierte Wert `active` markiert den aktuell aktiven Stop.
- Nur ein Stop darf danach `active` sein.
- Wenn kein naechster offener Stop existiert, zeigt `today.update` den Rueckweg/Abschluss.
- Completion sollte spaeter fuer Sync/Offline konfliktfaehig sein.
- `undo: true` setzt einen erledigten Stop wieder auf `active`, sofern dadurch keine zweite aktive Station entsteht.

## Fehler

- `404`: Stop oder aktive Tagesroute nicht gefunden.
- `409`: Stop ist nicht der erwartete aktive Stop oder Versionskonflikt.

## Entscheidungen

- Undo ist als `undo: true` im selben Endpoint modelliert, damit Offline-Sync denselben Konfliktpfad nutzen kann.
