# IslandHub Umsetzungs-Checkliste

Stand: 2026-05-25

Ziel dieser Roadmap: IslandHub so schneiden, dass nach jedem Umsetzungsschritt ein belastbarer, testbarer Stand entsteht. Idealerweise bleibt die App in jeder Phase lauffaehig: erst mit Seed-/Mock-Daten, dann mit echter API, spaeter mit offiziellen Datenquellen, Routing, Offline-Faehigkeit und Mobile Builds.

## Leitplanken fuer die Umsetzung

- [ ] Jeder Milestone endet mit einer nutzbaren App-Version, nicht nur mit Backend- oder UI-Teilen.
- [ ] Jeder Milestone hat eine klare Demo-Route durch die App.
- [ ] Safety-Status ist Single Source of Truth: Karte, Spot Details und Timeline duerfen nie unterschiedliche Wahrheiten anzeigen.
- [ ] Offizielle Datenquellen werden serverseitig integriert, gecacht und mit Quelle sowie Fetch-Zeit angezeigt.
- [ ] Unsichere, alte oder fehlende Daten werden sichtbar gemacht, nicht versteckt.
- [ ] Basis-Sicherheitswarnungen bleiben kostenlos; Premium verkauft Komfort und Automatisierung.
- [ ] Affiliate-Angebote erscheinen nur kontextuell und klar gekennzeichnet.
- [ ] Jede Phase enthaelt mindestens Smoke Tests und fokussierte automatisierte Tests fuer die neu entstandene Logik.


## Phase 1: Monorepo und Walking Skeleton

### Repo und Tooling

- [ ] Nx Workspace anlegen.
- [ ] Apps erzeugen: `mobile`, `admin`, `api`.
- [ ] Libraries erzeugen: `api-contracts`, `domain`, `ui`, `map`, `i18n`.
- [ ] Linting, Formatting und TypeScript-Strictness aktivieren.
- [ ] Basale CI-Pipeline einrichten: install, lint, test, build.
- [ ] Docker Compose Grundgeruest anlegen: API, Postgres/PostGIS, Redis.

### App Skeleton

- [ ] Angular Mobile App mit Bottom Navigation aufsetzen: Explore, Today, Trip, Profile.
- [ ] NestJS API mit Health Endpoint aufsetzen.
- [ ] Mobile App ruft Health Endpoint ab und zeigt Verbindungsstatus.
- [ ] Shared Domain Types fuer Status, Vehicle, TripMode und Locale anlegen.
- [ ] Lokale Seed-Konfiguration fuer Demo-Daten einbauen.

### Stabiler Stand

- [ ] Die App startet lokal als Web/PWA.
- [ ] Die API startet lokal.
- [ ] Frontend und Backend sprechen miteinander.
- [ ] Eine Demo-Seite zeigt Build-Version, API-Status und Seed-Modus.

### Testbare Abnahme

- [ ] `lint`, `test` und `build` laufen fuer alle Apps.
- [ ] API Health Check liefert `ok`.
- [ ] E2E Smoke Test oeffnet die Mobile App und findet die vier Tabs.
- [ ] Docker Compose startet Datenbank und Redis reproduzierbar.

## Phase 2: Domain-Modell und persistente MVP-Daten

### Domain

- [ ] Kernentitaeten fuer MVP modellieren: User, Trip, Hub, TripDay, Route, RouteStop, Spot, Category, SpotStatusSnapshot.
- [ ] Statusmodell als gemeinsames Contract-Objekt definieren.
- [ ] Vehicle Profile definieren: `car_2wd`, `car_4wd`, `unknown`.
- [ ] Source Metadata definieren: Quelle, Fetch-Zeit, Alter, Raw Reference.
- [ ] Version-Felder fuer konfliktfaehige Ressourcen einfuehren.

### Backend

- [ ] Prisma, TypeORM oder vergleichbares ORM final auswaehlen.
- [ ] Datenbankmigrationen fuer MVP-Entitaeten anlegen.
- [ ] Seed-Daten fuer Island-Demo erstellen: Reykholt Cabin, Geysir, Gullfoss, Seljalandsfoss, Kerlingarfjoell, Thorsmoerk.
- [ ] CRUD Endpoints fuer Trips, Hubs, Spots und Kategorien bauen.
- [ ] Status Snapshot Endpoint bereitstellen: Spot Status pro Hub, Fahrzeug und Datum.

### Frontend

