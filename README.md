# Situation Room

Situation Room ist eine globale Lagekarte für Ereignisse aus mehreren Krisen- und Signalsystemen. Das Projekt kombiniert ein Node/Express-Backend, eine MapLibre-Frontend-Anwendung und eine MariaDB-Datenbank zu einer operativen Ansicht für Ereignisse, Quellenstatus und Markt-/Kontextsignale.

## Status

Aktueller Funktionsstand:
- Frontend unter `public_html/frontend/`
- Node-Backend unter `public_html/backend/`
- MariaDB als Primärspeicher
- Live-Frontend mit MapLibre, Viewport-Fetch, Filtern, WebSocket-Updates und Detailmodals
- Nginx-Setup produktiv auf `situation.schnueddels.de`

Wichtige Einschränkungen:
- Keine echte Migrationsstrategie, nur SQL-Snapshots und Seeds
- Keine belastbare Test-Suite
- Einige Quellen sind noch MVP-artig oder extern blockiert, vor allem `ACLED`

## Datenquellen

Aktuell integriert:
- `USGS`
- `GDACS`
- `NOAA Tsunami`
- `FIRMS`
- `ReliefWeb`
- `OpenSky`

Vorläufig deaktiviert:
- `ACLED`

Quelle-Details und Auth-Hinweise stehen in:
- `public_html/docs/sources.md`

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
- Schema: `public_html/sql/schema.sql`
- Historie: `public_html/sql/history_tables.sql`
- Views: `public_html/sql/views.sql`
- Source-Seeds: `public_html/sql/seed_sources.sql`

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
- `ACLED_USERNAME`
- `ACLED_ALT_USERNAME`
- `ACLED_PASSWORD`
- `ACLED_CLIENT_ID`
- `MAP_PROVIDER`
- `MAPTILER_API_KEY`
- `MAPTILER_MAP_ID`
- `MAPTILER_LABEL_LANGUAGE`
- `MAPTILER_LABEL_FALLBACK`

## API

Wichtige Endpunkte:
- `GET /api/events`
- `GET /api/events?format=geojson`
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

## Jobs

Importjobs:
- `node public_html/backend/src/jobs/run-usgs.js`
- `node public_html/backend/src/jobs/run-gdacs.js`
- `node public_html/backend/src/jobs/run-noaa-tsunami.js`
- `node public_html/backend/src/jobs/run-firms.js`
- `node public_html/backend/src/jobs/run-reliefweb.js`
- `node public_html/backend/src/jobs/run-opensky.js`
- `node public_html/backend/src/jobs/run-acled.js`

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

## Frontend

Der aktuelle Desktop-Aufbau:
- Karte als zentrales Monitor-Element
- Stats links
- Filter und Quellen rechts
- wichtigste Meldungen und Märkte unten
- Impressum/Datenschutz im Footer
- Detailansichten als zentrierte Modals

Die Basiskarte kann mit MapTiler `dataviz-v4-dark` und deutscher Primärsprache betrieben werden, wenn `MAPTILER_API_KEY` gesetzt ist.
