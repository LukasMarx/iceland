# PATCH /api/me/preferences

Status: `frontend-local`

## Zweck

Persistiert Profile-Settings wie Sprache, Einheiten, Waehrung, Safety-Pushes und Emergency-Contact-Einstellungen. Ersetzt statische Profile-Buttons ohne Datenfluss.

## Body

```ts
interface UpdatePreferencesRequest {
  locale?: 'en' | 'de' | 'is';
  units?: 'metric' | 'imperial';
  temperatureUnit?: 'C' | 'F';
  currency?: 'EUR' | 'ISK' | 'USD' | 'GBP';
  safety?: {
    pushAlertsTomorrowRoute?: boolean;
    notifyStatusWorsensEnRoute?: boolean;
  };
}
```

## Response 200

```ts
interface UpdatePreferencesResponse {
  preferences: UserPreferences;
  safety: {
    pushAlertsTomorrowRoute: boolean;
    notifyStatusWorsensEnRoute: boolean;
    emergencyContactsCount: number;
  };
  message: string;
}
```

## Business-Regeln

- Partial Update: nicht gesetzte Felder bleiben unveraendert.
- Locale beeinflusst statische Frontend-i18n und spaeter serverseitige Content-Lokalisierung.
- Emergency Contacts selbst sollten in einem spaeteren eigenen Endpunkt modelliert werden.
- Safety-Pushes bleiben im MVP Teil der Profile Preferences, weil sie im Profile Tab gemeinsam gepflegt werden.

## Fehler

- `400`: ungueltiger Wert.
- `401`: nicht angemeldet.

## Entscheidungen

- Ein eigener Notifications-Endpoint ist spaeter moeglich; MVP nutzt diesen Preferences-Endpoint fuer die sichtbaren Safety-Toggles.