- [ ] API Client fuer MVP-Ressourcen anlegen.
- [ ] Gemeinsamen App Store fuer Trip, Hub, Vehicle und SpotStatus einrichten.
- [ ] Loading-, Empty- und Error-Zustaende fuer API-Calls bauen.
- [ ] Seed-Demo in der App sichtbar machen, ohne echte Datenquellen zu behaupten.

### Stabiler Stand

- [ ] Die App zeigt echte Daten aus der lokalen API statt hart codierter UI-Daten.
- [ ] Explore, Trip und Spotlisten lesen dieselben Seed-Spots und Status-Snapshots.
- [ ] Status hat bereits Gruende und Zeitstempel, auch wenn er noch aus Seed-Regeln kommt.

### Testbare Abnahme

- [ ] API Integration Tests erstellen, lesen und aktualisieren Trips, Hubs und Spots.
- [ ] Contract Tests pruefen Statuswerte und Pflichtfelder.
- [ ] Frontend Component Tests pruefen Darstellung von `green`, `yellow`, `red`, `unknown`.
- [ ] E2E Smoke: App startet, laedt Seed-Trip, zeigt aktiven Hub und Spots.

## Phase 3: Onboarding fuer den ersten nutzbaren Trip

### Produkt und UX

- [ ] Onboarding-Scope fuer MVP schneiden: Sprache, Planungsphase, feste Reisedaten, Fahrzeug, Hub.
- [ ] Flexible Daten und komplexe Templates als spaetere Optionen markieren.
- [ ] Copy fuer Sicherheitskontext und Datenquellen kurz und verstaendlich formulieren.
- [ ] Abbruchpfad definieren: Explore ohne Setup mit Demo- oder Gastdaten.

### Frontend

- [ ] Step 1 Sprachwahl bauen.
- [ ] Step 2 Planungsphase bauen.
- [ ] Step 3 Date Range Picker fuer feste Daten bauen.
- [ ] Step 4 Fahrzeugauswahl bauen inklusive F-Road-Hinweis.
- [ ] Step 5 Hub-Eingabe bauen, initial mit Suche in Seed-Spots/Adressen.
- [ ] Onboarding State persistieren.
- [ ] Nach Abschluss Trip und Hub ueber API anlegen.

### Backend

- [ ] Endpoint fuer Onboarding-Abschluss bauen.
- [ ] Trip, Hub, TripDays und Default Settings atomar erzeugen.
- [ ] Validierung fuer Datumsbereich, Fahrzeugtyp und Hub-Location einfuehren.

### Stabiler Stand

- [ ] Ein neuer Nutzer kann aus leerem Zustand einen ersten Hub-Trip erzeugen.
- [ ] Danach landet er in Explore mit aktivem Hub, Datum und Fahrzeug.
- [ ] Die App ist fuer Typ 2 Hub-Planer end-to-end demo-faehig.

### Testbare Abnahme

- [ ] E2E Test durchlaeuft Onboarding bis Explore.
- [ ] API Test prueft atomare Trip-Erstellung.
- [ ] Form Tests pruefen Validierung fuer fehlendes Datum, fehlendes Fahrzeug und fehlenden Hub.
- [ ] Reload nach Onboarding stellt denselben Trip wieder her.

## Phase 4: Explore MVP mit Kartenersatz und Filterlogik

### Produkt

- [ ] MVP-Definition fuer Explore festlegen: Hub, Datum, Fahrzeug, Statusliste, Filter, Routenvorschlaege.
- [ ] Kartenintegration fuer Phase 4 bewusst begrenzen: erst statische oder einfache Map-Canvas, keine vollstaendige Offline-Karte.
- [ ] Sortierregeln festlegen: Gruen, Gelb, Unknown, Rot; dann Fahrzeit und Warnanzahl.

### Frontend

- [ ] Explore Header mit aktivem Hub, Datum, Fahrzeug und Datenalter bauen.
- [ ] Kartenflaeche mit Hub-Marker, Radien und Seed-Pins bauen.
- [ ] Bottom Sheet mit Smart Route und Spotkarten bauen.
- [ ] Filter Sheet fuer Status, Fahrzeug, F-Roads, Fahrzeit und Kategorien bauen.
- [ ] Statusfarben immer mit Symbolen und Text ergaenzen.
- [ ] Gemeinsamen Status Store fuer Karte, Liste und Detailnavigation nutzen.

### Backend

- [ ] Endpoint `GET /explore` bereitstellen: Hub, Spots, Status, Distanz, Fahrzeit, Empfehlung.
- [ ] Filter- und Sortierparameter serverseitig unterstuetzen.
- [ ] Response so strukturieren, dass Frontend keine eigene Statuslogik berechnet.

