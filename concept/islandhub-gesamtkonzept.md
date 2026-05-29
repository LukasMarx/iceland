# IslandHub Gesamtkonzept

Stand: 2026-05-25

## 1. Produktidee und Zielbild

IslandHub ist eine mobile-first Reise-App fuer Island, die feste Reiseplaene bewusst aufbricht. Das Produkt folgt nicht dem klassischen Muster Tag 1, Tag 2, Tag 3, sondern dem Realitaetsmodell einer Island-Reise: Wetter, Wind, Strassenzustaende, Fahrzeugtyp und Tageslicht entscheiden taeglich neu, was sinnvoll und sicher machbar ist.

Das Kernversprechen lautet: Der Nutzer sieht morgens sofort, welche seiner gespeicherten Ziele heute erreichbar, sinnvoll und sicher sind.

Die App verbindet dafuer drei Ebenen:

- Planungsebene: Reisezeitraum, Hubs, Roadtrip-Etappen, Fahrzeug, Interessen
- Entscheidungsebene: Live-Bewertung aller relevanten Spots fuer heute
- Ausfuehrungsebene: Aktive Tagesroute mit Fortschritt, Re-Checks und Navigations-Export

Passende Screens:

- [Welcome / Language](./screens/01%20_%20Welcome%20_%20Language.png)
- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Active timeline](./screens/Active%20timeline.png)
- [Trip tab](./screens/Trip%20tab%20_%20hubs_%20dates_%20day%20plan.png)

## 2. Produktprinzipien

### 2.1 Safety-first statt Bucket-List-first

IslandHub priorisiert Verlaesslichkeit vor Inspiration, ohne die Inspiration zu verlieren. Ein Spot wird nicht nur gezeigt, sondern erklaert: offen, warnbehaftet, geschlossen oder ohne belastbare Daten.

### 2.2 Hub-and-Spoke als Kernmodell

Viele Island-Reisen basieren auf einem festen Hub. Von dort aus entstehen flexible Tagesausfluege. Die App muss dieses Verhalten besser unterstuetzen als starre Kalender- oder Listen-Apps.

### 2.3 Roadtrip als Sonderfall desselben Systems

Roadtrips werden nicht als voellig anderes Produkt behandelt, sondern als Kette mehrerer Hubs oder Etappen. Dadurch bleibt die Informationsarchitektur konsistent.

### 2.4 Transparenz erzeugt Vertrauen

Jeder Status braucht Quelle, Zeitstempel und Begruendung. Sicherheitshinweise duerfen nicht nur aus Farben bestehen.

### 2.5 Monetarisierung nur kontextuell

Affiliate-Angebote erscheinen als Folge echter Nutzerintention. Premium verkauft Komfort, Re-Checks und Automatisierung, nicht die Basis-Sicherheitslage.

Passende Screens:

- [Caution / Seljalandsfoss](./screens/Caution%20_%20Seljalandsfoss%20_%20wind.png)
- [Closed / Kerlingarfjoll](./screens/Closed%20_%20Kerlingarfj_ll%20_%20road.png)
- [No data / stale ford](./screens/No%20data%20_%20_rsm_rk%20_%20stale%20ford.png)
- [Profile / Premium](./screens/Profile%20tab%20_%20safety_%20offline_%20premium.png)

## 3. Zielgruppen und Nutzertypen

IslandHub adressiert drei Nutzertypen, die in unterschiedliche Produktpfade geleitet werden.

### 3.1 Typ 1: Der Traeumer

Der Nutzer hat noch nichts oder noch nicht alles gebucht. Er braucht Inspiration, Routenvorlagen, Saison-Orientierung und Fahrzeugempfehlungen.

Ziel der App:

- sinnvolle Templates zeigen
- Fahrzeugbedarf aus Route und Saison ableiten
- Affiliate-Einstieg fuer Mietwagen, Unterkunft, Touren schaffen

