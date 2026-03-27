# CLAUDE.md

Stand: 2026-03-26
Scope: `public_html/` (Situation Room – globale Lagekarte)

This file is a practical handover for Claude (or any second coding agent) to work safely in this project without chat context.

## 1) Project intent and operating model

- Type: globale Echtzeit-Lagekarte für Krisenereignisse (Erdbeben, Brände, Tsunami, Konflikte, Luftverkehr, News).
- Backend ist alleinige Quelle der Wahrheit für Event-Daten und Scoring.
- Frontend ist reine Darstellungsschicht (MapLibre GL, Sidebar, Detailmodals).
- WebSocket ist für Push-Updates (neue Events, Stats), nicht für Steuerung.
- Importerjobs laufen per Cron/Scheduler, nicht durch Frontend-Trigger.

## 2) Non-negotiable rules

- Do not move authoritative scoring, dedup, or import logic to the frontend.
- Do not hardcode source intervals or scoring weights if a DB/config key exists.
- For logic/data/schema changes: document in `private/TODO.md` (active) and `README.md` (stable facts).
- `private/TODO.md` ist die einzige kanonische TODO-Datei.
- **After every completed task, always run `./private/scripts/release.sh "<Kurzkommentar>"` as the final step.** This script handles PM2 reload and `git commit & push`. No separate manual git or PM2 steps needed.
- Helper scripts are in `private/scripts/` and must not be committed.
- SQL migrations go under `public_html/sql/migrations/NNNN_<topic>.sql` and are applied via `npm --prefix public_html/backend run db:migrate`. Never mutate DB silently from code.
- DB ad-hoc queries only via `private/scripts/db_query.sh` or `private/scripts/db_run_sql.sh`.
- PM2 runtime is `webuser`-owned (`/home/webuser/.pm2`); do not use root PM2 for app operations.
- PM2 process name: `situation`. Reload command: `PM2_HOME=/home/webuser/.pm2 pm2 reload situation --update-env`.
- Existing code style:
  - Backend: CommonJS (`require/module.exports`), `"use strict"`.
  - Frontend: Vanilla JS, ES modules (`import/export`).

## Workflow Orchestration

### 1. Plan Node Default

Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)

**Abgrenzung zu Autonomous Bug Fixing:** Ein isolierter Bug-Fix in ≤2 Dateien mit klarer Ursache = autonom (kein Plan Mode nötig). Ein systemischer oder multi-modularer Fix = Plan Mode zuerst.

If something goes sideways, STOP and re-plan immediately; don't keep pushing.

Use plan mode for verification steps, not just building.

Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy

Use subagents liberally to keep the main context window clean.

Offload research, exploration, and parallel analysis to subagents.

For complex problems, throw more compute at it via subagents.

One tack per subagent for focused execution.

### 3. Self-Improvement Loop

After ANY correction from the user: update `LESSONS.md` (project root, if present) with the pattern.

Write rules for yourself that prevent the same mistake.

Ruthlessly iterate on these lessons until the mistake rate drops.

Review lessons at the start of the session for the relevant project.

### 4. Verification Before Done

Never mark a task complete without proving it works.

Ask yourself: "Would a staff engineer approve this?"

Run syntax checks, check logs, demonstrate correctness.

### 5. Demand Elegance (Balanced)

For non-trivial changes: pause and ask, "Is there a more elegant way?"

If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."

Skip this for simple, obvious fixes. Don't over-engineer.

### 6. Autonomous Bug Fixing

When given a bug report: just fix it. Don't ask for hand-holding.

Point at logs, errors, and failing tests, then resolve them.

Zero context switching required from the user.

## Task Management

1. **Plan First**: Write a plan to `private/TODO.md` with checkable items.
2. **Verify Plan**: Check in before starting implementation (außer bei isolierten Bug-Fixes ≤2 Dateien).
3. **Track Progress**: Mark items complete as you go.
4. **Explain Changes**: High-level summary at each step.
5. **Document Results**: Update `private/TODO.md` and `README.md` when done.
6. **Capture Lessons**: Update `LESSONS.md` (project root) after corrections.

## Core Principles

**Simplicity First**: Make every change as simple as possible. Minimal impact.

**No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

**Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## 3) High-level architecture

### Backend (Node/Express + WebSocket)

