# IslandHub UX-Konzept

Stand: 2026-05-25

## 0. Produktprinzipien

### Kernversprechen

Ich sehe morgens sofort, welche meiner gespeicherten Island-Ziele heute sinnvoll, sicher und erreichbar sind.

### Primäres UX-Modell

Nicht Tag 1, Tag 2, Tag 3, sondern:

- Hub: Unterkunft, Campingplatz oder Startpunkt
- Ideen-Pool: Wunschspots rund um diesen Hub
- Live-Bewertung: Wetter, Straßenstatus, Fahrzeugtyp und Tageslicht
- Heute-Route: Aus sicheren oder akzeptablen Spots wird eine aktive Tagesroute

### Empfohlene Informationsarchitektur

Mobile Bottom Navigation mit vier Hauptbereichen:

1. Explore: Karte, Spots, Ampelstatus, Vorschläge
2. Heute: aktive Tagesroute und Navigation
3. Reise: Hubs, Zeitraum, Fahrzeug, Roadtrip-Etappen
4. Profil: Sprache, Premium, Offline, Sicherheit, Meldungen

Damit bleibt die App auch für Typ 2 und Typ 3 logisch: Explore ist die Entscheidungsfläche, Heute ist die Ausführungsfläche.

## 1. Das Gating-Onboarding

### Ziel des Onboardings

Das Onboarding darf nicht wie ein Formular wirken. Es muss die zentrale Weiche beantworten:

In welcher Planungsphase bist du gerade?

Daraus entstehen drei Produktpfade:

- Typ 1: Träumer
  Noch nichts gebucht. Braucht Inspiration, grobe Route, Reisezeitraum, Fahrzeug- und Unterkunftsempfehlungen.
- Typ 2: Hub-Planer
  Hat eine oder mehrere Unterkünfte. Will wissen, welche Tagesausflüge von dort aus heute oder an bestimmten Tagen sinnvoll sind.
- Typ 3: Roadtripper
  Hat eine Rundreise oder will eine planen. Braucht Etappenlogik, Vorabendwarnungen, alternative Stops und Sicherheitsbewertung.

### Onboarding-Schritte

#### Step 1: Sprachwahl

- UI: Deutsch / English als große Segment-Auswahl
- Später: weitere Sprachen
- Begründung: Direkt am Anfang, weil Sicherheitswarnungen verständlich sein müssen

#### Step 2: Planungsphase

Drei große Optionen:

1. Ich sammle noch Ideen
2. Ich habe eine Unterkunft / einen Standort
3. Ich plane eine Rundreise

Jede Option hat eine kurze, praktische Beschreibung, keine Marketingtexte.

#### Step 3: Reisezeitraum

- Auswahl: Ich kenne meine Daten oder Ich bin flexibel
- Bei festen Daten: Date Range Picker
- Bei flexiblen Daten: Monat/Saison-Auswahl, z. B. Mai/Juni, Sommer, Polarlichter, Highlands
- Vision Feature: Beste Reisezeit finden und günstige Zeiträume vergleichen über Flug-, Hotel- und Mietwagen-Affiliates
- MVP später: fester Zeitraum

#### Step 4: Fahrzeug

- Erstmal nur:
  - 2WD
  - 4WD
  - Noch nicht gebucht
- Wenn Noch nicht gebucht: App kann später Fahrzeugempfehlungen aus der geplanten Route ableiten
- F-Roads werden bei 2WD standardmäßig ausgeblendet, aber über einen Filter F-Roads anzeigen sichtbar gemacht. Dann klar markiert: Nur mit 4WD erlaubt

#### Step 5: Hub oder Route

Je nach Typ:

- Typ 1: Auswahl eines Routen-Templates
- Typ 2: Unterkunft per Adresse, Unterkunftsname oder Karten-Pin hinzufügen
- Typ 3: mehrere Hubs oder Etappen hinzufügen

#### Step 6: Datenschutz und Datenquellen