Passende Screens:

- [Planning phase](./screens/02%20_%20Planning%20phase.png)
- [Travel dates](./screens/03%20_%20Travel%20dates.png)
- [Templates with car offer](./screens/Templates%20with%20car%20offer.png)

### 3.2 Typ 2: Der Hub-Planer

Der Nutzer hat eine Unterkunft oder einen festen Standort und will taeglich entscheiden, welche Ziele von dort aus heute machbar sind.

Ziel der App:

- Hub definieren
- Ideen-Pool rund um den Hub aufbauen
- morgens auf einen Blick sichere Optionen sehen
- Spots in eine Tagesroute ueberfuehren

Passende Screens:

- [Hub input / Type 2](./screens/05a%20_%20Hub%20input%20_%20Type%202.png)
- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Insert into route](./screens/Insert%20into%20route.png)

### 3.3 Typ 3: Der Roadtripper

Der Nutzer plant oder faehrt eine Rundreise mit mehreren Stopps. Er braucht Etappenlogik, Vorabendwarnungen, Wiedereinstieg nach Navigation und Alternativen bei Veraenderungen.

Ziel der App:

- Etappen und Naechte verwalten
- jeden Tag einzeln bewerten
- Fortschritt sauber tracken
- die naechste Entscheidung nach Rueckkehr aus Maps schnell machen

Passende Screens:

- [Multi-stage / Type 3](./screens/05b%20_%20Multi-stage%20_%20Type%203.png)
- [Trip tab](./screens/Trip%20tab%20_%20hubs_%20dates_%20day%20plan.png)
- [Return-from-Maps sheet](./screens/Return-from-Maps%20sheet.png)

## 4. Informationsarchitektur

Die App ist in vier Hauptbereiche gegliedert:

1. Explore: Karte, Status, Filter, heutige Vorschlaege
2. Today: aktive Tagesroute, Timeline, Re-Checks, Navigation
3. Trip: Hubs, Daten, Tagesentwuerfe, Roadtrip-Struktur
4. Profile: Sprache, Sicherheit, Offline, Premium, Einstellungen

Diese Struktur trennt Denken, Entscheiden und Fahren sauber voneinander:

- Explore beantwortet: Was ist heute moeglich?
- Today beantwortet: Was mache ich jetzt konkret?
- Trip beantwortet: Wie ist meine Reise insgesamt aufgebaut?
- Profile beantwortet: Welche Regeln, Daten und Komfortfunktionen gelten fuer mich?

Passende Screens:

- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Active timeline](./screens/Active%20timeline.png)
- [Trip tab](./screens/Trip%20tab%20_%20hubs_%20dates_%20day%20plan.png)
- [Profile tab](./screens/Profile%20tab%20_%20safety_%20offline_%20premium.png)

## 5. Onboarding und Gating

Das Onboarding identifiziert nicht nur einen Nutzer, sondern konfiguriert die App fuer Island. Es reduziert Komplexitaet spaeter im Produkt, weil Fahrzeugtyp, Reisezeitraum und Reiseform frueh bekannt sind.

### 5.1 Schritt 1: Sprache und Einstieg

Der erste Screen erklaert knapp das Produktversprechen und laesst den Nutzer Sprache waehlen. Das ist besonders wichtig, weil Sicherheitscopy eindeutig verstanden werden muss.

Passender Screen:

- [Welcome / Language](./screens/01%20_%20Welcome%20_%20Language.png)

### 5.2 Schritt 2: Planungsphase bestimmen

Die App fragt: Wo stehst du in der Planung? Diese Weiche steuert den kuerzesten Pfad durch das Setup.

- Noch Ideen sammeln
- Ich habe einen Hub
- Ich plane eine Rundreise

Passender Screen:

- [Planning phase](./screens/02%20_%20Planning%20phase.png)

### 5.3 Schritt 3: Reisezeitraum festlegen

