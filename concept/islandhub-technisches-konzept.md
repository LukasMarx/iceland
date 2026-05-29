# IslandHub Technisches Konzept

Stand: 2026-05-25

## 1. Zielarchitektur

IslandHub wird als Mobile-first System mit gemeinsamer Codebasis fuer Web, iOS und Android gebaut. Die Zielarchitektur verbindet eine Angular PWA, Capacitor Mobile Builds, ein NestJS Backend, PostgreSQL/PostGIS, Redis/BullMQ, eine eigene Routing Engine und serverseitig gecachte offizielle Island-Daten.

Zentrale Architekturentscheidung: Offizielle Daten und Routing werden nicht direkt aus dem Client abgefragt. Das Backend ist die kontrollierte Integrations-, Cache-, Status- und Audit-Schicht.

```text
Angular PWA / Capacitor App
  -> REST API / WebSockets
    -> NestJS Backend
      -> PostgreSQL + PostGIS
      -> Redis + BullMQ
      -> Valhalla Routing Engine
      -> S3-compatible Object Storage
      -> Official Data Ingestion
        -> Vedur XML
        -> Vegagerdin web services
```

## 2. Frontend-Architektur

### 2.1 Technologie

- Angular fuer App und Admin
- Capacitor fuer iOS und Android
- PWA fuer Web
- Transloco fuer statische App-Uebersetzungen
- Mapbox GL fuer Kartenrendering
- REST fuer CRUD und Abfragen
- WebSockets fuer Trip-Collaboration, Status-Updates und Live-Sync

### 2.2 Apps im Monorepo

Empfehlung: Nx Monorepo, weil Angular App, Angular Admin, NestJS API und Shared Types zusammenwachsen.

```text
apps/
  mobile/          Angular PWA + Capacitor Shell
  admin/           Angular Admin UI
  api/             NestJS Backend

libs/
  api-contracts/   DTOs, API response types, OpenAPI helpers
  domain/          shared enums, value objects, status types
  ui/              shared Angular UI components
  map/             Mapbox integration, map overlays
  i18n/            static app translations
```

### 2.3 Mobile/PWA Offline

Der Client muss offline-faehig sein, aber nicht autonom "neue Wahrheit" erzeugen. Offline werden gecachte Daten klar als solche markiert.

Offline-Caches:

- Trip-Daten
- aktive Route
- gespeicherte Spots
- letzter bekannter Status
- Mapbox Offline Region fuer Island oder relevante Regionen
- ausstehende Community Reports

Statusdaten gelten nach 1 Stunde als stale. Danach bleiben sie sichtbar, aber erhalten einen Warnzustand.

## 3. Backend-Architektur

### 3.1 NestJS Module

```text
AuthModule
UsersModule
TripsModule
CollaborationModule
SpotsModule
CategoriesModule
MediaModule
ReportsModule
RoutingModule
RoadDataModule
WeatherDataModule
StatusEngineModule
RecommendationsModule
OfflineSyncModule
FeatureFlagsModule
PaymentsModule
AffiliateModule
NotificationsModule
AdminModule
AuditModule
```

### 3.2 API-Stil

- REST fuer stabile Ressourcen: Trips, Spots, Routes, Reports, Admin Content
- WebSockets fuer Live-Sync: Trip Updates, Route Updates, Status Changes
- OpenAPI/Swagger als Vertrag zwischen Frontend und Backend
- DTOs und Enums shared via Nx Libraries, aber Backend bleibt Quelle der Wahrheit

### 3.3 Docker Deployment

Ziel: lokal und initial produktiv per Docker Compose betreibbar.

```text
services:
  api
  mobile-web
  admin-web
  postgres-postgis
  redis
  valhalla
  object-storage
  worker
```

Object Storage startet lokal S3-kompatibel, z. B. MinIO. Spaeter kann auf AWS S3, Cloudflare R2, Hetzner Object Storage oder Backblaze B2 gewechselt werden.

## 4. Datenbank und Persistenz

### 4.1 Datenbank

- PostgreSQL als Hauptdatenbank
- PostGIS fuer Spots, Hubs, Road-Segments, Routing-Overlays, Geofences
- Redis fuer Queues, ephemeral Cache, WebSocket Presence und Locks

### 4.2 Kernentitaeten