- Kurzer Screen: IslandHub nutzt Wetter- und Straßendaten von Veður.is und Vegagerðin
- Standortfreigabe optional, aber empfohlen
- Push-Mitteilungen optional: Warn mich, wenn meine morgige Route kritisch wird
- Affiliate-Hinweis nur dort, wo Angebote erscheinen, nicht pauschal im Onboarding

## 2. Screen-by-Screen Spezifikation

### Screen A: Onboarding-/Gating-Screen

Ziel: Nutzertyp erkennen und App-Konfiguration starten.

#### Layout mobile-first

- Oben: ruhige Wortmarke IslandHub
- Darunter: Frage Wo stehst du gerade?
- Drei große Auswahlflächen, aber nicht verspielt-cardlastig. Eher klare Listenmodule mit Icon, Titel und einer Zeile Beschreibung
- Unten: primärer Button Weiter
- Sekundär: Erstmal ohne Daten erkunden

#### UI-Elemente

- Segmentierte Sprachwahl oben rechts oder im ersten Step
- Auswahlkarten:
  - Ich sammle noch Ideen
  - Ich habe einen festen Standort
  - Ich plane eine Rundreise
- Progress Indicator: 1 von 5
- Button-Zone im unteren Daumenbereich

#### Interaktion

- Nutzer tippt eine Option an
- Button Weiter wird aktiv
- Tap auf Weiter navigiert zum passenden Onboarding-Pfad

#### Design

- Schwarz/Weiß als Basis
- Viel Weißraum, klare Linien, 8px Radius
- Statusfarben noch sparsam, da Ampellogik erst nach Konfiguration relevant wird

### Screen B: Explore-Dashboard

Ziel: Morgendliche Entscheidungsfläche. Was ist heute erreichbar?

#### Layout

- Fullscreen-Karte als Hauptfläche
- Oben: kompakte Kontrollleiste
- Unten: hochziehbares Bottom-Sheet
- Kein klassisches Dashboard mit vielen Karten. Die Karte ist das Produkt

#### Obere Kontrollleiste

- Aktiver Hub: Reykholt Cabin
- Datum: Heute
- Fahrzeug: 2WD
- Datenstatus: Aktualisiert vor 8 Min.
- Filter-Icon

#### Kartenlogik

- Hub als schwarzer Mittelpunkt
- Distanzradien: 30 min, 60 min, 120 min Fahrtzeit
- Pins:
  - Grün: offen und unkritisch
  - Gelb: erreichbar, aber relevante Warnung
  - Rot: gesperrt oder klar nicht empfehlenswert
  - Grau: keine aktuellen Daten oder außerhalb Saison
- Farben zusätzlich mit Symbolen:
  - Grün: Haken
  - Gelb: Ausrufezeichen
  - Rot: Sperrsymbol
  - Grau: Fragezeichen
  Das macht die App farbenblind-freundlicher

#### Bottom-Sheet-Zustände

- Collapsed: Heute gute Optionen: 8
- Half expanded: drei wetteroptimierte Routenvorschläge
- Full expanded: sortierbare Liste aller Spots

#### Routenvorschläge

- Kurze sichere Runde
- Beste Fotospots heute
- Wenig Wind, gute Straßen
- Jeder Vorschlag zeigt:
  - Dauer
  - Fahrzeit netto
  - Anzahl Stopps
  - höchster Risikostatus
  - Tour-/Affiliate-Hinweis, falls relevant

#### Primäre Interaktionen

- Tap auf Pin -> Screen C Spot Details
- Tap auf Routenvorschlag -> Vorschau im Bottom-Sheet
- Button Als heutige Route starten -> Screen D
- Filter-Button -> Filter-Sheet
- Tab Heute -> Screen D, falls Route existiert

### Screen C: Spot-Details

Ziel: Entscheidung ermöglichen. Spot heute einplanen, meiden, Tour buchen oder Alternative wählen.

#### Layout

- Oben: Hero-Bild des Spots
- Darüber oder darunter: Status-Badge mit Klartext
- Content: Distanz, Fahrzeit, Straßenzustand, Wettergrund, Fahrzeughinweis
- Unten sticky: primärer Aktionsbutton