Der Reisezeitraum ist ein Kernparameter fuer Island. Er beeinflusst Tageslicht, Hochland-Zugang, Wetterrisiken und Routenvorschlaege.

Muss erfasst werden:

- Start- und Enddatum
- Anzahl der Naechte
- optional spaeter: flexible Saisonsuche oder guenstige Zeitraeume

Passender Screen:

- [Travel dates](./screens/03%20_%20Travel%20dates.png)

### 5.4 Schritt 4: Fahrzeuglogik konfigurieren

Der Fahrzeugtyp entscheidet, welche Spots, Routen und F-Roads realistisch sind.

Im ersten Ausbau:

- 2WD
- 4WD
- Noch nicht gebucht

Logik:

- F-Roads sind bei 2WD standardmaessig versteckt
- optional lassen sie sich sichtbar machen, bleiben aber klar markiert
- noch nicht gebucht erlaubt spaeter kontextuelle Mietwagenempfehlungen

Passende Screens:

- [Vehicle](./screens/04%20_%20Vehicle.png)
- [Vehicle alt](./screens/03%20_%20Vehicle.png)

### 5.5 Schritt 5: Reiseform konkretisieren

Je nach Typ wird jetzt entweder ein Hub gesetzt, eine Multi-Stage-Reise angelegt oder ein Template gewaehlt.

Passende Screens:

- [Hub input / Type 2](./screens/05a%20_%20Hub%20input%20_%20Type%202.png)
- [Multi-stage / Type 3](./screens/05b%20_%20Multi-stage%20_%20Type%203.png)
- [Templates with car offer](./screens/Templates%20with%20car%20offer.png)

## 6. Kernscreens und ihre Rolle

### 6.1 Explore

Explore ist die taegliche Entscheidungszentrale. Die Karte ist der Primar-Canvas, nicht nur Dekoration. Der Nutzer sieht den aktiven Hub, relevante Fahrtradien, Pin-Status und wetteroptimierte Routenvorschlaege.

Wichtige UI-Bestandteile:

- Hub, Datum und Fahrzeug in der Kopfzeile
- Letzter Daten-Refresh sichtbar
- Pins mit Status und Symbolik
- Bottom Sheet mit Smart Route, Alternativen und Spotlisten
- Filter fuer Status, Fahrzeug, Fahrzeit und Kategorien

Passende Screens:

- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Filter / Explore](./screens/Filter%20_%20Explore.png)

### 6.2 Spot Details

Spot Details uebersetzen einen Farbstatus in eine Entscheidung. Der Screen muss jede Warnung erklaeren und die naechste Aktion klar machen.

Erforderliche Inhalte:

- Spotname, Region, Kategorie
- Status-Badge mit exaktem Grund
- Fahrzeit und Distanz vom Hub
- Strassenstatus und Wetterquelle
- Fahrzeug-Eignung
- handlungsleitender CTA

Zustandsvarianten:

- caution mit erklaerter Gefahr
- closed mit klarer Sperrursache
- no data bei veralteten oder fehlenden Informationen

Passende Screens:

- [Caution / Seljalandsfoss](./screens/Caution%20_%20Seljalandsfoss%20_%20wind.png)
- [Closed / Kerlingarfjoll](./screens/Closed%20_%20Kerlingarfj_ll%20_%20road.png)
- [No data / stale ford](./screens/No%20data%20_%20_rsm_rk%20_%20stale%20ford.png)

### 6.3 Aktive Tagesroute

Today beziehungsweise die aktive Tagesroute ist die Ausfuehrungsansicht. Sie zeigt, was bereits erledigt wurde, welcher Stopp als naechstes dran ist und welche Risiken sich veraendert haben.

Wichtige Bestandteile:

- Tagesname und Re-Check-Hinweis
- Netto-Fahrzeit, Stops, Tageslicht
- Timeline mit erledigt, aktiv, offen, warnbehaftet
- primarer Button zum Navigieren des naechsten Stops
- Ruecksprunglogik nach Maps

