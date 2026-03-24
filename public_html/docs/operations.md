# Operations

## Überblick

Dieses Dokument beschreibt den operativen Betrieb von `Situation Room` auf `situation.schnueddels.de`.

Wichtige Komponenten:
- Frontend: `public_html/frontend/`
- Backend: `public_html/backend/`
- Datenbank: MariaDB
- Process Manager: PM2-Prozess `situation`
- Webserver: HestiaCP-generiertes Nginx-Setup mit Custom-Template `situationroom`

## Laufzeitpfade

- Projektroot: `/home/webuser/web/situation.schnueddels.de`
- Frontend-Einstieg: `/home/webuser/web/situation.schnueddels.de/public_html/frontend/index.html`
- Backend-Entry: `/home/webuser/web/situation.schnueddels.de/public_html/backend/src/server.js`
- Domain-Nginx:
  - `/home/webuser/conf/web/situation.schnueddels.de/nginx.conf`
  - `/home/webuser/conf/web/situation.schnueddels.de/nginx.ssl.conf`
- Hestia-Template-Ziel:
  - `/usr/local/hestia/data/templates/web/nginx/php-fpm/situationroom.tpl`
  - `/usr/local/hestia/data/templates/web/nginx/php-fpm/situationroom.stpl`

## Start und Reload

Regulärer Reload nach Code- oder `.env`-Änderungen:

```bash
PM2_HOME=/home/webuser/.pm2 pm2 reload situation --update-env
```

Falls der Prozess nicht läuft:

```bash
PM2_HOME=/home/webuser/.pm2 pm2 restart situation --update-env
```

Logs:

```bash
PM2_HOME=/home/webuser/.pm2 pm2 logs situation
```

Schnelle Health-Checks:

```bash
curl -s https://situation.schnueddels.de/api/health
curl -s https://situation.schnueddels.de/api/health/ready
curl -s https://situation.schnueddels.de/api/sources/status
```

## Umgebungsvariablen

Das Backend lädt Konfiguration in dieser Reihenfolge:
1. `private/.env`
2. `public_html/backend/.env`

Für produktive Probleme zuerst prüfen:
- Datenbank: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Kartenstil: `MAPTILER_API_KEY`, `MAPTILER_MAP_ID`
- Quellen:
  - `FIRMS_API_KEY`
  - `RELIEFWEB_APPNAME`
  - `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`
  - `ACLED_USERNAME`, `ACLED_ALT_USERNAME`, `ACLED_PASSWORD`, `ACLED_CLIENT_ID`
  - `GDELT_QUERY`, `GDELT_TIMESPAN`, `GDELT_MAX_RECORDS`, `GDELT_MIN_COUNTRY_ARTICLES`, `GDELT_MAX_COUNTRIES`

Nach Änderungen an `.env` immer `pm2 reload situation --update-env`.

## Job-Läufe

Einzelne Jobs können direkt manuell gestartet werden:

```bash
node public_html/backend/src/jobs/run-usgs.js
node public_html/backend/src/jobs/run-gdacs.js
node public_html/backend/src/jobs/run-gdelt.js
node public_html/backend/src/jobs/run-noaa-tsunami.js
node public_html/backend/src/jobs/run-firms.js
node public_html/backend/src/jobs/run-reliefweb.js
node public_html/backend/src/jobs/run-opensky.js
node public_html/backend/src/jobs/run-acled.js
node public_html/backend/src/jobs/backfill-scoring.js
node public_html/backend/src/jobs/backfill-news-validation.js
```

Aktuelle Soll-Intervalle laut `sources`-Seeds:
- `usgs`: `300s`
- `gdacs`: `600s`
- `gdelt`: `1800s`
- `noaa_tsunami`: `300s`
- `firms`: `600s`
- `reliefweb`: `1800s`
- `opensky`: `60s`
- `acled`: `3600s`, derzeit deaktiviert

## Job-Locks

Alle Jobs verwenden Lockfiles über `backend/src/utils/job-lock.js`, damit parallele Doppelläufe übersprungen werden. Die Lockfiles liegen im OS-Temp-Verzeichnis und tragen Namen wie:

```text
/tmp/situation-room-run-gdelt.lock
/tmp/situation-room-run-firms.lock
```

Wenn ein Job fälschlich dauerhaft als gesperrt erscheint:
1. prüfen, ob noch ein Prozess läuft
2. nur dann verwaiste Lockdatei entfernen
3. Job erneut starten

## Quellenhinweise

### GDELT

- `GDELT` ist ein Attention-Layer, kein Primärfeed.
- Das Panel `Wichtigste Meldungen` nutzt ausschließlich `GDELT`.
- `GDELT` wird zusätzlich als sekundäre Validierungsquelle für Primärevents ausgewertet.
- Die API kann bei zu engem Polling `429 Too Many Requests` liefern.