### Stabiler Stand

- [ ] Der Nutzer sieht morgens eine glaubwuerdige Entscheidungsflaeche rund um seinen Hub.
- [ ] Filter veraendern die Liste und Pins konsistent.
- [ ] Auch ohne echte Mapbox-Integration ist der Produktwert testbar.

### Testbare Abnahme

- [ ] API Tests pruefen Filterkombinationen und Sortierung.
- [ ] Component Tests pruefen Status-Badges mit Symbol und Text.
- [ ] E2E Test filtert auf `open` und sieht nur passende Spots.
- [ ] Visueller Smoke Test prueft, dass Header, Karte, Sheet und CTA nicht ueberlappen.

## Phase 5: Spot Details und Sicherheitsentscheidung

### Produkt

- [ ] Detailvarianten fuer `green`, `yellow`, `red`, `unknown` finalisieren.
- [ ] CTA-Regeln je Status definieren: Hinzufuegen, trotz Warnung hinzufuegen, Alternative suchen, Daten aktualisieren.
- [ ] Hard-Warning-Verhalten fuer Rot definieren.
- [ ] Quellen- und Zeitstempel-Copy finalisieren.

### Frontend

- [ ] Spot Detail Screen fuer gelben Status bauen.
- [ ] Varianten fuer geschlossen und unbekannte/veraltete Daten bauen.
- [ ] Sticky CTA je Status implementieren.
- [ ] Speichern-Button implementieren.
- [ ] Source Panel mit Veður.is/Vegagerðin-Attribution und Fetch-Zeit anzeigen.
- [ ] Zuruecknavigation in Explore ohne State-Verlust sicherstellen.

### Backend

- [ ] Endpoint `GET /spots/:id/context` bauen: Status, Gruende, Road, Weather, Vehicle, Quellen.
- [ ] Endpoint fuer Saved Spots bauen.
- [ ] Audit Event fuer sicherheitsrelevante Aktion erfassen, z. B. roter Spot trotzdem gespeichert.

### Stabiler Stand

- [ ] Nutzer kann von Explore in Spot Details wechseln und eine belastbare Entscheidung treffen.
- [ ] Gelb, Rot und Unknown sind nicht nur Farben, sondern erklaerte Zustaende.
- [ ] Saved Spots funktionieren fuer spaetere Routenplanung.

### Testbare Abnahme

- [ ] Component Tests fuer jede Statusvariante.
- [ ] API Tests pruefen Quellen und Grundtexte.
- [ ] E2E Test oeffnet Seljalandsfoss, sieht Windwarnung und speichert den Spot.
- [ ] E2E Test oeffnet Kerlingarfjoell, sieht Rot und bekommt keinen primaeren Navigations-CTA.

## Phase 6: Tagesroute MVP

### Produkt

- [ ] Minimale Tagesroute definieren: Hub -> Stopps -> Hub.
- [ ] Timeline-Zustaende definieren: erledigt, aktiv, offen, warnbehaftet.
- [ ] Manuelles Erledigen und naechster Stopp als Kernflow definieren.
- [ ] Navigationsexport fuer naechsten Stopp als robuste erste Variante festlegen.

### Frontend

- [ ] Today Screen mit Tageskopf, Stopps, Fahrzeit und Tageslicht bauen.
- [ ] Timeline-Komponenten fuer Start, Stopps und Rueckkehr bauen.
- [ ] CTA `Navigate to next stop` bauen.
- [ ] Externen Maps-Link fuer Google/Apple Maps vorbereiten.
- [ ] Stopps manuell als erledigt markieren.
- [ ] Rueckkehr-aus-Maps-Sheet implementieren.

### Backend

- [ ] Route und RouteStop Endpoints bauen.
- [ ] Route fuer heute erzeugen: Hub -> Spot -> Hub.
- [ ] RouteStop Status aus SpotStatusSnapshot referenzieren.
- [ ] Progress-Updates persistieren.

### Stabiler Stand

- [ ] Nutzer kann aus einem Spot eine heutige Route erzeugen und abfahren.
- [ ] Die App bleibt auch nach Maps-Rueckkehr im kontrollierten Zustand.
- [ ] Today ist als eigener Tab nutzbar, nicht nur als Demo-Screen.

### Testbare Abnahme

- [ ] API Tests erstellen Route, fuegen Stopps hinzu und markieren Stopps erledigt.
- [ ] E2E Test erzeugt Route aus Spot Details und sieht sie in Today.
- [ ] E2E Test markiert einen Stopp als erledigt und sieht den naechsten aktiv.
- [ ] Unit Tests pruefen Timeline-Statuslogik.