Passende Screens:

- [Active timeline](./screens/Active%20timeline.png)
- [Return-from-Maps sheet](./screens/Return-from-Maps%20sheet.png)

### 6.4 Trip

Trip ist die strategische Reiseansicht. Hier verwaltet der Nutzer seine Hubs, den Reisezeitraum, das Fahrzeug, das Reise-Tempo und den Tagesplan.

Die View beantwortet:

- welcher Hub ist aktiv
- wie viele Tage und Naechte sind geplant
- fuer welche Tage existieren Entwuerfe
- wo gibt es offene Fragen, Warnungen oder Rest Days

Passender Screen:

- [Trip tab](./screens/Trip%20tab%20_%20hubs_%20dates_%20day%20plan.png)

### 6.5 Profile

Profile enthaelt keine bloessen Kontoeinstellungen, sondern die Regeln, mit denen IslandHub arbeitet.

Dazu gehoeren:

- Sprache, Einheiten, Waehrung
- Sicherheitsbenachrichtigungen
- Emergency Contacts
- Offline-Caches
- Premium-Einstieg

Passender Screen:

- [Profile tab](./screens/Profile%20tab%20_%20safety_%20offline_%20premium.png)

## 7. Navigationslogik und Hauptflows

### 7.1 Typ 1: Vom Template zur Mietwagen-Empfehlung

Flow:

1. Nutzer waehlt auf dem Planning-Screen den Ideation-Pfad.
2. Nutzer setzt seinen Zeitraum.
3. Nutzer sieht Template-Karten mit Dauer, Risikoprofil und Fahrzeughinweis.
4. Nach Auswahl eines Templates zeigt die App eine konkrete Empfehlung fuer 2WD oder 4WD.
5. Falls noch kein Fahrzeug gebucht ist, erscheint ein klar als Partnerangebot markierter Affiliate-Einstieg.

Relevante Screens:

- [Planning phase](./screens/02%20_%20Planning%20phase.png)
- [Travel dates](./screens/03%20_%20Travel%20dates.png)
- [Templates with car offer](./screens/Templates%20with%20car%20offer.png)

### 7.2 Typ 2: Vom gelben Pin zur Tagesroute

Flow:

1. Nutzer landet morgens im Explore-Screen.
2. Nutzer tippt einen gelben Pin an.
3. Spot Details erklaeren die Warnung.
4. Der CTA fuegt den Spot nicht blind hinzu, sondern prueft die aktive Route.
5. Das Insert-Sheet zeigt den empfohlenen Einfuegepunkt und die zusaetzliche Fahrzeit.
6. Nach Bestaetigung landet der Nutzer in der aktiven Timeline.

Relevante Screens:

- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Caution / Seljalandsfoss](./screens/Caution%20_%20Seljalandsfoss%20_%20wind.png)
- [Insert into route](./screens/Insert%20into%20route.png)
- [Active timeline](./screens/Active%20timeline.png)

### 7.3 Typ 2 Edge Case: Keine aktive Route vorhanden

Wenn aus den Spot Details heraus noch keine aktive Route fuer heute existiert, erscheint kein Fehler, sondern ein Entscheidungs-Sheet.

Optionen:

- fuer heute erstellen
- fuer spaeter planen
- nur speichern

Relevanter Screen:

- [Create route / no active](./screens/Create%20route%20_%20no%20active.png)

### 7.4 Typ 3: Rueckkehr aus Maps

Nach Rueckkehr aus Google Maps oder Apple Maps nimmt die App nichts stillschweigend an. Stattdessen fragt sie, ob der Stopp erreicht wurde.

Das loest drei Probleme gleichzeitig:

- Timeline bleibt korrekt
- naechster Stopp kann sofort aktiviert werden
- optionaler Standortkomfort kann spaeter als Premium ergaenzt werden