#### Beispiel bei gelbem Status

- Titel: Seljalandsfoss
- Status: Gelb: Starker Wind
- Begründung: Windböen bis 24 m/s. Vorsicht beim Öffnen von Autotüren. Gischt und rutschige Wege wahrscheinlich.
- Straße: Offen laut Vegagerðin
- Wetterquelle: Veður.is, aktualisiert 07:42
- Fahrzeug: Für 2WD geeignet
- Empfehlung: Heute möglich, aber kurzer Aufenthalt empfohlen.

#### Primäre Buttons je Status

- Grün: Zur Route hinzufügen
- Gelb: Trotz Warnung hinzufügen
- Rot: Alternative suchen
- Grau: Daten aktualisieren

#### Sekundäre Aktionen

- Speichern
- Teilen
- Problem melden
- Tour ansehen bei passenden Spots, klar markiert als Partnerangebot

Wichtig:
Gelb und Rot dürfen nicht nur visuell sein. Der Grund muss explizit erklärt werden. Eine gelbe Warnung ohne Begründung zerstört Vertrauen.

### Screen D: Aktive Tagesroute

Ziel: Aus Entscheidung wird Ausführung.

#### Layout

- Oben: Tagesstatus
  - Heute: 4 Stopps
  - Netto-Fahrzeit: 3 h 20 min
  - Letzte Prüfung: vor 8 Min.
- Darunter: chronologische Timeline
- Unten sticky:
  - Nächsten Stopp navigieren
  - daneben Icon-Button für Google/Apple Maps Export

#### Timeline-Elemente

- Start: Hub
- Stopp 1
- Stopp 2
- Stopp 3
- Rückkehr zum Hub oder nächster Hub
- Jedes Element zeigt:
  - Statusfarbe
  - Fahrzeit seit vorherigem Stopp
  - Aufenthaltsdauer
  - Warnhinweis, falls Status Gelb/Rot
  - Drag Handle zum manuellen Sortieren

#### Routenlogik

Beim Hinzufügen eines neuen Spots berechnet die App nicht blind ans Ende.

Stattdessen:

1. Prüfen, ob aktive Route existiert
2. Besten Einfügepunkt nach Fahrzeit, Öffnungszeit, Tageslicht und Sicherheitsstatus berechnen
3. Nutzer bekommt ein Insert-Sheet:
   - Empfohlen zwischen Stopp 1 und 2
   - +22 Min Fahrzeit
   - Button So einfügen
   - Sekundär Ans Ende setzen

Bei Rot: Route bleibt möglich, aber zeigt Warn-Dialog vor dem Einfügen.

#### Navigationsexport

Empfehlung: zwei Modi.

- Robust: Nächsten Stopp navigieren öffnet Google/Apple Maps nur für den nächsten Zielpunkt
- Komplett: Gesamte Route öffnen, wenn Anbieter und Plattform Multi-Stop zuverlässig unterstützen

Grund: Google/Apple Maps verhalten sich je nach Plattform, URL-Schema und Zwischenstopps unterschiedlich. Für UX-Sicherheit ist der nächste Stopp der wichtigste Flow.

## 3. Lückenloser User Flow und Navigations-Matrix

### Szenario Typ 1: Template zu Mietwagen-Empfehlung

Ausgangslage: Nutzer hat noch nichts gebucht.

1. Nutzer öffnet App
2. Screen A zeigt Frage Wo stehst du gerade?
3. Nutzer tippt auf Ich sammle noch Ideen
4. Button Weiter wird aktiv
5. Nutzer tippt Weiter
6. App zeigt Reisezeitraum-Step
7. Nutzer wählt z. B. Juni oder feste Daten
8. App zeigt Template-Auswahl:
   - Ringstraße kompakt
   - Südküste und Golden Circle
   - Snæfellsnes
   - Highlands nur mit 4WD