## Phase 7: Insert-Logik und Routenvorschlaege

### Produkt

- [ ] Insert-Regeln priorisieren: Sicherheit, Fahrzeit, Tageslicht, Reihenfolge.
- [ ] Verhalten ohne aktive Route definieren: fuer heute erstellen, fuer spaeter planen, nur speichern.
- [ ] Verhalten bei rotem Spot definieren: Hard Warning plus sichere Alternative.
- [ ] Smart-Route-MVP definieren: eine empfohlene Route aus Seed-Spots.

### Backend

- [ ] Endpoint `POST /routes/:id/insert-preview` bauen.
- [ ] Einfache Insert-Heuristik implementieren: minimaler Fahrzeit-Zuwachs unter Status-Constraints.
- [ ] Endpoint `POST /routes/:id/stops` mit empfohlener oder manueller Position bauen.
- [ ] Endpoint fuer `create route from spot` bauen.
- [ ] Status-Revalidierung vor Insert erzwingen.

### Frontend

- [ ] Insert-Sheet mit empfohlenem Platz, Zusatzfahrzeit und Statuswirkung bauen.
- [ ] No-active-route-Sheet bauen.
- [ ] Hervorhebung neuer Stopps in Today implementieren.
- [ ] Smart Route Card in Explore startet Tagesroute.

### Stabiler Stand

- [ ] Nutzer kann einen Spot sinnvoll in eine bestehende Route einfuegen.
- [ ] Ohne aktive Route entsteht ein klarer Entscheidungsflow statt eines Fehlers.
- [ ] Route, Explore und Spot Details bleiben konsistent.

### Testbare Abnahme

- [ ] Unit Tests pruefen Insert-Heuristik mit mehreren Stopps.
- [ ] API Tests pruefen Revalidierung bei Statusaenderung.
- [ ] E2E Test fuegt Seljalandsfoss zwischen zwei Stopps ein.
- [ ] E2E Test fuegt Spot ohne aktive Route hinzu und erstellt Today-Route.

## Phase 8: Deterministische Status Engine mit Seed- und Fake-Quellen

### Produkt

- [ ] Regelkatalog fuer MVP festlegen: Strassensperre, F-Road mit 2WD, Windboeen, Datenalter, Tageslicht.
- [ ] Prioritaet definieren: Sicherheit gewinnt bei Konflikten.
- [ ] Reason Keys und Nutzertexte fuer alle Regeln erstellen.
- [ ] Gelbe Gruende als Liste behandeln, nicht gegeneinander aufrechnen.

### Backend

- [ ] Rule Config Format implementieren.
- [ ] Status Engine als reinen, deterministischen Service bauen.
- [ ] Fake Weather Snapshots und Fake Road Snapshots als Testdaten einbauen.
- [ ] SpotStatusSnapshot und RouteStatusSnapshot berechnen und speichern.
- [ ] Recalculation Job fuer betroffene Spots/Routes vorbereiten.
- [ ] Versionierung der Regeln in Status Snapshots speichern.

### Frontend

- [ ] UI liest nur noch berechnete Status Snapshots.
- [ ] Datenalter und `validUntil` sichtbar machen.
- [ ] Status-Update-Banner in Today und Explore bauen.

### Stabiler Stand

- [ ] Der Kernnutzen funktioniert mit deterministischen Daten: Spots werden nachvollziehbar bewertet.
- [ ] Veraenderte Fake-Quellen aktualisieren Explore, Details und Today gleichartig.
- [ ] Die App ist fachlich testbar, bevor echte externe Daten instabil werden.

### Testbare Abnahme

- [ ] Unit Tests decken jede MVP-Regel ab.
- [ ] Property-nahe Tests pruefen: Rot gewinnt vor Gruen, Unknown entsteht bei stale data.
- [ ] Integration Test aendert Windboeen und sieht Statuswechsel Gelb.
- [ ] E2E Test sieht Statusaenderung in Explore und Today konsistent.

## Phase 9: Echte Datenquellen integrieren

### Veður.is

- [ ] XML-Client fuer relevante Wetterdaten bauen.
- [ ] Raw Responses kurzzeitig speichern.
- [ ] WeatherSnapshots normalisieren und persistieren.
- [ ] Quelle, Downloadzeit und Alter in Status Context durchreichen.
- [ ] Fehler- und Rate-Limit-Verhalten definieren.

### Vegagerðin / Road.is