- Entry: `public_html/backend/src/server.js`
- App setup: `public_html/backend/src/app.js`
- Routes: `public_html/backend/src/routes/`
- Services: `public_html/backend/src/services/` (event, scoring, dedup, geo, websocket)
- Importers (pro Quelle): `public_html/backend/src/importers/`
- Jobs (Cron-Runner): `public_html/backend/src/jobs/`
- Middleware: `public_html/backend/src/middleware/`
- Config: `public_html/backend/src/config/`
- Utils: `public_html/backend/src/utils/`
- Läuft auf `127.0.0.1:3001`

### Frontend

- Entry: `public_html/frontend/index.html`
- Main JS: `public_html/frontend/src/main.js`
- CSS: `public_html/frontend/src/styles/app.css`
- MapLibre GL als Kartenbibliothek
- Kein Build-Schritt nötig (Vanilla JS)

### Datenquellen (Rollen)

Primäre Event-Erzeuger:
- `usgs` – Erdbeben (5 min)
- `gdacs` – Katastrophen (10 min)
- `noaa_tsunami` – Tsunami (5 min)
- `firms` – Brände (10 min)
- `opensky` – Flugbewegungen (1 min)

Sekundäre News/Validierung:
- `bbc`, `guardian`, `aljazeera`, `dw`, `france24`, `npr`, `skynews` – RSS (30 min)
- `gdelt` – zentrale News-Engine / Attention-Layer (30 min)
- `reliefweb` – humanitäre Berichte, sekundäre Validierung (30 min)

Archiviert/deaktiviert:
- `acled` – Lizenzkosten, im Code erhalten, operativ ausgeblendet
- `ap`, `reuters` – keine stabilen öffentlichen RSS-Feeds

## 4) Scoring-Modell

```
importance = 0.30 * source_confidence
           + 0.35 * event_severity
           + 0.20 * validation_score
           + 0.15 * attention_score
```

- `source_confidence` statisch pro Quelle (USGS: 0.98, GDACS: 0.92, FIRMS: 0.88, RSS: 0.85–0.92, GDELT: 0.60–0.75)
- `event_severity` typabhängig (Magnitude, Warnlevel, Clustergröße etc.)
- `validation_score` steigt mit mehreren Artikel-Domains und Querquellen
- `attention_score` basiert auf Artikelanzahl, Wachstum, Länder/Sprachbreite

## 5) Dedup-Logik

Primär: `source_id + source_event_id`

Sekundär (geografisch/zeitlich):
- `earthquake`: 50 km / 2 h
- `fire`: 10 km / 6 h
- `conflict`: 25 km / 24 h

## 6) Datenbankstruktur (praktische Karte)

Haupttabellen:
- `events` – normalisierte Events mit Scoring
- `raw_events` – Rohpayloads und initiale Snapshots
- `event_updates` – Vorher/Nachher bei Event-Änderungen
- `event_reports` – Community-Meldungen (z. B. `industrial_heat`)
- `event_tags` – Tagging-Basis für spätere Korrelation
- `event_validation_matches` – persistierte News-Matches zu Primärevents
- `sources` – Quell-Konfiguration mit `last_run`, `last_status`, `enabled`
- `schema_migrations` – Migrationsstatus

## 7) SQL-Workflow

- Migrationsordner: `public_html/sql/migrations/`
- Namensstil: `NNNN_<topic>.sql` (fortlaufend numeriert)
- Migration ausführen: `npm --prefix public_html/backend run db:migrate`
- Baseline (bestehende Systeme): `npm --prefix public_html/backend run db:baseline`
- Ad-hoc Query: `./private/scripts/db_query.sh "SELECT ...;"`
- SQL-Datei ausführen: `./private/scripts/db_run_sql.sh <datei.sql>`
- Bestehende Migrationsdateien nach Anwendung nicht mehr ändern.

## 8) Job-Locks

Alle Jobs verwenden Lockfiles via `backend/src/utils/job-lock.js`.
Lockfiles liegen in `/tmp/situation-room-run-<source>.lock`.
Bei verwaisten Locks: erst prüfen ob Prozess noch läuft, dann Datei entfernen.

## 9) Laufzeit und Konfiguration

