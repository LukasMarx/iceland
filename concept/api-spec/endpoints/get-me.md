# GET /api/me

Status: `frontend-local`

## Zweck

Liefert Nutzerprofil, Account-Settings, Subscription-Status, Safety-Einstellungen und Offline-Zusammenfassung fuer den Profile Tab. Ersetzt die statischen Daten `Lukas K.`, Premium-Box, Settings und Offline-Labels.

## Request

Keine Parameter. Auth oder Demo-Modus bestimmt den Nutzer gemaess [API Conventions](../conventions.md).

## Response 200

```ts
interface MeResponse {
  user: {
    id: string;
    displayName: string;
    initials: string;
    email: string;
    joinedAt: string;
  };
  subscription: {
    plan: 'free' | 'premium' | 'trial';
    trialAvailable: boolean;
    headline: string;
    subcopy: string;
  };
  preferences: UserPreferences;
  safety: {
    pushAlertsTomorrowRoute: boolean;
    notifyStatusWorsensEnRoute: boolean;
    emergencyContactsCount: number;
  };
  offline: {
    cachedMapAreaLabel?: string;
    cachedTodayRouteStops?: number;
    lastSyncedAt?: string;
  };
}
```

## Fehler

- `401`: nicht angemeldet.
- `404`: Nutzerprofil fehlt.

## Entscheidungen

- Im MVP darf `GET /api/me` im Demo-Modus ein Demo-Profil liefern. Sobald echtes Auth aktiv ist, fehlt ohne Token `401`.