Relevante Screens:

- [Active timeline](./screens/Active%20timeline.png)
- [Return-from-Maps sheet](./screens/Return-from-Maps%20sheet.png)

## 8. Daten- und Statuslogik

Der Produktkern ist nicht die Karte, sondern der konsistente Status jedes Spots. Karte, Detailansicht und Timeline muessen dieselbe Wahrheit lesen.

Empfohlenes Statusmodell:

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

Regeln:

1. Alle Screens lesen denselben Status-Record.
2. Jede Statusaenderung aktualisiert Explore, Spot Details und Timeline.
3. Jede Warnung hat einen Klartext-Grund.
4. Bei Konflikten zwischen Quellen gewinnt Sicherheit.
5. Community-Meldungen sind Hinweise, aber keine offiziellen Statusaenderungen.

Statusvarianten im UI:

- green: offen und unkritisch
- yellow: erreichbar, aber mit relevanter Warnung
- red: gesperrt oder klar nicht empfehlenswert
- unknown: Daten fehlen oder sind zu alt

Passende Screens:

- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Caution / Seljalandsfoss](./screens/Caution%20_%20Seljalandsfoss%20_%20wind.png)
- [Closed / Kerlingarfjoll](./screens/Closed%20_%20Kerlingarfj_ll%20_%20road.png)
- [No data / stale ford](./screens/No%20data%20_%20_rsm_rk%20_%20stale%20ford.png)
- [Offline / stale data](./screens/Offline%20_%20stale%20data.png)

## 9. Offline, Fehlerfaelle und Sonderzustaende

IslandHub muss auch dann glaubwuerdig bleiben, wenn Daten fehlen, alt sind oder der Nutzer ohne Netz reist.

### 9.1 Offline

Offline bedeutet nicht blind weiterfahren, sondern transparent mit Cache arbeiten.

Die App muss anzeigen:

- was lokal gespeichert ist
- wann zuletzt synchronisiert wurde
- welche Teile noch belastbar sind
- welche Teile nur noch mit Vorsicht gelten

Passende Screens:

- [Offline / stale data](./screens/Offline%20_%20stale%20data.png)
- [Profile tab](./screens/Profile%20tab%20_%20safety_%20offline_%20premium.png)

### 9.2 No Data

No Data ist ein eigener Zustand und kein schlecht erklaertes Gelb. Wenn etwa Furt-Daten veraltet sind, darf die App nicht so tun, als sei der Spot sicher.

Passender Screen:

- [No data / stale ford](./screens/No%20data%20_%20_rsm_rk%20_%20stale%20ford.png)

### 9.3 Closed

Ein geschlossener Spot braucht eine klare Erklaerung und idealerweise eine Alternativhandlung, etwa Speichern, spaeter pruefen oder sichere Alternativen zeigen.

Passender Screen:

- [Closed / Kerlingarfjoll](./screens/Closed%20_%20Kerlingarfj_ll%20_%20road.png)

## 10. Monetarisierung

IslandHub sollte ein hybrides Modell aus Affiliate und Premium verfolgen.

### 10.1 Affiliate

Affiliate passt dann, wenn der Nutzer ohnehin vor einer transaktionalen Entscheidung steht.

Geeignete Kontexte:

- Mietwagen nach Template- oder Routenwahl
- Unterkuenfte im Hub- oder Roadtrip-Kontext
- Touren bei wetter- und saisonabhaengigen Spots

Regeln:

- klar als Partnerangebot kennzeichnen
- Ranking-Kriterien offenlegen, wenn sortiert wird
- Sicherheitsinformationen nie wie Werbung wirken lassen

Passender Screen:

- [Templates with car offer](./screens/Templates%20with%20car%20offer.png)

### 10.2 Premium

Premium sollte Komfort, Automatisierung und fruehere Erkenntnis verkaufen.

Geeignete Premium-Funktionen:

