# Situation Room

Situation Room aggregates crisis and signal feeds into a live world map. The
repository contains the Node/Express backend, a MapLibre frontend, database
migrations, and importer jobs. The backend is the authoritative source for all
event data and state.

## Requirements

- Node.js with npm
- MariaDB or MySQL 8 compatible with the schema
- A database and a database user with schema privileges
- Optional: PM2 and a reverse proxy for production

## Install

Clone the repository and set an absolute project path for the commands below:

```bash
PROJECT_ROOT="/absolute/path/to/SituationRoom"
cd "$PROJECT_ROOT"
chmod 700 "$PROJECT_ROOT/install.sh"
"$PROJECT_ROOT/install.sh"
```

On its first run the installer creates `private/.env` from `.env.example` and
stops. Fill in at least `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD`, then run the same command again. API credentials are optional
unless their respective importers are enabled.

All configuration, including every API credential, is loaded exclusively from
`private/.env`. It is ignored by Git. Do not put credentials in the frontend,
source files, SQL files, command history, or issue reports.

The installer uses the versioned migrations in
`public_html/sql/migrations/`. For a database administrator who must apply SQL
directly, `install.sql` is a MySQL/MariaDB-client entry point; execute it from
the repository root against a fresh, selected database and then run:

```bash
PROJECT_ROOT="/absolute/path/to/SituationRoom"
npm --prefix "$PROJECT_ROOT/public_html/backend" run db:baseline
```

Use `db:baseline` only after `install.sql` on a fresh schema. For normal
upgrades use `npm --prefix "$PROJECT_ROOT/public_html/backend" run db:migrate`.

## Run

For a local foreground process:

```bash
PROJECT_ROOT="/absolute/path/to/SituationRoom"
node "$PROJECT_ROOT/public_html/backend/src/server.js"
```

The default backend listener is `127.0.0.1:3001`; configure `HOST` and `PORT`
in `private/.env` when required. Serve `public_html/frontend/` through the web
server and proxy `/api/` and `/ws` to the backend.

For production, configure the supplied cron jobs only after reviewing their
source intervals and log paths:

```bash
PROJECT_ROOT="/absolute/path/to/SituationRoom"
crontab "$PROJECT_ROOT/public_html/cron/crontab.example"
```

With PM2, reload without downtime after changing configuration:

```bash
PM2_HOME=/home/webuser/.pm2 pm2 reload situation --update-env
```

## Configuration

`.env.example` lists every supported variable with an empty value. Important
groups are:

- Database: `DB_*`
- Server: `NODE_ENV`, `HOST`, `PORT`, `WS_PORT`, `LOG_LEVEL`
- Data providers: `FIRMS_*`, `ACLED_*`, `RELIEFWEB_*`, `OPENSKY_*`, `GDELT_*`
- Map: `MAP_PROVIDER`, `MAPTILER_*`
- Admin protection: `ADMIN_API_KEY`

`ADMIN_API_KEY` protects mutations of source settings. Restrict the MapTiler
key to the deployed domain because the selected map style is delivered to the
browser.

## Validation

```bash
PROJECT_ROOT="/absolute/path/to/SituationRoom"
node --check "$PROJECT_ROOT/public_html/backend/src/server.js"
node --check "$PROJECT_ROOT/public_html/frontend/src/main.js"
npm --prefix "$PROJECT_ROOT/public_html/backend" test
```

## Project layout

```text
public_html/backend/       Express API, WebSocket server, importers and jobs
public_html/frontend/      MapLibre user interface
public_html/sql/migrations/ Versioned MariaDB/MySQL schema changes
public_html/cron/          Reviewed, opt-in importer schedules
private/.env               Local credentials and runtime configuration (ignored)
```

Additional API and operational details are in `public_html/docs/`.