9. Nutzer tippt auf Template Südküste und Golden Circle
10. App öffnet Template-Detail mit Dauer, Regionen, Risiko, empfohlenem Fahrzeug
11. Nutzer tippt Diese Reise planen
12. App fragt: Hast du schon ein Auto?
13. Nutzer wählt Nein
14. App zeigt Mietwagen-Empfehlung:
   - Für diese Route reicht meist 2WD
   - oder 4WD empfohlen wegen F-Roads, Winter oder Highlands
15. CTA: Partnerangebote für Mietwagen ansehen
16. Tap öffnet Affiliate-Vergleich oder WebView

#### Rechtlicher Hinweis Deutschland/EU

- Angebote müssen klar als Werbung oder Partnerangebot gekennzeichnet sein
- Beispiel: Anzeige / Partnerangebot: Wir können eine Provision erhalten, wenn du buchst
- Keine versteckte Empfehlung als objektiv beste Wahl, wenn Provisionen Einfluss auf Reihenfolge haben
- Ranking-Kriterien offenlegen: Preis, Fahrzeugklasse, Verfügbarkeit, Partnerstatus

#### UX-Begründung

Der Affiliate erscheint nicht zufällig, sondern als direkte Folge einer echten Planungsentscheidung. Dadurch fühlt er sich hilfreich statt störend an.

### Szenario Typ 2: Gelber Pin zu Spot Details zu Tagesroute

Ausgangslage: Nutzer hat einen Hub und öffnet morgens Explore.

1. Nutzer öffnet App
2. App landet auf Screen B Explore
3. Karte ist auf aktiven Hub zentriert
4. Pins sind live bewertet
5. Nutzer sieht gelben Pin
6. Nutzer tippt auf den gelben Pin
7. Screen C öffnet sich als Detailansicht
8. Screen C zeigt:
   - Hero-Bild
   - Gelben Status
   - exakten Warnungsgrund
   - Quelle und Aktualisierungszeit
9. Nutzer tippt auf Trotz Warnung hinzufügen
10. App prüft:
   - Gibt es eine aktive Tagesroute?
   - Passt Spot zum Fahrzeug?
   - Ist die Straße offen?
   - Wie verändert sich Fahrzeit?
11. Wenn aktive Route existiert:
   - Insert-Sheet erscheint
   - Text: Empfohlen zwischen Geysir und Gullfoss
   - Zusatz: +18 Min Fahrzeit, Status Gelb bleibt aktiv
12. Nutzer tippt So einfügen
13. App wechselt zu Screen D Aktive Tagesroute
14. Neuer Spot ist in der Timeline hervorgehoben
15. Timeline zeigt gelben Warnhinweis direkt am Stopp

#### Timeline-Logik bei neuem Punkt

- Die App berechnet den besten Platz nicht nur nach Entfernung, sondern nach:
  - Fahrzeitmatrix
  - Straßenstatus
  - Tageslichtfenster
  - Öffnungszeiten, falls vorhanden
  - Nutzerpräferenz, z. B. kurze Runde vs. lange Runde
- Der Nutzer darf die Empfehlung überschreiben
- Jede manuelle Änderung triggert eine neue Sicherheitsprüfung
- Wenn sich Status währenddessen ändert, erscheint ein Update-Banner:
  Status geändert: Seljalandsfoss ist jetzt Rot wegen Straßensperrung.

### Szenario Typ 3: Roadtripper kommt aus Google Maps zurück

Ausgangslage: Nutzer hat von Screen D aus Google Maps geöffnet.

#### Was technisch realistisch ist

Die App kann nicht garantiert wissen, dass der Nutzer den Stopp erreicht hat, nur weil er aus Google Maps zurückkehrt. Möglich sind:

- Sicher: Nutzer bestätigt manuell
- Optional: Standortbasierte Erkennung mit Berechtigung
- Fortgeschritten: Geofence um Ziel, Hintergrund-Standort, Batteriethema, Datenschutzdialog

#### Empfohlene UX