Empfehlung bei `429`:
1. Job nicht sofort mehrfach manuell wiederholen
2. `GDELT_TIMESPAN` und `GDELT_MAX_RECORDS` konservativ halten
3. erst nach einigen Minuten erneut testen

### FIRMS

- FIRMS nutzt NASA-API-Key und importiert thermische Treffer.
- Aktive Filter:
  - Historien-Heuristik für stationäre Dauerquellen
  - Cluster-Heuristik für typische Nacht-/Industriesignaturen
  - Community-Meldung `industrial_heat`
- Ab `3` unterschiedlichen Reports wird ein FIRMS-Feuer in Listen und Karte ausgeblendet.

### ReliefWeb

- ReliefWeb benötigt einen genehmigten `RELIEFWEB_APPNAME`.
- ReliefWeb wird zusätzlich als sekundäre Validierungsquelle für Primärevents ausgewertet.
- Bei `403` zuerst prüfen, ob der aktuelle App-Name von ReliefWeb bereits freigeschaltet wurde.

### OpenSky

- OpenSky nutzt OAuth2 Client Credentials.
- Die fachliche Freigabe ist noch offen, technisch ist die Quelle aktiv.
- Kategorien werden nur mit `extended=1` geliefert.

### ACLED

- Authentifizierung ist technisch implementiert.
- Login unterstützt primären und alternativen User.
- Datencalls liefern aktuell weiterhin `403 Access denied`.
- Quelle bleibt deshalb deaktiviert, bis die Rechtefrage geklärt ist.
- Nach Freischaltung genügt:

```bash
./private/scripts/db_run_sql.sh public_html/sql/enable_acled.sql
node public_html/backend/src/jobs/run-acled.js
```

## Nginx und Hestia

Das Live-Setup verwendet ein eigenes Hestia-Template `situationroom`.

Lokales Apply-Skript:

```bash
sudo /home/webuser/web/situation.schnueddels.de/private/scripts/apply_hestia_situationroom.sh
```

Erwartetes Ergebnis danach:
- `root /home/webuser/web/situation.schnueddels.de/public_html;`
- `/api/` und `/ws` auf `127.0.0.1:3001`
- HTTP leitet auf HTTPS weiter

Prüfen:

```bash
sudo sed -n '1,220p' /home/webuser/conf/web/situation.schnueddels.de/nginx.conf
sudo sed -n '1,260p' /home/webuser/conf/web/situation.schnueddels.de/nginx.ssl.conf
curl -I http://situation.schnueddels.de/
curl -I https://situation.schnueddels.de/frontend/
```

## Recovery

### Backend antwortet nicht mehr

1. PM2-Status und Logs prüfen
2. Health-Endpoints prüfen
3. PM2 reload oder restart ausführen
4. falls nötig betroffene Einzeljobs manuell starten

```bash
PM2_HOME=/home/webuser/.pm2 pm2 logs situation
PM2_HOME=/home/webuser/.pm2 pm2 reload situation --update-env
```

### Quellenstatus wirkt falsch

1. `GET /api/sources/status` prüfen
2. betroffenen Job einzeln ausführen
3. DB-Status gegenprüfen

```bash
curl -s https://situation.schnueddels.de/api/sources/status
node public_html/backend/src/jobs/run-gdacs.js
./private/scripts/db_query.sh "SELECT id, enabled, last_run, last_status FROM sources ORDER BY id;"
```

### DB-Daten inkonsistent nach Scoring- oder Importer-Änderungen

1. Schema-/Seed-Dateien prüfen
2. bei Bedarf Seeds erneut anwenden
3. Scoring- und News-Validation-Backfills starten

```bash
./private/scripts/db_run_sql.sh public_html/sql/seed_sources.sql
node public_html/backend/src/jobs/backfill-scoring.js
node public_html/backend/src/jobs/backfill-news-validation.js
```

### Frontend lädt, aber Daten fehlen

1. `/api/config/public`
2. `/api/events?limit=5`
3. `/api/sources/status`
4. Browser-Konsole und WebSocket prüfen

```bash
curl -s https://situation.schnueddels.de/api/config/public
curl -s "https://situation.schnueddels.de/api/events?limit=5"
curl -s https://situation.schnueddels.de/api/sources/status
```

## Lokale Hilfen

- `private/scripts/db_tables.sh`
- `private/scripts/db_table.sh <table>`
- `private/scripts/db_query.sh "SELECT ...;"`
- `private/scripts/db_run_sql.sh <datei.sql>`
- `private/scripts/release.sh "Commit Message"`
