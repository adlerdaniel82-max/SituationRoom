# Architecture

## Overview

Situation Room is a real-time crisis monitoring system that aggregates data from structured event sources (USGS, GDACS, NOAA, FIRMS, OpenSky) and news/attention layers (GDELT, BBC, Guardian, Al Jazeera, DW, France24, NPR, Sky News, ReliefWeb), scores and validates events, and displays them on an interactive global map.

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  MapLibre   │  │    API      │  │      UI Components      │  │
│  │   GL Map    │  │   Client    │  │  (Sidebar, Panels, etc) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                         WebSocket (/ws)                          │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Express   │  │  WebSocket  │  │    Cron Jobs            │  │
│  │    Server   │  │   Server    │  │  (system crontab)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                    │                  │
│         ▼                ▼                    ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Middleware │  │   Services  │  │       Importers         │  │
│  │ (auth/rate) │  │(Event,Score,│  │ (USGS, GDACS, FIRMS,    │  │
│  │             │  │ Dedup, WS)  │  │  RSS, GDELT, OpenSky…)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                    │                  │
│         └────────────────┴────────────────────┘                  │
│                              │                                   │
│                         Repositories                             │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Database (MariaDB)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   events    │  │   sources   │  │ event_reports / tags    │  │
│  │  raw_events │  │source_health│  │ event_validation_matches│  │
│  │event_updates│  │             │  │ event_tags              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Ingestion**: Cron jobs trigger importer scripts per source at configured intervals
2. **Parsing**: Importers normalize raw payloads into a common event schema
3. **Deduplication**: Events are matched by `source_id + source_event_id`; geo/time proximity used as secondary fallback
4. **Scoring**: `importance = 0.30 * source_confidence + 0.35 * event_severity + 0.20 * validation_score + 0.15 * attention_score`
5. **Validation**: GDELT and RSS matches are persisted in `event_validation_matches` for primary events
6. **Storage**: Events written with spatial index, raw snapshot in `raw_events`, changes in `event_updates`
7. **Broadcast**: WebSocket pushes `event.created`, `event.updated`, `stats:update`, `source.status` to connected clients
8. **Display**: Frontend updates map layers, source status panel, news panel, and detail modals

## Source Roles

| Role | Sources |
|------|---------|
| Primary event producers | USGS, GDACS, NOAA Tsunami, FIRMS, OpenSky |
| Secondary validation + news | BBC, Guardian, Al Jazeera, DW, France24, NPR, Sky News |
| Central news engine / attention | GDELT |
| Humanitarian reports + validation | ReliefWeb |
| Archived / disabled | ACLED (license), AP, Reuters (no stable feed) |

## Key Services

- **Event Service** (`event.service.js`): create/update events, severity/urgency enrichment, stats broadcast
- **Scoring Service** (`scoring.service.js`): calculates all score components
- **Dedup Service** (`dedup.service.js`): hash- and geo-based duplicate detection
- **News Validation Service** (`news-validation.service.js`): matches primary events against news sources
- **Source Runner Service** (`source-runner.service.js`): executes importers, tracks run state
- **WebSocket Service** (`ws.service.js`): broadcasts events and source status to clients

## Middleware

- **`require-admin-key.js`**: protects `PUT /api/sources/:id` and `POST /api/sources/:id/run` with `x-api-key` header check (fail-secure: 503 if `ADMIN_API_KEY` not configured)
- **`report-rate-limit.js`**: IP-based rate limit on `POST /api/events/:id/report-industrial` (10 req / 15 min)

## Directory Structure

```
public_html/
├── backend/
│   └── src/
│       ├── config/         # env, db, sources, rss-news-sources
│       ├── controllers/    # HTTP handler layer
│       ├── importers/      # one file per source
│       ├── jobs/           # standalone scripts called by cron
│       ├── middleware/     # require-admin-key, report-rate-limit
│       ├── repositories/   # DB query layer
│       ├── routes/         # Express router definitions
│       ├── services/       # business logic
│       └── utils/          # logger, hash, job-lock, news-feed, country-centroid
├── cron/
│   └── crontab.example    # aktive Crontab-Vorlage (system crontab)
├── docs/                  # diese Dateien
├── frontend/              # Vanilla JS + MapLibre GL
└── sql/
    ├── migrations/        # versionierte DB-Änderungen (NNNN_topic.sql)
    ├── schema.sql         # Referenz-Snapshot
    └── seed_sources.sql   # Quellen-Seeds (idempotent)
```