1. Nutzer kehrt aus Google Maps zurück
2. App öffnet Screen D und zeigt ein Rückkehr-Sheet:
   - Bist du bei Skógafoss angekommen?
   - Buttons:
     - Als erledigt markieren
     - Weiter navigieren
     - Noch nicht angekommen
3. Wenn Nutzer Als erledigt markieren tippt:
   - Timeline setzt Stopp auf erledigt
   - Nächster Stopp wird hervorgehoben
   - Button unten ändert sich auf Nächsten Stopp navigieren
4. Wenn Nutzer Weiter navigieren tippt:
   - App öffnet erneut Google/Apple Maps zum selben Ziel
5. Wenn Nutzer Noch nicht angekommen tippt:
   - Timeline bleibt unverändert
   - App zeigt aktuellen Status und Alternativen

#### Roadtripper-spezifische Oberfläche

- Oben: heutige Etappe, z. B. Vík -> Höfn
- Fortschritt: 2 von 5 Stopps erledigt
- Warnbereich: Morgige Etappe: Gelb wegen Wind auf Route 1
- CTA: Morgen prüfen oder Alternative Übernachtung suchen
- Partnerangebote nur kontextuell:
  - Unterkunft bei gefährdeter Etappe
  - Tour bei sicherem Wetterfenster
  - Premium bei automatischen Vorabendwarnungen

## 4. Edge Cases und Logik-Validierung

### Edge Case 1: Nutzer klickt Zur Route hinzufügen, aber keine aktive Route existiert

Problem:
Screen C kennt einen Spot, aber Screen D hat noch keine Route.

Lösung:
Kein Fehlerdialog. Stattdessen ein klares Create-Route-Sheet.

Ablauf:

1. Nutzer tippt Zur Route hinzufügen
2. App erkennt: keine aktive Route
3. Bottom-Sheet erscheint:
   - Titel: Neue Tagesroute erstellen?
   - Option 1: Für heute erstellen
   - Option 2: Für später planen
   - Option 3: Nur speichern
4. Nutzer tippt Für heute erstellen
5. App erstellt Route:
   - Start = aktueller Hub
   - Ziel = gewählter Spot
   - Rückkehr = Hub, falls Hub-Modell
   - oder nächster Hub, falls Roadtrip-Modus
6. App wechselt zu Screen D
7. Timeline zeigt neue Route

Warum so:
Der Nutzer hat eine klare Absicht. Die App sollte diese Absicht auffangen und nicht mit Bitte erst Route erstellen blockieren.

### Edge Case 2: Gelber Status ist auf Karte, Details und Route unterschiedlich

Ziel: Absolute Konsistenz.

Empfohlenes technisches Modell: Single Source of Truth

```text
SpotStatus {
  spotId
  status: green | yellow | red | unknown
  reasons[]
  roadStatus
  weatherStatus
  vehicleCompatibility
  sourceTimestamps
  calculatedAt
  validUntil
  version
}
```

Alle Screens lesen denselben Status-Record:

- Screen B Karte zeigt aggregierten Status
- Screen C Details zeigt denselben Status plus Begründung
- Screen D Timeline zeigt denselben Status im Routenkontext

Wichtig:
Screen D darf keine eigene alte Wahrheit anzeigen. Wenn eine Route erstellt wird, kann sie zwar einen Snapshot speichern, aber UI muss live prüfen:

- Status beim Hinzufügen: Grün
- Aktueller Status: Gelb seit 07:42

So bleibt nachvollziehbar, warum sich Dinge ändern.

#### Konsistenzregeln

1. Statusänderung triggert UI-Update überall
   - Karte, Detail und Timeline verwenden denselben Store
2. Jeder Status hat einen Zeitstempel
   - Beispiel: Aktualisiert vor 8 Min.
3. Jeder Status hat eine Begründung
   - Nicht nur Gelb, sondern Windböen, F-Road, Sperrung, Eis, fehlende Daten
