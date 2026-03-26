# Situation Room

Situation Room ist eine globale Lagekarte für Ereignisse aus mehreren Krisen- und Signalsystemen. Das Projekt kombiniert ein Node/Express-Backend, eine MapLibre-Frontend-Anwendung und eine MariaDB-Datenbank zu einer operativen Ansicht für Ereignisse, Quellenstatus und Markt-/Kontextsignale.

## Status

Aktueller Funktionsstand:
- Frontend unter `public_html/frontend/`
- Node-Backend unter `public_html/backend/`
- MariaDB als Primärspeicher
- Live-Frontend mit MapLibre, Viewport-Fetch, Filtern, WebSocket-Updates und Detailmodals
- eigenes Meldungsfenster für priorisierte RSS-News aus `BBC`, `Guardian`, `Al Jazeera`, `DW`, `France24`, `NPR` und `Sky News`
- mehrteiliges Scoring pro Event mit `source_confidence`, `event_severity`, `validation_score` und `attention_score`
- Nginx-Setup produktiv auf `situation.schnueddels.de`

Wichtige Einschränkungen:
- Keine belastbare Test-Suite
- Einige Quellen sind noch MVP-artig oder extern blockiert, vor allem `ACLED`

## Datenquellen

Aktuell integriert:
- `USGS`
- `GDACS`
- `GDELT Attention`
- `NOAA Tsunami`
- `FIRMS`
- `ReliefWeb`
- `OpenSky`
- `BBC News`
- `The Guardian`
- `Al Jazeera`
- `DW`
- `France24`
- `NPR`
- `Sky News`

Vorläufig deaktiviert:
- keine

Archiviert / operativ ausgeblendet:
- `ACLED` (Lizenzkosten / kein nutzbarer API-Zugang)
- `AP News` (keine verlässliche RSS-Quelle mehr)
- `Reuters` (keine stabil nutzbaren öffentlichen RSS-Feeds)

Quelle-Details und Auth-Hinweise stehen in:
- `public_html/docs/sources.md`
- `public_html/docs/operations.md`

## Architektur

Backend:
- `public_html/backend/src/server.js`
- `public_html/backend/src/app.js`
- Express-API unter `/api/*`
- WebSocket unter `/ws`
- Importer pro Quelle unter `public_html/backend/src/importers/`
- Jobs unter `public_html/backend/src/jobs/`

Frontend:
- `public_html/frontend/index.html`
- `public_html/frontend/src/main.js`
- `public_html/frontend/src/styles/app.css`

Datenbank:
- Migrationen: `public_html/sql/migrations/`
- Schema: `public_html/sql/schema.sql`
- Historie: `public_html/sql/history_tables.sql`
- Views: `public_html/sql/views.sql`
- Source-Seeds: `public_html/sql/seed_sources.sql`

`schema.sql` ist ein Snapshot des aktuellen Zielschemas. Operative DB-Aenderungen sollen kuenftig ueber versionierte Migrationen laufen.

## Laufzeit und Konfiguration

Das Backend lädt Umgebungsvariablen bevorzugt aus:
1. `private/.env`
2. `public_html/backend/.env`

Wichtige Variablen:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `PORT`
- `HOST`
- `FIRMS_API_KEY`
- `RELIEFWEB_APPNAME`
- `OPENSKY_CLIENT_ID`
- `OPENSKY_CLIENT_SECRET`
- `GDELT_QUERY`
- `GDELT_TIMESPAN`
- `GDELT_MAX_RECORDS`
- `GDELT_MIN_COUNTRY_ARTICLES`
- `GDELT_MAX_COUNTRIES`
- `MAP_PROVIDER`
- `MAPTILER_API_KEY`
- `MAPTILER_MAP_ID`
- `MAPTILER_LABEL_LANGUAGE`
- `MAPTILER_LABEL_FALLBACK`

## Migrationen

Versionierte Datenbank-Aenderungen liegen unter:
- `public_html/sql/migrations/`

Runner:
- `npm --prefix public_html/backend run db:migrate`
- `npm --prefix public_html/backend run db:baseline`

Verhalten:
- `db:migrate` fuehrt nur noch nicht eingetragene Migrationen aus
- `db:baseline` markiert den aktuellen Bestand als bereits angewendet, ohne SQL erneut auszufuehren
- der Status liegt in der Tabelle `schema_migrations`

Fuer bestehende Installationen:
1. einmal `npm --prefix public_html/backend run db:baseline`
2. danach alle neuen Aenderungen nur noch als neue Migration anfuegen

## API

Wichtige Endpunkte:
- `GET /api/events`
- `GET /api/events?format=geojson`
- `GET /api/events/:id/validation`
- `POST /api/events/:id/report-industrial`
- `GET /api/sources/status`
- `GET /api/stats`
- `GET /api/stats/summary`
- `GET /api/stats/hot-regions`
- `GET /api/stats/markets`
- `GET /api/config/public`
- `GET /api/health`
- `GET /api/health/ready`