```text
User
AuthIdentity
Trip
TripMember
Hub
TripDay
Route
RouteStop
Spot
SpotTranslation
Category
CategoryTranslation
MediaAsset
CommunityReport
OfficialRoadSegment
OfficialRoadConditionSnapshot
OfficialWeatherStation
OfficialWeatherSnapshot
SpotStatusSnapshot
RouteStatusSnapshot
FeatureFlag
Entitlement
Purchase
AffiliatePartner
AffiliateOffer
AuditEvent
PushToken
```

### 4.3 Mehrsprachigkeit

Statische App-Texte werden im Frontend mit Transloco gepflegt.

Content-Daten wie Spots und Kategorien werden im Admin uebersetzt und in der Datenbank gespeichert.

```text
Spot
  id
  location
  categoryId
  defaultLocale
  statusRelevantRoadSegmentIds[]

SpotTranslation
  spotId
  locale
  name
  shortDescription
  longDescription
  safetyNotes
```

## 5. Routing Engine

### 5.1 Entscheidung

IslandHub nutzt eine eigene Routing Engine. Mapbox wird fuer Kartenrendering genutzt, nicht als primaere Quelle fuer massenhafte Fahrzeit- und Matrixberechnungen.

Empfohlene Engine fuer Evaluation: Valhalla.

Gruende:

- OpenStreetMap-basiert
- Docker-betreibbar
- Route, Matrix und Isochronen verfuegbar
- dynamisches Costing und Profile grundsaetzlich passend fuer 2WD/4WD/F-Road-Logik
- Island-only Datenumfang ist beherrschbar

### 5.2 Routing Adapter

Das Backend spricht nie direkt fest gegen Valhalla, sondern gegen ein eigenes Interface.

```text
RoutingProvider
  getRoute(origin, destination, vehicleProfile, options)
  getMatrix(origins, destinations, vehicleProfile, options)
  getIsochrone(origin, minutes, vehicleProfile, options)
```

Dadurch bleiben Valhalla, OSRM, GraphHopper oder Mapbox als Fallback austauschbar.

### 5.3 Fahrzeugprofile

Initiale Profile:

- `car_2wd`
- `car_4wd`

Regeln:

- 2WD vermeidet F-Roads und kritische unbefestigte Abschnitte
- 4WD darf F-Roads nutzen, aber Flussquerungen und Sperren bleiben riskant
- gesperrte Segmente werden vermieden, wenn technisch moeglich
- wenn keine sichere Alternative berechnet werden kann, wird der RouteStatus rot

### 5.4 Caching und Vorberechnung

Bei ca. 500 kuratierten Spots und typischerweise 4-5 Hubs pro Reise ist eine aggressive Cache-Strategie sinnvoll.

Cachebare Berechnungen:

- Hub -> Spot Matrix
- Spot -> Spot Matrix innerhalb eines Radius
- Hub -> Hub Etappen
- Isochronen fuer 30, 60, 120 Minuten

Nicht alle Fahrzeiten muessen alle 15 Minuten neu berechnet werden. Neu bewertet werden primaer Road Conditions, Weather Conditions und daraus abgeleitete Status.

## 6. Offizielle Datenquellen

### 6.1 Veður.is

Veður.is bietet eine XML-Datenversorgung fuer Wetterdaten. Die Dokumentation nennt Wettervorhersagen, Textvorhersagen, Beobachtungen, Nordlichtprognosen und Lawinenwarnungen. Die Dienste sind offen, kostenlos und ohne Registrierung nutzbar, aber nicht so aktuell wie die Website und ohne Garantien. Die Terms verlangen Quellenangabe inklusive Herkunft und Downloadzeit.

Technische Konsequenz:

- Backend pollt zentral
- Raw Responses werden kurzzeitig gespeichert
- normalisierte WeatherSnapshots werden persistiert
- jeder abgeleitete Status enthaelt Quelle und Fetch-Zeit

Relevante Parameter fuer Status Engine:

- Windgeschwindigkeit
- Windboeen
- Niederschlag
- Schnee/Eis
- Temperatur
- Sicht
- offizielle Warnungen
- Lawinenwarnungen, falls fuer Spottyp relevant
- ggf. Fluss-/Wasserstandsrisiko, sofern verfuegbar

### 6.2 Vegagerðin / Road.is

Vegagerðin bietet Webservices fuer Færð og veður. Die Road-Condition-Daten enthalten Segment-IDs, Update-Zeitpunkte, Oberflaechenzustand, Zusatzinformationen wie Sturm, Schnee, Sandsturm, Nebel, Sperren, Strassenarbeiten und Gewichtsrestriktionen. Geometrien der Segmente koennen per WFS bezogen werden.

