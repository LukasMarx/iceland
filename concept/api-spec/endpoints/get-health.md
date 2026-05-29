# GET /api/health

Status: `exists-seed`

## Zweck

Prueft, ob die API erreichbar ist und in welchem Datenmodus sie laeuft. Das Frontend nutzt diesen Call beim App-Start, bevor Explore, Today und Trip geladen werden.

## Request

Keine Parameter.

## Response 200

```ts
interface HealthResponse {
  status: 'ok';
  service: 'islandhub-api';
  mode: 'seed' | 'local-db' | 'production';
  version: string;
  checkedAt: string; // ISO-8601 UTC
  features?: Record<string, boolean>;
  dependencies?: Record<string, 'ok' | 'degraded' | 'down'>;
}
```

## Fehler

- Netzwerkfehler: Frontend darf in `seed-fallback` gehen.
- `503`: API laeuft, aber Kernsysteme wie DB/Redis sind nicht bereit.

## Entscheidungen

- `mode` beschreibt nur den Datenmodus. Optionale `features` und `dependencies` tragen Feature Flags und Datenquellenstatus.
- Fuer MVP reicht dieser Health-Endpunkt fuer den Client. Separates Monitoring-Readiness kann ausserhalb des Mobile-Vertrags entstehen.
