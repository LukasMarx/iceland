# POST /api/onboarding

Status: `frontend-local`

## Zweck

Schliesst das Setup ab und erzeugt den ersten nutzbaren Trip mit Sprache, Planungsphase, Reisedaten, Fahrzeug und Hub. Ersetzt `setupDone` im lokalen Speicher und die festen Setup-Screens.

## Body

```ts
interface CompleteOnboardingRequest {
  locale: 'en' | 'de' | 'is';
  planningPhase: 'ideas' | 'fixed_hub' | 'roadtrip';
  dateRange: {
    startsOn: string;
    endsOn: string;
  };
  vehicle: 'car_2wd' | 'car_4wd' | 'unknown';
  hub?: PlaceRef;
}
```

## Response 201

```ts
interface CompleteOnboardingResponse {
  user: {
    id: string;
    locale: string;
  };
  trip: TripSummary;
  explore: ExploreResponse;
}
```

## Business-Regeln

- Erstellung ist atomar: User/Preferences, Trip, Hub und initiale TripDays werden zusammen angelegt.
- Fuer `fixed_hub` ist `hub` Pflicht.
- `dateRange` erzeugt `totalDays`/`nights` und initiale leere TripDays.
- Wenn `hub.id` aus `GET /api/places/search` stammt, darf der Server Name und Koordinate aktualisieren. Freie Hubs verwenden `type: 'custom'` mit `location`.

## Fehler

- `400`: fehlende Pflichtfelder oder ungueltiger Zeitraum.
- `409`: Nutzer hat bereits Onboarding/aktiven Trip; Client muss bestaetigen oder anderen Flow waehlen.

## Entscheidungen

- Explore ohne Setup nutzt im MVP einen read-only Demo-Modus. Ein Gast-Trip wird erst durch Onboarding erzeugt.