Wichtige technische Details:

- Road Conditions: `https://gagnaveita.vegagerdin.is/api/faerd2017_1`
- lokale Punkte: `https://gagnaveita.vegagerdin.is/api/faerdpunktar2017_1`
- Segment-Geometrien per WFS mit `gis:faerdferlar2017_1`
- `IdButur` ist der zentrale Segment-Identifier
- Segment-Geometrien sollen nicht dauernd neu geladen werden; sie aendern sich nur selten
- Condition-Daten werden alle paar Minuten ausgegeben, `DagsKeyrtUt` sollte nicht deutlich aelter als 10 Minuten werden

Terms:

- Nutzung und kommerzielle Wiederverwendung sind erlaubt
- Attribution ist erforderlich
- keine Irrefuehrung oder offizielle Endorsement-Anmutung
- keine Garantie auf Vollstaendigkeit, Fehlerfreiheit oder dauerhafte Verfuegbarkeit

### 6.3 Polling statt Webhooks

Fuer beide Datenquellen wird Polling angenommen. Webhooks sind bei diesen offiziellen Quellen nicht zu erwarten und wurden in der Recherche nicht als Integrationsmodell sichtbar.

Empfohlene Jobs:

```text
weather.ingest.current
weather.ingest.forecast
road.ingest.conditions
road.ingest.condition-points
road.ingest.segment-geometries
status.recalculate.affected
notifications.evaluate
```

## 7. Status Engine

### 7.1 Grundprinzip

Der Status wird deterministisch berechnet. Keine ML-Logik im Kern. Regeln liegen initial in Config-Dateien und werden versioniert.

Berechnungskontext:

```text
Spot + Hub + Route + Vehicle + DateTime
```

### 7.2 Statusarten

```text
SpotStatus
  Zustand am Ziel selbst

RouteStatus
  Zustand der Route vom Hub zum Spot oder zwischen Stops

VehicleCompatibilityStatus
  Eignung fuer 2WD oder 4WD

RecommendationStatus
  kombinierter UI-Status fuer Nutzerkontext
```

### 7.3 Statusfarben

```text
green   offen und unkritisch
yellow  machbar, aber mit relevanter Warnung
red     gesperrt oder nicht empfehlenswert
unknown Daten fehlen oder sind zu alt
```

### 7.4 Regelmodell

```text
Rule {
  id
  version
  sourceType: weather | road | vehicle | daylight | dataFreshness
  condition
  severity: green | yellow | red | unknown
  reasonKey
  priority
}
```

Beispiele:

```text
road.AstandYfirbord == LOKAD -> red
road.AstandVidbotaruppl == SANDBYLUR -> red or yellow by config
vehicle == 2WD && road.isFRoad == true -> red
windGusts >= 24m/s -> yellow
weatherSnapshot.age > 60min -> unknown
```

Gelbe Gruende werden nicht gegeneinander aufgerechnet, sondern gemeinsam angezeigt. Fuer Sortierung kann intern eine Penalty berechnet werden: je mehr gelbe Gruende, desto weiter unten.

### 7.5 Hard Warning

Rot blockiert nicht technisch endgueltig, aber erzeugt einen Hard-Warning-Dialog. Der Nutzer muss bewusst bestaetigen, wenn er einen roten Spot speichern oder trotzdem in eine Route aufnehmen will. Navigation sollte bei Rot standardmaessig nicht als primaerer CTA erscheinen.

## 8. Recommendations und Sortierung

Routenvorschlaege und Spotlisten werden nicht nur nach Entfernung sortiert.

Sortierfaktoren:

- RecommendationStatus
- Anzahl gelber Gruende
- Netto-Fahrzeit
- Tageslichtfenster
- Fahrzeugkompatibilitaet
- Spot-Kategorie und Nutzerinteresse
- Popularitaet oder manuelle Kuratierung

Grundregel:

1. Gruene Optionen oben
2. Gelbe Optionen danach, wenige Warnungen vor vielen Warnungen
3. Unknown separat oder nach Gelb
4. Rote Optionen unten mit Alternativen

## 9. Admin UI

Das Admin UI ist eine eigene Angular App im selben Monorepo. Es wird initial nur von dir genutzt. Keine komplexen Admin-Rollen in Phase 1.

Admin-Funktionen:

- Spots anlegen, bearbeiten, freischalten
- Spot-Uebersetzungen pflegen
- Kategorien anlegen und uebersetzen
- Bilder hochladen und verwalten
- Community Reports pruefen, annehmen, ablehnen
- Report-Inhalte in Spotdaten uebernehmen

