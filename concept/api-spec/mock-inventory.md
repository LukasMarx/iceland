# Mock-Daten Inventar

Stand: 2026-05-29

Ziel: Alle Stellen festhalten, an denen die Mobile App aktuell Seed-, Demo- oder rein lokale Daten nutzt. Daraus leitet sich die Endpoint-Spezifikation in `concept/api-spec/endpoints` ab.

## 1. Globale Seed-Daten im Frontend

Quelle: `apps/mobile/src/app/seed-data.ts`

- `seedSpots`: feste Spot-Liste mit Geysir, Gullfoss, Seljalandsfoss, Bruarfoss, Thingvellir, Kerid, Kerlingarfjoll, Thorsmork.
- `seedExplore`: fester Hub `Reykholt Cabin`, Datum `Today, Thu 14 May`, Fahrzeug `car_2wd`, Datenalter und Smart Routes.
- `seedRouteSuggestions`: drei feste Routenvorschlaege mit festen Stopps, Fahrzeiten, Gruenden und Distanzwerten.
- `seedToday`: aktive Tagesroute `Wind-light loop` inklusive Timeline, Fortschritt, Fahrzeit, Tageslicht und Statusmeldung.
- `seedTrip`: kompletter Trip `Iceland spring run` mit Reisedaten, Tagesplan, Hotels, unplatzierten Routen und Kennzahlen.
- `buildSpotContext`: Detail-CTA, Sekundaeraktion und Quellenzusammenfassung werden lokal aus dem Spot-Status abgeleitet.

Betroffene Specs: `GET /api/explore`, `GET /api/spots/{spotId}/context`, `GET /api/today`, `GET /api/trip`, `GET /api/routes/suggestions`.

## 2. Initialer App-State und Seed-Fallbacks

Quelle: `apps/mobile/src/app/app-state.service.ts`

- `explore`, `today`, `trip` und `routeSuggestions` starten direkt mit Seed-Daten, bevor die API geladen ist.
- `savedSpotIds` startet hart mit `['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid']`.
- Default-Filter sind hart gesetzt: Status, Kategorien, Fahrzeug, F-Roads, maximale Fahrzeit.
- `setupScreens` enthalten feste Onboarding-Texte, feste Reisezeit und festen Demo-Hub.
- Bei API-Fehlern wird nicht nur ein Fehler angezeigt, sondern aktiv lokal weitergerechnet: Speichern, Routenstart, Stop einfuegen, Draft Day und Stop erledigen haben lokale Fallbacks.
- `findSpot` faellt auf `seedSpots` zurueck, wenn der aktuelle Explore-State den Spot nicht enthaelt.

Betroffene Specs: fast alle bestehenden Seed-Endpunkte plus `POST /api/onboarding`, `GET /api/me`, `PATCH /api/me/preferences`.

## 3. Demo-State im API-Server

Quellen: `apps/api/src/app/app.service.ts`, `apps/api/src/app/api-demo-state.repository.ts`

- API liefert zwar echte HTTP-Antworten, die Daten stammen aber aus In-Memory-Demo-State und festen Arrays.
- Hub, Spots, Koordinaten, Statusgruende, Quellenzeitpunkte, Smart Routes und Route Suggestions sind hart codiert.
- Trip, Saved Spots und Today Timeline werden in Memory mutiert, aber nicht persistiert.
- Health meldet `mode: 'seed'`.
- Routenberechnungen sind Naeherungen mit festen Divisoren, festen Sonderfaellen und festen Labels.

Betroffene Specs: alle `exists-seed` Endpunkte.

## 4. Add-Route Wizard

Quellen: `apps/mobile/src/app/add-route-screen/*`

- `WIZARD_BASES`: feste Startpunkte wie Reykjavik, Selfoss, Reykholt Cabin, Vik, Akureyri, Hofn.
- `KEFLAVIK_BASE` und `Current location`: aktuelle Position wird nicht wirklich aus Device-/Geo-Daten aufgeloest.
- `WIZARD_HOTELS`: feste Hotelliste mit Distanz, Sternen und Koordinaten.
- Step 1 Suche ist readonly und ohne Backend.
- Step 3 Hotelkarte/listet feste Hotels.
- Step 4 Stop-Empfehlungen werden lokal aus `explore().spots` sortiert und auf 6/3 Kandidaten begrenzt.
- Step 4/5 Fahrzeiten werden lokal aus Hotel-Distanz und Spot-Fahrzeiten abgeschaetzt.
- `startToday`, `saveToTrip` und Route-Edit erzeugen/mutieren lokale Today-/Trip-/Route-Daten.