- [ ] Client fuer `faerd2017_1` Condition-Daten bauen.
- [ ] Client fuer lokale Punkte vorbereiten.
- [ ] Segment-Geometrie-Import per WFS als separaten Job bauen.
- [ ] `IdButur` als zentralen Segment-Identifier persistieren.
- [ ] RoadConditionSnapshots normalisieren und speichern.
- [ ] Attribution und Terms-Anforderungen sichtbar machen.

### Jobs und Observability

- [ ] BullMQ Jobs fuer Weather und Road Ingestion einrichten.
- [ ] Job-Retry, Dead Letter und Alerting definieren.
- [ ] Admin-/Debug-Endpoint fuer letzte erfolgreiche Ingestion bauen.
- [ ] Status-Neuberechnung nach Ingestion triggern.

### Stabiler Stand

- [ ] Die App nutzt echte offizielle Daten in Staging, faellt lokal aber weiter auf Seed/Fake-Daten zurueck.
- [ ] Quellen, Fetch-Zeiten und stale data sind sichtbar.
- [ ] Externe Instabilitaet macht die App nicht unbenutzbar.

### Testbare Abnahme

- [ ] Integration Tests mit gespeicherten Fixture Responses.
- [ ] Contract Tests pruefen Normalisierung von Road- und Weather-Feldern.
- [ ] Failure Tests simulieren Quelle down und erwarten stale/unknown statt Crash.
- [ ] E2E Staging Smoke zeigt echte Fetch-Zeit in Spot Details.

## Phase 10: Routing Engine und Fahrzeitmatrix

### Routing

- [ ] Valhalla lokal per Docker Compose evaluieren.
- [ ] RoutingProvider Interface implementieren.
- [ ] Adapter fuer Valhalla bauen.
- [ ] Fallback Adapter fuer Seed-/Mock-Routing behalten.
- [ ] Vehicle Costing fuer 2WD und 4WD abbilden.
- [ ] Gesperrte Segmente und F-Road-Regeln in Routingbewertung beruecksichtigen.

### Caching

- [ ] Hub -> Spot Matrix cachen.
- [ ] Spot -> Spot Matrix innerhalb Radius cachen.
- [ ] Hub -> Hub Etappen cachen.
- [ ] Isochronen fuer 30, 60 und 120 Minuten cachen.
- [ ] Cache-Invalidierung fuer Road-Status von kompletter Neuberechnung trennen.

### Frontend

- [ ] Echte Fahrzeiten und Distanzen in Explore, Details und Today anzeigen.
- [ ] Kartenradien durch Isochronen ersetzen, sobald verfuegbar.
- [ ] Loading- und Fallback-Zustaende fuer Routingfehler anzeigen.

### Stabiler Stand

- [ ] Routenvorschlaege und Insert-Preview basieren auf belastbaren Fahrzeiten.
- [ ] 2WD/4WD beeinflussen sichtbare Optionen und Routenbewertung.
- [ ] Die App bleibt funktionsfaehig, wenn Valhalla lokal nicht erreichbar ist.

### Testbare Abnahme

- [ ] Adapter Tests pruefen Valhalla Request/Response Mapping.
- [ ] Integration Tests pruefen Matrix-Cache und Fallback.
- [ ] API Tests pruefen, dass 2WD F-Roads vermeidet oder markiert.
- [ ] E2E Test sieht abweichende Empfehlungen fuer 2WD und 4WD.

## Phase 11: Trip Tab und Roadtrip-Erweiterung

### Produkt

- [ ] Trip-Ansicht fuer Hubs, Daten, Fahrzeug und Tagesplan finalisieren.
- [ ] Roadtrip als Kette von Hubs/Etappen modellieren.
- [ ] Draft Days, Rest Days und Warnindikatoren definieren.
- [ ] MVP-Grenze fuer Drag-Reorder und Multi-Stage festlegen.

### Backend

- [ ] TripDay CRUD bauen.
- [ ] Mehrere Hubs pro Trip unterstuetzen.
- [ ] Day Plans mit Routen und Status-Summary verknuepfen.
- [ ] Etappen-Fahrzeiten berechnen oder mocken.

### Frontend

- [ ] Trip Tab mit Header, Hub Card und Day Plan bauen.
- [ ] Hub hinzufuegen und bearbeiten.
- [ ] Tagesentwurf aus Today speichern.
- [ ] Roadtrip Stage Sketch als erste Version bauen.
- [ ] Warnindikatoren pro Tag anzeigen.

### Stabiler Stand