4. Bei widersprüchlichen Quellen gewinnt Sicherheit
   - Wenn Wetter Grün, Straße Rot -> Gesamtstatus Rot
   - Wenn Straße offen, aber Wind gefährlich -> Gelb
   - Wenn Daten alt oder unvollständig -> Grau oder Gelb, je nach Risiko
5. Manuelle Nutzerberichte sind Hinweise, keine offiziellen Statusdaten
   - Beispiel: Parkplatz kostet jetzt Geld beeinflusst Content
   - Beispiel: Straße gesperrt wird als Community-Hinweis angezeigt, aber nicht gleich offizieller Rot-Status ohne Bestätigung

## 5. Premium- und Affiliate-Logik

Ich würde Affiliate und Premium kombinieren, aber sauber trennen.

### Affiliate eignet sich für

- Mietwagen
- Unterkünfte
- Camper
- geführte Touren
- Whale Watching
- Gletscherwanderungen
- Blaue Lagune, Sky Lagoon und Aktivitäten
- flexible Umbuchungsoptionen bei Wetterproblemen

### Premium eignet sich für

- Live-Wetter- und Straßenupdates mit höherer Frequenz
- Vorabendwarnung für morgige Etappe
- automatische Alternativrouten
- Offline-Routen
- mehrere Hubs / komplexe Roadtrips
- Wetterfenster-Erkennung
- Was ist heute sicher? als täglicher Smart Plan
- Push-Warnungen

### Wichtige Produktregel

Sicherheitskritische Basiswarnungen sollten nicht komplett hinter Premium verschwinden. Rot und Gelb muss sichtbar bleiben. Premium darf bessere Planung, frühere Warnung und Komfort verkaufen, nicht grundlegende Sicherheit verstecken.

### Empfohlene Monetarisierung

- Kostenlos: Explore, Spots speichern, Basisampel, manuelle Route
- Affiliate: kontextuelle Empfehlungen
- Premium: Live-Planung, Vorabendwarnungen, Alternativen, Offline, Roadtrip-Komfort

Das ist stärker als nur Affiliate, weil IslandHub dann nicht nur bei Buchung monetarisiert, sondern auch während der Reise echten Nutzwert liefert.

## 6. Visuelle Richtung

### Stil

Skandinavisch, minimal, ruhig, präzise.

### Farbwelt

- Primär: Schwarz / Weiß / warme Graustufen
- Statusfarben pastel:
  - Grün: gedämpftes Moosgrün
  - Gelb: weiches Ocker
  - Rot: entsättigtes Signalrot
- Keine grellen Reise-App-Verläufe
- Keine überladenen Karten-Overlays

### Typografie

- Klare Sans Serif
- Große Zahlen für Fahrzeit und Status
- Kurze, konkrete Sicherheitscopy

### Tonality

- Nicht dramatisch
- Nicht touristisch überdreht
- Eher: klar, hilfreich, verlässlich

Beispiel:

- Schlecht: Achtung! Gefährliche Bedingungen!
- Besser: Starker Wind. Türen vorsichtig öffnen. Aufenthalt kurz halten.

## 7. Wichtigste Produktentscheidungen

1. Explore ist die tägliche Entscheidungszentrale
2. Heute ist die Ausführungszentrale
3. Jeder Status braucht Quelle, Zeit und Begründung
4. Gelb ist kein Blocker, sondern ein erklärter Risikozustand
5. Rot blockiert nicht hart, verlangt aber bewusste Bestätigung oder Alternative
6. Google/Apple Maps Export zuerst pro nächstem Stopp, Multi-Stop später optional
7. Roadtrip-Fortschritt wird manuell bestätigt, optional standortgestützt
8. Affiliate ist transparent markiert und kontextuell
9. Premium verkauft Planungsintelligenz, nicht versteckte Sicherheit

## 8. Nächste sinnvolle Ableitungen

1. App-Sitemap mit Zustandsmodell
2. Wireframe-Konzept pro Screen mit Komponentenliste
3. Monetarisierungsmodell im Detail: Affiliate vs. Premium vs. Hybrid
4. Technische Datenarchitektur für Wetter-, Straßen- und Routing-Status