Community Reports werden nicht sofort oeffentlich sichtbar. Sie landen in einer Moderation Queue.

## 10. Auth, Accounts und Kollaboration

### 10.1 Auth

Accounts sind Pflicht.

Login-Optionen:

- E-Mail
- Apple
- Google

### 10.2 Trip-Kollaboration

Nutzer koennen andere Personen in Trips einladen. Eingeladene Nutzer brauchen eigene Accounts.

Rollen:

```text
owner
editor
viewer
```

Premium gilt pro Nutzer. Mitreisende koennen Premium-Funktionen innerhalb eines Trips kostenlos mitnutzen, wenn der Trip-Owner Premium besitzt.

### 10.3 Live-Sync und Konflikte

Live-Sync erfolgt per WebSocket.

Konfliktmodell fuer Phase 1:

- Ressourcen haben `version`
- Schreiboperationen pruefen Version
- bei veralteter Version: `409 Conflict`
- Client zeigt Reload-/Merge-Hinweis
- unkritische UI-Updates koennen last-write-wins nutzen

## 11. Feature Flags, Entitlements und Payments

### 11.1 Feature Flags

Premium und Produktpakete sind noch nicht final. Daher wird kein einfaches `isPremium` modelliert, sondern ein Feature-Flag- und Entitlement-System.

```text
FeatureFlag {
  key
  description
  enabled
  rolloutGroup
}

Entitlement {
  userId
  featureKey
  source: free | purchase | admin | trial | trip-owner
  validFrom
  validUntil
}
```

Moegliche Flags:

- `live_recheck_15_min`
- `night_before_alerts`
- `offline_maps`
- `offline_routes`
- `auto_alternatives`
- `background_arrival_detection`
- `collaborative_trips`
- `community_reports_submit`
- `owner_premium_shared_to_trip`

### 11.2 Payments

Modell:

- Free-Version
- Einmalzahlung pro Nutzer
- Apple/Google In-App Purchase fuer Mobile
- Stripe fuer Web
- serverseitige Kaufvalidierung
- plattformuebergreifende Entitlement-Synchronisierung

## 12. Affiliate-System

Affiliate-Links laufen ueber das Backend.

Gruende:

- zentrales Tracking
- rechtlich konsistente Kennzeichnung
- Austausch von Partnern ohne App-Release
- Auswertung von Conversion-Kontexten

Entitaeten:

```text
AffiliatePartner
AffiliateOffer
AffiliateClick
AffiliateDisclosure
```

Kontexte:

- Mietwagen bei Templates, Fahrzeug ungebucht oder 4WD-Empfehlung
- Unterkuenfte bei Roadtrip-/Hubplanung
- Touren bei passenden Spots

UI-Regel:

Jedes Angebot muss klar als Anzeige oder Partnerangebot markiert sein. Ranking-Kriterien muessen erklaerbar bleiben.

## 13. Push, Background und lokale Standortlogik

Push Use Cases:

- Vorabendwarnung fuer morgige Route
- Status verschlechtert sich waehrend der Fahrt
- Offline-Cache ist alt
- Community Report wurde bearbeitet

Background Location wird vorsichtig eingesetzt. Keine serverseitige Standorthistorie.

Empfohlenes Modell:

- Geofence/Arrival Detection lokal auf dem Geraet
- Backend speichert keine GPS-Spuren
- optionales Event: Nutzer hat Spot X besucht
- Nutzer bestaetigt idealerweise: "Als erledigt markieren"

## 14. Datenschutz und DSGVO

Gespeichert werden, was das Produkt braucht:

- Accountdaten
- Auth-Identitaeten
- Trips, Hubs, Routen, Stops
- Spot-Saves
- Community Reports
- Push Tokens
- Payments/Entitlements
- Audit Events fuer Status- und Datenquellenentscheidungen

Nicht gespeichert werden:

- kontinuierliche GPS-Historie
- detaillierte Bewegungsprofile

Erforderliche Funktionen:

- Datenexport
- Accountloeschung
- Trip-Loeschung
- Einwilligungsverwaltung fuer Push, Location, Background Location
- klare Quellen- und Attribution-Anzeige

## 15. Audit und Nachvollziehbarkeit

IslandHub sollte nachvollziehen koennen, warum ein Status angezeigt wurde.

Audit-Ziele:

- Support
- Vertrauen
- Debugging
- Sicherheit
- rechtliche Transparenz