- [ ] Nutzer sieht nicht nur den aktuellen Tag, sondern seine Reise als Gesamtstruktur.
- [ ] Hub-Planung und Roadtrip-Planung nutzen dasselbe Status- und Routenmodell.
- [ ] Typ 3 wird als Beta-Flow demo-faehig.

### Testbare Abnahme

- [ ] API Tests fuer mehrere Hubs und TripDays.
- [ ] E2E Test legt zweiten Hub an und sieht ihn im Trip Tab.
- [ ] E2E Test speichert eine Today-Route als Tagesplan.
- [ ] Unit Tests pruefen Day-Status-Aggregation.

## Phase 12: Offline, Stale Data und lokale Robustheit

### Produkt

- [ ] Offline-MVP definieren: Trip, aktive Route, saved spots, letzter Status.
- [ ] Stale-Regeln finalisieren: Statusdaten nach 1 Stunde stale, weiter sichtbar mit Warnung.
- [ ] Offline-Copy fuer Nutzervertrauen formulieren.
- [ ] Grenzen klar machen: keine neue offizielle Wahrheit offline.

### Frontend

- [ ] Lokalen Cache fuer Trip, Route, Saved Spots und Status einrichten.
- [ ] Offline Banner bauen.
- [ ] Data Freshness Panel bauen.
- [ ] Offline Sheet mit weiterhin moeglichen Aktionen bauen.
- [ ] Ausstehende lokale Aktionen markieren und spaeter synchronisieren.

### Backend

- [ ] Offline Sync Endpoint fuer Pending Mutations bauen.
- [ ] Konfliktverhalten mit `version` und `409 Conflict` umsetzen.
- [ ] Serverantworten fuer Cache-Header und Sync-Metadaten strukturieren.

### Stabiler Stand

- [ ] Die App bleibt im Flugmodus lesbar und fuer gespeicherte Routen nutzbar.
- [ ] Nutzer versteht jederzeit, welche Daten alt sind.
- [ ] Nach Reconnect synchronisieren einfache Aenderungen sauber.

### Testbare Abnahme

- [ ] E2E Test simuliert Offline nach geladenem Trip und oeffnet Today.
- [ ] Unit Tests pruefen stale-Berechnung.
- [ ] API Tests pruefen Versionskonflikte.
- [ ] E2E Test erstellt offline eine lokale Notiz/Aktion und synchronisiert nach Reconnect.

## Phase 13: Auth, Accounts und einfache Zusammenarbeit

### Produkt

- [ ] Accountpflicht und Gast-/Demo-Modus final entscheiden.
- [ ] Rollen fuer Trip-Mitglieder definieren: owner, editor, viewer.
- [ ] Kollaboration fuer Phase 1 begrenzen: Einladung und gemeinsames Lesen/Bearbeiten, keine komplexen Merges.

### Backend

- [ ] E-Mail Login implementieren.
- [ ] Apple und Google Login vorbereiten oder integrieren.
- [ ] User, AuthIdentity und Sessions absichern.
- [ ] TripMember Rollen erzwingen.
- [ ] Versionierte Schreiboperationen mit Konfliktantworten umsetzen.

### Frontend

- [ ] Login- und Account-Screens bauen.
- [ ] Geschuetzte Routen einrichten.
- [ ] Invite Flow fuer Trip-Mitglieder bauen.
- [ ] Konflikthinweis bei veralteten Daten anzeigen.

### Stabiler Stand

- [ ] Echte Nutzer koennen eigene Trips besitzen.
- [ ] Ein Trip kann kontrolliert geteilt werden.
- [ ] Die App ist bereit fuer persoenliche Offline- und Premium-Funktionen.

### Testbare Abnahme

- [ ] Auth Integration Tests fuer Login, Session und Logout.
- [ ] API Authorization Tests fuer owner/editor/viewer.
- [ ] E2E Test loggt sich ein, erstellt Trip und laedt ein zweites Mitglied ein.
- [ ] Konflikttest erzeugt `409` und zeigt Reload-Hinweis.

## Phase 14: Admin MVP und Content Operations

### Produkt

- [ ] Minimale Admin-Prozesse definieren: Spot anlegen, uebersetzen, freischalten, Bild setzen.
- [ ] Moderationsprozess fuer Community Reports als spaeteren oder Beta-Scope schneiden.
- [ ] Content-Qualitaetskriterien fuer safety-relevante Spots definieren.

### Backend

- [ ] Admin Auth und Berechtigung einfuehren.
- [ ] Admin Endpoints fuer Spots, Kategorien, Translations und Media bauen.
- [ ] Object Storage lokal mit MinIO anbinden.
- [ ] Audit Events fuer Admin-Aenderungen speichern.