Betroffene Specs: `GET /api/places/search`, `GET /api/hotels/search`, `POST /api/routes/preview`, `POST /api/routes`, `PATCH /api/routes/{routeId}`, `POST /api/routes/today`.

## 5. Spot-Action Wizard

Quellen: `apps/mobile/src/app/spot-action-screen/*`

- Direktroute aus Spot wird lokal erzeugt (`createDirectRouteFromSpot`).
- Stop in bestehende Route einfuegen wird lokal gerechnet (`addSpotToRoute`).
- Routenliste fuer Insert-Auswahl kommt aus `routeSuggestions`, Einfuegekosten werden lokal geschaetzt.

Betroffene Specs: `POST /api/routes`, `POST /api/routes/{routeId}/stops`, `POST /api/routes/preview`.

## 6. Routenplanung und Fallback-Logik

Quelle: `apps/mobile/src/app/route-planning.service.ts`

- `fallbackInsertPreview`: Insert-Preview wird ohne Routing Engine geschaetzt.
- `insertStop`, `todayRouteFromSpot`, `todayRouteFromSuggestion`: Today-Routen werden lokal gebaut.
- `wizardTodayRoute`: aus Wizard-Auswahl wird lokal eine aktive Tagesroute.
- `addDraftDay`: Trip wird lokal erweitert.
- `localRouteSuggestions`: faellt auf `seedRouteSuggestions` zurueck.
- `selectedRouteStops`, `updateRouteFromSpotIds`, `createDirectRouteFromSpot`, `addSpotToRoute`: Route-Details und Bearbeitung entstehen im Client.

Betroffene Specs: `POST /api/routes/preview`, `POST /api/routes/today/insert-preview`, `POST /api/routes/today/stops`, `POST /api/routes/today`, `POST /api/routes`, `PATCH /api/routes/{routeId}`, `POST /api/routes/{routeId}/stops`, `DELETE /api/routes/{routeId}/stops/{stopId}`.

## 7. Setup / Onboarding UI

Quelle: `apps/mobile/src/app/setup-screen/setup-screen.component.html`

- Sprache, Planungsphase, Kalender, Fahrzeugauswahl und Hub sind visuell vorgegeben.
- Kalender ist fest auf May 2026 mit 13-22 May gebaut.
- Fahrzeugauswahl markiert 4WD visuell, waehrend App-State default `car_2wd` verwendet.
- Hub-Suche und Hub-Karte sind statisch, `Edit` hat keinen echten Datenfluss.
- Setup-Abschluss setzt nur `setupDone` im Speicher, erzeugt keinen Trip und persistiert nichts.

Betroffene Specs: `POST /api/onboarding`, `GET /api/places/search`, `GET /api/me`.

## 8. Profile / Settings / Premium / Offline

Quelle: `apps/mobile/src/app/profile-screen/profile-screen.component.html`

- Nutzer `Lukas K.`, E-Mail, Join-Date, Premium-Angebot und Settings sind statisch.
- Sprache, Einheiten, Waehrung, Safety-Pushes und Emergency Contacts haben keine Persistenz.
- Offline Cache Area und Cached Today Route sind statisch; Klick setzt nur `offlineMode` lokal.

Betroffene Specs: `GET /api/me`, `PATCH /api/me/preferences`, `POST /api/offline/cache-regions`.

## 9. Screen-spezifische harte Labels und Datumstexte

- Routes Header nutzt `Thu 14 May - 07:42` statisch.
- Today Header nutzt `Today - Thu 14 May` statisch neben `today().dateLabel`.
- Route Detail nutzt `Thu 14 May` statisch.
- Explore nutzt `Explore - Iceland` und feste Map-Center-Werte.
- App-Sheet fuer Insert zeigt fest `between Geysir and Gullfoss`, auch wenn die Preview andere Stopps liefern koennte.
- Alternativen fuer rote Spots sind fest `Geysir` und `Bruarfoss` aus `explore().spots[0]` und `[3]`.

Betroffene Specs: `GET /api/explore`, `POST /api/routes/today/insert-preview`, `GET /api/spots/{spotId}/context`, `POST /api/spots/{spotId}/status-refresh`.

## 10. Spot-Bilder / Medien

Quelle: `apps/mobile/src/app/spot-images.ts`

- Spot-Bilder sind CSS-Gradienten pro Spot-ID statt echter Medien.
- Hotelbilder sind leere Thumbnail-Divs.
- Detail-Hero zeigt Platzhaltertext `[ hero photo - spot ]`.

Vorschlag: Medienfelder direkt in `Spot`, `Hotel` und `SpotContextResponse` aufnehmen. Ein separater Medien-Endpunkt ist fuer den MVP nicht zwingend noetig.