Zu speichern:

```text
StatusAudit {
  entityType: spot | route | segment
  entityId
  context: hubId, vehicle, datetime
  sourceSnapshotIds[]
  ruleVersions[]
  resultingStatus
  reasons[]
  calculatedAt
}
```

Raw Official Responses muessen nicht dauerhaft gespeichert werden. Eine kurze Retention plus normalisierte Snapshots und Audit-Verweise reichen fuer Phase 1.

## 16. Jobs und Re-Checks

### 16.1 Job-Typen

```text
Official data ingestion
  weather current
  weather forecast
  road conditions
  road condition points
  road segment geometry refresh

Derived calculations
  affected spot status recalculation
  affected route status recalculation
  trip day recommendation refresh

User-facing jobs
  night-before route check
  en-route worsening check
  push notification dispatch
  offline package preparation
```

### 16.2 Frequenzen

- Road Conditions: alle 10-15 Minuten, je nach Quellverhalten
- Weather Observations: alle 15-60 Minuten, je nach Feature/Entitlement
- Segment-Geometrien: selten, z. B. manuell oder taeglich/woechentlich pruefen
- Premium Re-Checks: 15 Minuten
- Free Re-Checks: niedriger, z. B. 60 Minuten oder manuell

## 17. MVP-Schnitt aus der Zielarchitektur

Obwohl dieses Dokument die Zielarchitektur beschreibt, sollte die erste Umsetzung fokussiert bleiben.

### Phase 1

- Nx Workspace
- Angular Mobile/PWA Shell
- Angular Admin
- NestJS API
- PostgreSQL/PostGIS
- Redis/BullMQ
- Auth mit E-Mail, Google, Apple vorbereiten
- Spot- und Kategorie-Admin
- S3-kompatibler Media Upload lokal mit MinIO
- Valhalla Proof of Concept fuer Island
- Road-Condition-Ingestion von Vegagerðin
- Weather-Ingestion von Veður XML
- deterministische Status Engine mit Config-Regeln
- Explore, Spot Details, Today Route als technische Kernflows

### Phase 2

- Kollaboration mit Einladungen und Live-Sync
- Offline-Pakete
- Feature Flags und Entitlements
- Payments
- Push Notifications
- Affiliate Redirects

### Phase 3

- Background Arrival Detection
- automatische Alternativrouten
- Community Report Moderation
- erweiterte Admin-Workflows
- flexible Reisezeitberatung

## 18. Offene technische Risiken

1. Valhalla-Eignung fuer F-Road-/Closure-Avoidance muss praktisch getestet werden.
2. Mapping von Vegagerðin `IdButur` Segmenten auf OSM/Valhalla-Routen ist kritisch.
3. Veður-Stationsdaten muessen sauber auf Spots, Regionen oder interpolierte Gebiete gemappt werden.
4. Mapbox Offline Packs muessen in Capacitor auf iOS/Android praktisch validiert werden.
5. App Store Regeln fuer Lifetime-Purchase plus Web-Kauf/Stripe muessen frueh geprueft werden.
6. Live-Kollaboration darf nicht zu komplex starten; Versionierung und einfache Konflikte reichen initial.

## 19. Naechste technische Schritte

1. Valhalla Docker POC mit Island OSM Extract bauen.
2. Vegagerðin `faerd2017_1`, `faerdpunktar2017_1` und WFS-Geometrien importieren.
3. Veður XML mit konkreten Station-IDs/Gruppen testen.
4. PostGIS Schema fuer Spots, Hubs, Road Segments und Snapshots entwerfen.
5. Status-Regeldatei v0 definieren.
6. Nx Workspace-Struktur finalisieren.
7. OpenAPI-Kontrakt fuer Kernressourcen skizzieren.

## 20. Kurzfazit

Die technisch robuste Richtung fuer IslandHub ist ein backend-zentriertes System mit eigener Routing Engine, serverseitiger Datenintegration und deterministischer Status Engine. Dadurch bleiben API-Kosten kontrollierbar, offizielle Daten konsistent, Offline-Funktionen moeglich und Sicherheitsentscheidungen nachvollziehbar.

Mapbox bleibt stark fuer das Kartenprodukt, aber nicht als alleinige Quelle fuer Fahrzeit- und Statuslogik. Der eigentliche Produktvorteil entsteht in der Kombination aus PostGIS, Valhalla, offiziellen Road-/Weather-Daten und einer testbaren Status Engine.