### Frontend Admin

- [ ] Admin Listenansicht fuer Spots bauen.
- [ ] Spot Editor mit Map-Pin, Kategorien und Status-relevanten Road Segment IDs bauen.
- [ ] Translation Editor fuer Deutsch, Englisch, Isländisch vorbereiten.
- [ ] Bild-Upload und Preview bauen.

### Stabiler Stand

- [ ] Neue Spots koennen ohne Code-Deploy gepflegt werden.
- [ ] Content-Aenderungen sind auditierbar.
- [ ] Die Mobile App kann von Admin-gepflegten Daten leben.

### Testbare Abnahme

- [ ] API Tests fuer Admin CRUD und Berechtigungen.
- [ ] E2E Admin Smoke legt Spot an und sieht ihn in Mobile Explore nach Refresh.
- [ ] Upload Test speichert und laedt Bildmetadaten.
- [ ] Audit Test prueft Aenderungsverlauf.

## Phase 15: Push, Re-Checks und Premium-Basis

### Produkt

- [ ] Kostenlose Safety-Basis und Premium-Komfort sauber trennen.
- [ ] Premium-Flags definieren: 15-Min-Rechecks, Vorabendwarnungen, Statusverschlechterung en route, Offline-Erweiterung.
- [ ] Push Permission Flow nutzerfreundlich schneiden.
- [ ] Benachrichtigungstexte fuer Warnungen konkret und nicht alarmistisch formulieren.

### Backend

- [ ] FeatureFlags und Entitlements implementieren.
- [ ] PushToken Speicherung bauen.
- [ ] Notifications Evaluate Job bauen.
- [ ] Re-check Intervall nach Entitlement unterscheiden.
- [ ] Trial-Entitlement fuer 14 Tage vorbereiten.

### Frontend

- [ ] Profile Premium Card bauen.
- [ ] Toggle fuer Safety Notifications bauen.
- [ ] Push Permission Flow integrieren.
- [ ] Entitlement State in UI nutzen.
- [ ] Paywall noch als nicht-kaufender Platzhalter oder Trial-Flow umsetzen.

### Stabiler Stand

- [ ] Premium-Wert ist im Produkt sichtbar, auch bevor echte Payments live sind.
- [ ] Re-checks und Warnungen laufen systemisch, nicht nur als UI-Versprechen.
- [ ] Basiswarnungen bleiben weiterhin sichtbar ohne Premium.

### Testbare Abnahme

- [ ] Unit Tests fuer Feature Flag und Entitlement Checks.
- [ ] Integration Test erzeugt Statusverschlechterung und Notification Candidate.
- [ ] E2E Test sieht Premium Card und aktivierbare Safety Toggles.
- [ ] Push-spezifische Plattformtests werden fuer Mobile Build dokumentiert.

## Phase 16: Affiliate-Kontexte und Partnerangebote

### Produkt

- [ ] Affiliate-Kontexte priorisieren: Mietwagen bei Fahrzeug ungebucht, Unterkuenfte bei Roadtrip, Touren bei Spots.
- [ ] Disclosure-Copy fuer EU/Deutschland finalisieren.
- [ ] Ranking-Kriterien pro Angebotstyp dokumentieren.
- [ ] Sicherheitsinformationen strikt von Werbung trennen.

### Backend

- [ ] AffiliatePartner, AffiliateOffer, AffiliateClick und AffiliateDisclosure modellieren.
- [ ] Redirect/Tracking Endpoint bauen.
- [ ] Kontextbasierte Offer-Auswahl implementieren.
- [ ] Adminpflege fuer Partnerangebote vorbereiten.

### Frontend

- [ ] Template-Angebot fuer Mietwagen bauen.
- [ ] Spot-nahe Tourangebote klar als Partnerangebot darstellen.
- [ ] Clickout Flow mit Disclosure bauen.
- [ ] Keine Affiliate CTA als primaere Sicherheitsaktion verwenden.

### Stabiler Stand

- [ ] Monetarisierung ist testbar, ohne das Safety-Versprechen zu beschaedigen.
- [ ] Angebote erscheinen nachvollziehbar aus Nutzerintention heraus.

### Testbare Abnahme

- [ ] API Tests pruefen Offer-Auswahl und Click Tracking.
- [ ] E2E Test sieht Disclosure vor Partner-Clickout.
- [ ] Review Check bestaetigt: keine Werbung wirkt wie offizielle Sicherheitsempfehlung.

## Phase 17: Mobile Builds, App-Qualitaet und Release Readiness

### Mobile