Zusätzlich werden Roh- und Änderungshistorien mitgeführt:
- `raw_events` für Rohpayloads und normalisierte Event-Snapshots bei Neuanlage
- `event_updates` für Vorher-/Nachher-Stände bei Event-Änderungen
- `event_reports` für Community-Meldungen wie `industrial_heat` bei FIRMS-Feuern
- `event_tags` als vorbereitete Tagging-Basis für spätere quellenübergreifende Korrelationen und Reviews
- `event_validation_matches` für persistente News-Matches zu Primärevents aus `GDELT`, `ReliefWeb` und den aktiven RSS-Newsquellen

## Jobs

Importjobs:
- `node public_html/backend/src/jobs/run-usgs.js`
- `node public_html/backend/src/jobs/run-gdacs.js`
- `node public_html/backend/src/jobs/run-gdelt.js`
- `node public_html/backend/src/jobs/run-noaa-tsunami.js`
- `node public_html/backend/src/jobs/run-firms.js`
- `node public_html/backend/src/jobs/run-reliefweb.js`
- `node public_html/backend/src/jobs/run-opensky.js`
- `node public_html/backend/src/jobs/run-bbc.js`
- `node public_html/backend/src/jobs/run-guardian.js`
- `node public_html/backend/src/jobs/run-aljazeera.js`
- `node public_html/backend/src/jobs/run-dw.js`
- `node public_html/backend/src/jobs/run-france24.js`
- `node public_html/backend/src/jobs/run-npr.js`
- `node public_html/backend/src/jobs/run-skynews.js`
- `node public_html/backend/src/jobs/run-acled.js`

Wartungsjobs:
- `node public_html/backend/src/jobs/backfill-scoring.js`
- `node public_html/backend/src/jobs/backfill-news-validation.js`

Die News-Architektur trennt bewusst zwischen zentraler News-Engine und sichtbaren RSS-Feeds:
- `GDELT` bleibt die zentrale Engine für News-Suche, Event-Validierung, globalen News-Layer und spätere Heatmaps.
- Sichtbare RSS-Newsfeeds sind aktuell `BBC`, `Guardian`, `Al Jazeera`, `DW`, `France24`, `NPR` und `Sky News`.
- `AP` und `Reuters` werden nicht mehr als technische Feed-Quellen verwendet, weil die öffentlich verfügbaren RSS-Endpunkte nicht stabil nutzbar sind.

`ACLED` bleibt im Codebestand erhalten, ist operativ aber ausgeblendet und deaktiviert, weil der benötigte API-Zugang aktuell nicht finanzierbar ist.

Die Jobs verwenden Lockfiles gegen parallele Doppelläufe.

## Betrieb

PM2-Prozess:
- Name: `situation`

Typische Kommandos:

```bash
pm2 reload situation --update-env
pm2 logs situation
```

Lokale Hilfsskripte:
- `private/scripts/db_query.sh`
- `private/scripts/db_run_sql.sh`
- `private/scripts/release.sh`

Beispiel Release:

```bash
./private/scripts/release.sh "Commit Message"
```

Ausführlichere Betriebs- und Recovery-Hinweise:
- `public_html/docs/operations.md`

## Frontend

Der aktuelle Desktop-Aufbau:
- Karte als zentrales Monitor-Element
- Stats links
- Filter und Quellen rechts
- wichtigste Meldungen und Märkte unten
- Impressum/Datenschutz im Footer
- Detailansichten als zentrierte Modals

Die Basiskarte kann mit MapTiler `dataviz-v4-dark` und deutscher Primärsprache betrieben werden, wenn `MAPTILER_API_KEY` gesetzt ist.

Das Panel `Wichtigste Meldungen` ist bewusst vom Kartenfilter entkoppelt und zeigt priorisierte RSS-News-Ereignisse aus `BBC`, `Guardian`, `Al Jazeera`, `DW`, `France24`, `NPR` und `Sky News` im aktuellen Kartenausschnitt. Dabei werden Aktualität, Event-Score und Domain-Balance kombiniert, damit das Panel nicht von einer einzelnen News-Domain dominiert wird.

Die UI ist bereits auf `Deutsch / Englisch` umschaltbar. Bei News-Artikeln und Reports ist dagegen derzeit nur eine Lokalisierung der umgebenden Oberfläche realistisch. Die eigentlichen Titel, Beschreibungen und Quelltexte kommen in der Regel nur in ihrer Originalsprache aus dem Feed oder der API. Deshalb speichert das System für Newsquellen jetzt primär Sprachmetadaten wie `content_language` oder `content_languages`; fuer fremdsprachige Meldungen gibt es im Detailmodal aktuell den pragmatischen Link `Uebersetzt oeffnen` ueber Google Translate. Eine echte integrierte Uebersetzung der Artikel wuerde spaeter einen separaten Uebersetzungsdienst oder mehrsprachige Quellfeeds erfordern.

FIRMS-Feuer können im Detailmodal als mutmaßliche Industrieanlage gemeldet werden. Ab drei unterschiedlichen Meldungen wird der Treffer in Karten- und Listenansichten automatisch ausgeblendet, bleibt aber per Direktaufruf des Events abrufbar.
