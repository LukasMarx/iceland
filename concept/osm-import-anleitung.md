# OSM-Daten-Import: GeoJSON aus OpenStreetMap beziehen

Dieses Dokument beschreibt, wie man einen GeoJSON-Export mit allen
Unterkünften Islands aus OpenStreetMap erstellt und in den Admin importiert.

---

## 1. Overpass Turbo öffnen

Gehe auf **[https://overpass-turbo.eu](https://overpass-turbo.eu)**

Dort gibt es links einen Code-Editor und rechts eine Kartenvorschau.

---

## 2. Query einfügen

Kopiere die folgende Abfrage in den Editor (ersetzt den vorhandenen Code):

```js
[out:json][timeout:120];
area["ISO3166-1"="IS"][admin_level=2];
(
  node["tourism"~"hotel|guest_house|hostel|motel|chalet|apartment|camp_site|caravan_site|wilderness_hut"](area);
  way["tourism"~"hotel|guest_house|hostel|motel|chalet|apartment|camp_site|caravan_site|wilderness_hut"](area);
  relation["tourism"~"hotel|guest_house|hostel|motel|chalet|apartment|camp_site|caravan_site|wilderness_hut"](area);
);
out center;
```

### Was diese Query macht

| tourism-Tag | Beschreibung |
|---|---|
| `hotel` | Hotel |
| `guest_house` | Gästehaus / Guesthouse |
| `hostel` | Hostel / Jugendherberge |
| `motel` | Motel |
| `chalet` | Ferienhaus / Cottage |
| `apartment` | Ferienwohnung / Apartment |
| `camp_site` | Campingplatz |
| `caravan_site` | Wohnmobilstellplatz |
| `wilderness_hut` | Schutzhütte / Berg huts |

- `[out:json]` – Ergebnis als JSON
- `[timeout:120]` – max. 120 Sekunden Laufzeit
- `area["ISO3166-1"="IS"]` – beschränkt auf Island
- `out center;` – liefert Koordinaten auch für Flächen/Ways

---

## 3. Query ausführen

Klicke auf den **„Run"**-Pfeil (▶) oben links im Editor.

Die Abfrage kann **bis zu 2 Minuten** dauern – Island hat mehrere tausend
Unterkünfte in OSM.

Während der Ausführung erscheint eine Fortschrittsanzeige.
Nach Abschluss werden die Treffer als Punkte auf der Karte angezeigt.

---

## 4. Als GeoJSON exportieren

Nach erfolgreicher Ausführung:

1. Klicke oben auf das Menü **„Export"**
2. Wähle **„GeoJSON"** (bzw. „download as GeoJSON")
3. Speichere die Datei als `iceland-accommodations.geojson`

---

## 5. Optional: Export mit anderen Tags

Falls nur bestimmte Unterkunftsarten importiert werden sollen,
kann der Regex in der Query angepasst werden:

Nur Hotels und Gästehäuser:

```js
node["tourism"~"hotel|guest_house"](area);
```

Nur Campingplätze:

```js
node["tourism"~"camp_site|caravan_site"](area);
```

---

## 6. Import im Admin

1. Admin-Oberfläche öffnen (z. B. `http://localhost:4201`)
2. Links im Menü auf **„OSM Import"** klicken
3. GeoJSON-Datei auswählen
4. **„Import starten"** klicken

Nach dem Import erscheint eine Zusammenfassung:

- **Gefunden** – Einträge in der Datei
- **Neu angelegt** – noch nicht in der DB vorhanden
- **Aktualisiert** – bereits vorhanden (via `@id` erkannt)
- **Übersprungen** – ohne Koordinaten oder fehlerhaft

Die importierten Einträge erscheinen danach in der Tabelle
**„Unterkünfte"** im Admin.

---

## Hinweise

- Der Import ist **idempotent**: Wird dieselbe Datei erneut hochgeladen,
  werden vorhandene Einträge aktualisiert, nicht dupliziert.
- Die Erkennung erfolgt über das Feld `@id` aus dem GeoJSON
  (z. B. `node/123456789`).
- Alle OSM-Tags werden im Feld `metadata.osmTags` der Datenbank gespeichert.