- [ ] Capacitor iOS und Android Projekte erzeugen.
- [ ] Deep Links und Rueckkehr aus Maps testen.
- [ ] Safe Areas, Dynamic Island und Bottom Navigation auf Zielgeraeten pruefen.
- [ ] Push auf iOS und Android integrieren oder fuer Release explizit deaktivieren.
- [ ] Offline-Verhalten auf echten Geraeten testen.

### Qualitaet

- [ ] Performance-Budget fuer Startzeit, Explore-Ladezeit und Karteninteraktion definieren.
- [ ] Accessibility Check fuer Kontrast, Labels und farbunabhaengige Statusanzeige.
- [ ] Error Tracking und Logging integrieren.
- [ ] Datenschutz- und Impressumsanforderungen klaeren.
- [ ] App Store/Play Store Texte und Screens vorbereiten.

### Stabiler Stand

- [ ] Eine installierbare Test-App laeuft auf iOS und Android.
- [ ] Kernflow funktioniert auf Geraeten: Onboarding -> Explore -> Details -> Today -> Maps -> Rueckkehr.
- [ ] Bekannte Risiken sind dokumentiert und priorisiert.

### Testbare Abnahme

- [ ] Device Smoke Test auf mindestens einem iPhone und einem Android Geraet.
- [ ] E2E oder manuelles Testprotokoll fuer Maps-Rueckkehr.
- [ ] Lighthouse/PWA Check fuer Web-Build.
- [ ] Accessibility Smoke Check fuer die wichtigsten Screens.
- [ ] Release Candidate hat keine kritischen offenen Bugs.

## Empfohlene MVP-Schnittlinie

Fuer einen ersten wirklich nutzbaren MVP sollte der Schnitt nach Phase 10 liegen, aber mit reduziertem Umfang:

- [ ] Onboarding fuer Typ 2 Hub-Planer.
- [ ] Explore mit echtem oder mocked Kartenlayer.
- [ ] Spot Details mit erklaerten Statusgruenden.
- [ ] Tagesroute mit manuellem Fortschritt und Maps-Export.
- [ ] Deterministische Status Engine.
- [ ] Mindestens eine echte Datenquelle oder production-nahe Fixture-Ingestion.
- [ ] Fahrzeiten ueber RoutingProvider, falls noetig initial mit Mock-Fallback.
- [ ] Offline-Lesen fuer aktive Route als Beta-Feature.

## Laufende Definition of Done fuer jedes Ticket

- [ ] Ticket ist gegen eine konkrete User Journey oder Systemfaehigkeit formuliert.
- [ ] Akzeptanzkriterien enthalten mindestens einen erfolgreichen und einen Fehler-/Edge-Case.
- [ ] UI-Zustände fuer Loading, Empty, Error und Offline sind bedacht, wenn relevant.
- [ ] Sicherheitsrelevante Texte nennen Grund, Quelle und Zeitstempel.
- [ ] Statuslogik liegt nicht dupliziert in Frontend und Backend.
- [ ] Neue API-Felder sind im Contract dokumentiert.
- [ ] Automatisierte Tests decken neue Logik ab.
- [ ] Mindestens ein Smoke Test bestaetigt, dass die App weiter startet.
- [ ] Demo-Daten bleiben konsistent und erlauben eine kurze Produktdemo.
- [ ] Keine Phase endet mit einem Zustand, in dem der Hauptflow bewusst kaputt ist.

## Demo-Skript fuer stabile Zwischenstaende

Dieses Demo-Skript sollte nach jedem relevanten Milestone funktionieren oder bewusst mit einem dokumentierten Ersatzpfad angepasst werden:

- [ ] App starten.
- [ ] Falls noetig einloggen oder Demo-Modus waehlen.
- [ ] Onboarding abschliessen: Englisch/Deutsch, Hub-Planer, 13-22 Mai, 2WD oder 4WD, Reykholt Cabin.
- [ ] Explore oeffnen und Datenalter sehen.
- [ ] Filter oeffnen und Status/Fahrzeug veraendern.
- [ ] Seljalandsfoss oeffnen und Warnungsgrund sehen.
- [ ] Spot zur heutigen Route hinzufuegen.
- [ ] Insert- oder Create-Route-Flow abschliessen.
- [ ] Today oeffnen, naechsten Stopp sehen und Navigation starten.
- [ ] Rueckkehr aus Maps simulieren und Stopp als erledigt markieren.
- [ ] Trip Tab oeffnen und den Tagesplan sehen.
- [ ] Offline/Stale-Zustand simulieren und klare Hinweise sehen.
