# Architecture

## Overview

Situation Dashboard is a real-time crisis monitoring system that aggregates data from multiple sources (USGS, GDACS, FIRMS, ACLED, ReliefWeb, OpenSky) and displays events on an interactive map.

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  MapLibre   │  │    API      │  │      UI Components      │  │
│  │   GL Map    │  │   Client    │  │  (Sidebar, Panel, etc)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                         WebSocket                                │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Backend                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Express   │  │  WebSocket  │  │    Source Runners       │  │
│  │    Server   │  │   Server    │  │   (Scheduled Jobs)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                    │                  │
│         ▼                ▼                    ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │  │   Services  │  │       Importers         │  │
│  │  & Controllers│ │(Event,Score)│  │ (USGS, GDACS, FIRMS...) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                         Repositories                             │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Database                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Events    │  │   Sources   │  │ Correlations / Tags     │  │
│  │ Raw Data    │  │  Clusters   │  │ Reports / History       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Ingestion**: Source runners (cron jobs) fetch data from external APIs
2. **Processing**: Importers parse and normalize data
3. **Deduplication**: Check for existing events using hash comparison
4. **Scoring**: Calculate multi-part score based on source confidence, severity, validation and attention
5. **Validation Prep**: Build query terms and persist secondary news matches for primary events
6. **Storage**: Save to database with spatial indexes, history tables, moderation reports and tag-ready structures
7. **Broadcast**: WebSocket pushes new events to connected clients
8. **Display**: Frontend updates clustered layers, source status and event list

## Key Services

- **Event Service**: CRUD operations, enrichment with severity/urgency
- **Scoring Service**: Calculate combined and component scores (0-1)
- **Dedup Service**: Prevent duplicate events
- **Geo Service**: Distance calculations, bounding boxes
- **WebSocket Service**: Real-time updates to clients

## Directory Structure

```
public_html/
├── backend/          # Node.js Express API
├── frontend/         # Vanilla JS + MapLibre GL
├── sql/              # Database schema and views
├── cron/             # Cron job configurations
└── docs/             # Documentation
```