- Re-Checks in kuerzeren Intervallen
- Vorabendwarnungen fuer die morgige Route
- Statusverschlechterung waehrend der Fahrt melden
- erweiterte Offline-Nutzung
- spaeter optional Auto-Markierung per Hintergrundstandort

Wichtige Produktregel:

Basis-Sicherheitswarnungen bleiben kostenlos.

Passender Screen:

- [Profile tab](./screens/Profile%20tab%20_%20safety_%20offline_%20premium.png)

## 11. Recht, Vertrauen und Copy-Prinzipien

IslandHub operiert in einem sicherheitsnahen Kontext. Darum gelten folgende Grundsaetze:

- Warnungen immer konkret formulieren, nicht allgemein alarmistisch
- Quellen nennen: Veður.is und Vegagerdin
- Zeitstempel sichtbar machen
- Werbung und Partnerangebote klar kennzeichnen
- Unsicherheit ehrlich kommunizieren, statt Genauigkeit vorzutaeuschen

Beispiel fuer gute Copy:

- Starker Wind. Autotueren vorsichtig oeffnen. Aufenthalt kurz halten.

Beispiel fuer schlechte Copy:

- Achtung, gefaehrlich.

Passende Screens:

- [Caution / Seljalandsfoss](./screens/Caution%20_%20Seljalandsfoss%20_%20wind.png)
- [Templates with car offer](./screens/Templates%20with%20car%20offer.png)

## 12. Visuelle Richtung

Die visuelle Sprache bleibt skandinavisch, minimal und ruhig.

Merkmale:

- Schwarz und gebrochene Weiss-/Sandtoene als Basis
- entsaettigte Statusfarben fuer Gruen, Gelb und Rot
- starke Hierarchien durch Typografie statt durch visuelle Ueberladung
- Karte als sachliche Arbeitsflaeche, nicht als verspielte Illustration

Die Designs transportieren so Premium-Anmutung und Verlaesslichkeit gleichzeitig.

Passende Screens:

- [Welcome / Language](./screens/01%20_%20Welcome%20_%20Language.png)
- [Map-first Explore](./screens/A%20_%20Sheet%20_%20map-first.png)
- [Profile tab](./screens/Profile%20tab%20_%20safety_%20offline_%20premium.png)

## 13. Umsetzungsprioritaet

### Phase 1: Produktkern

- Onboarding mit Sprache, Phase, Zeitraum, Fahrzeug, Hub oder Route
- Explore mit Live-Status und Filter
- Spot Details mit caution, closed und no data
- Today mit aktiver Timeline und Navigationsexport
- Trip mit Hubs und Tagesplan
- Profile mit Sicherheit, Offline und Premium-Rahmen

### Phase 2: Komfort und Conversion

- Affiliate-Einstiege fuer Mietwagen, Unterkuenfte und Touren
- Re-Checks in kuerzeren Intervallen
- Vorabendwarnungen
- bessere Offline-Caches

### Phase 3: Erweiterung

- flexibler Reisezeitraum und Saisonberatung
- Community Reports
- Auto-Markierung per Standort
- feinere Pace- und Praeferenzmodelle

## 14. Fazit

IslandHub ist kein Reiseplaner fuer starre Itineraries, sondern ein dynamisches Entscheidungsprodukt fuer eine Umgebung, in der Plaene taeglich neu bewertet werden muessen. Der Mehrwert entsteht dort, wo andere Apps schwach sind: zwischen Wunschliste und Echtwelt.

Die vorliegenden Screens stuetzen dieses Konzept bereits ueber weite Strecken belastbar ab. Besonders stark sind die Abbildung des Hub-Modells, die taegliche Kartenlogik, die nachvollziehbaren Warn- und Fehlerzustaende, die Today-Timeline, die Roadtrip-Ebene im Trip-Tab und die klare Trennung zwischen kostenloser Sicherheit und Premium-Komfort.