Umgebungsvariablen werden geladen aus (in dieser Reihenfolge):
1. `private/.env`
2. `public_html/backend/.env`

Wichtige Variablen:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `PORT` (3001), `HOST` (127.0.0.1)
- `FIRMS_API_KEY`
- `RELIEFWEB_APPNAME`
- `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`
- `GDELT_QUERY`, `GDELT_TIMESPAN`, `GDELT_MAX_RECORDS`, `GDELT_MIN_COUNTRY_ARTICLES`, `GDELT_MAX_COUNTRIES`
- `MAP_PROVIDER`, `MAPTILER_API_KEY`, `MAPTILER_MAP_ID`, `MAPTILER_LABEL_LANGUAGE`, `MAPTILER_LABEL_FALLBACK`
- `ADMIN_API_KEY` (für `PUT /api/sources/:id` und `POST /api/sources/:id/run`)

Nach `.env`-Änderungen immer: `PM2_HOME=/home/webuser/.pm2 pm2 reload situation --update-env`

## 10) Typischer sicherer Änderungs-Workflow

1. `private/TODO.md` und `README.md` lesen.
2. Ziel-Modul(e) im Backend-Service/Importer/Controller lesen.
3. Minimalen fokussierten Patch implementieren.
4. Bei DB-Änderungen: neue Migrationsdatei unter `public_html/sql/migrations/` anlegen.
5. Migration anwenden: `npm --prefix public_html/backend run db:migrate`
6. Syntax prüfen: `node --check <changed-file.js>`
7. Dokumentation aktualisieren: `private/TODO.md`, ggf. `README.md`.
8. **`./private/scripts/release.sh "<Kurzkommentar>"` als letzten Schritt ausführen** — erledigt PM2 reload und git push in einem.

## 11) Known pitfalls / gotchas

- GDELT liefert auf diesem Host häufig `429 Too Many Requests` → Importer fällt automatisch auf letzten Rohsnapshot zurück. GDELT-Job nicht manuell mehrfach wiederholen.
- `GET /api/config/public` gibt die MapTiler StyleURL inkl. API-Key zurück — ist technisch notwendig, aber der Key sollte auf `situation.schnueddels.de` domain-restringiert sein (TODO: auf cloud.maptiler.com setzen).
- `PUT /api/sources/:id` und `POST /api/sources/:id/run` sind durch `require-admin-key.js` gesichert: prüft `x-api-key` Header gegen `ADMIN_API_KEY`. Fail-secure: ohne konfigurierten Key → 503.
- `POST /api/events/:id/report-industrial` hat Rate Limiting: max. 10 Meldungen pro IP in 15 Minuten.
- FIRMS-Feuer mit ≥3 unterschiedlichen `industrial_heat`-Reports werden in Karte und Liste ausgeblendet (bleiben per Direktaufruf abrufbar).
- ACLED bleibt im Code, ist aber über `/api/sources/status` und UI ausgeblendet. Nicht aktivieren ohne bezahlte API-Lizenz.
- `AP` und `Reuters` sind keine aktiven Feed-Quellen mehr; historische DB-Rows können noch existieren.
- OpenSky benötigt `extended=1` für Kategorie-Daten; ohne diesen Parameter keine Kategorie-Filterung möglich.

## 12) Quick file map (where to look first)

- Aktive Aufgaben: `private/TODO.md`
- Projektentwurf/Konzept: `private/ENTWURF.md`
- Stable Fakten/Architektur: `README.md`
- Quellendokumentation: `public_html/docs/sources.md`
- Betriebsdokumentation: `public_html/docs/operations.md`
- API-Dokumentation: `public_html/docs/api.md`
- Backend Entry: `public_html/backend/src/server.js`
- App Setup: `public_html/backend/src/app.js`
- Importer: `public_html/backend/src/importers/`
- Jobs: `public_html/backend/src/jobs/`
- Services: `public_html/backend/src/services/`
- Middleware: `public_html/backend/src/middleware/`
- Frontend: `public_html/frontend/src/main.js`
- SQL-Schema: `public_html/sql/schema.sql`
- SQL-Migrationen: `public_html/sql/migrations/`
- Hilfsskripte: `private/scripts/`

---

If unsure, prefer explicit questions over implicit assumptions, especially for scoring changes, data migrations, and source configuration.
