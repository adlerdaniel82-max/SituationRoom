# Data Sources

## Overview

Situation Room aggregates data from multiple crisis monitoring sources. Each source is managed by a dedicated importer module.

Current bootstrap files:
- `public_html/sql/schema.sql` creates tables and inserts the current default source definitions
- `public_html/sql/seed_sources.sql` can be rerun idempotently to realign names, intervals, enabled flags and JSON config

## Sources

### USGS (United States Geological Survey)

**Type:** Earthquake  
**ID:** `usgs`  
**Default Interval:** 5 minutes

**API:** https://earthquake.usgs.gov/fdsnws/event/1/query

**Data:**
- Magnitude 4.5+ earthquakes
- Global coverage
- Includes depth, location, time

**Configuration:**
```json
{
  "minmagnitude": 4.5,
  "limit": 100,
  "format": "geojson"
}
```

---

### GDACS (Global Disaster Alert and Coordination System)

**Type:** Disaster  
**ID:** `gdacs`  
**Default Interval:** 10 minutes

**API:** https://www.gdacs.org/xml.aspx

**Data:**
- Earthquakes, tsunamis, volcanoes
- Floods, storms, droughts
- Alert levels (green, orange, red)

**Format:** RSS/XML feed

---

### NOAA Tsunami

**Type:** Tsunami  
**ID:** `noaa_tsunami`  
**Default Interval:** 5 minutes

**API / Feed:**
- https://www.tsunami.gov/events/xml/PAAQAtom.xml
- https://www.tsunami.gov/events/xml/PHEBAtom.xml

**Data:**
- Tsunami information statements
- Warning center bulletins
- Preliminary magnitude, coordinates and affected region

**Format:** Atom feed with links to CAP and bulletin text

**Notes:**
- Current importer reads the official `tsunami.gov` Atom feeds for NTWC and PTWC.
- Event type is normalized to `tsunami`.
- Source IDs and bulletin links are preserved in raw event data for later enrichment.

---

### FIRMS (Fire Information for Resource Management System)

**Type:** Fire  
**ID:** `firms`  
**Default Interval:** 10 minutes

**API:** https://firms.modaps.eosdis.nasa.gov/api/area

**Data:**
- Active fires (VIIRS, MODIS)
- Brightness temperature
- Confidence level

**Requires API Key:** Yes (free from NASA)

**Auth / Request Shape:**
- NASA MAP key in `FIRMS_API_KEY`
- CSV area endpoint with key in URL path
- Current importer uses `VIIRS_SNPP_NRT`, global bbox and `1` day range
- Recurrent hotspots on nearly identical coordinates are suppressed as `industrial_heat` heuristics once enough history exists

---

### ACLED (Armed Conflict Location & Event Data)

**Type:** Conflict  
**ID:** `acled`  
**Default Interval:** 60 minutes

**Default State:** disabled until API access is clarified

**API:** https://acleddata.com/api/acled/read

**Data:**
- Conflict events
- Protest events
- Violence against civilians
- Fatalities count

**Auth:** OAuth2 password grant

**Required Env Vars:**
- `ACLED_USERNAME`
- `ACLED_PASSWORD`
- `ACLED_CLIENT_ID` (`acled` by default)

**Notes:**
- Importer requests a Bearer token from `https://acleddata.com/oauth/token`
- Access token lifetime is documented as 24 hours; refresh token lifetime as 14 days
- The current account may still need API access enabled in ACLED if data requests return `403 Access denied`

---

### ReliefWeb

**Type:** Humanitarian  
**ID:** `reliefweb`  
**Default Interval:** 30 minutes

**API:** https://api.reliefweb.int/v2/reports

**Data:**
- Humanitarian reports
- Disaster responses
- Crisis updates

**Auth / Access Model:** approved `appname`

**Required Env Vars:**
- `RELIEFWEB_APPNAME`

**Notes:**
- Current API access is bound to an approved `appname`, not a classic API key.
- The importer currently uses `POST /v2/reports?appname=...` with `preset=latest` and `profile=list`.
- The currently configured approved `appname` is `DAdler-schnueddelssituationroom2026-me509`.

---

### OpenSky Network

**Type:** Aviation  
**ID:** `opensky`  
**Default Interval:** 1 minute

**Default State:** enabled

**API:** https://opensky-network.org/api/states/all

**Data:**
- Aircraft positions
- Selected special-interest traffic only
- No/unknown callsign aircraft
- Category-filtered special classes from `extended=1`

**Features:**
- Filtered to selected special-interest traffic only
- Useful for emergency response monitoring

**Auth:** OAuth2 client credentials

**Required Env Vars:**
- `OPENSKY_CLIENT_ID`
- `OPENSKY_CLIENT_SECRET`

**Notes:**
- Importer fetches a Bearer token from the OpenSky auth realm and refreshes it automatically before expiry.
- On `401 Unauthorized`, the importer refreshes the token once and retries the request.
- Importer requests `/states/all` with `extended=1` so OpenSky includes the documented `category` field.
- Importer prefers these classes only: aircraft without callsign, aircraft with unknown callsign, military-size aircraft, unmanned aerial vehicles, space / trans-atmospheric vehicles, and emergency surface vehicles.
- OpenSky category codes `4-7`, `14`, `15`, and `16` are used directly when present.
- Category `4-7` indicates size/performance classes, not confirmed military ownership; in Situation Room they are treated as "military-size" heuristics.
- If a response still lacks usable category data, the importer falls back to no/unknown callsign plus airborne/trackable heuristics.

---

## Adding a New Source

1. Create importer module in `backend/src/importers/`
2. Add source configuration to `seed_sources.sql`
3. Register in `source-runner.service.js`
4. Add cron job to `crontab.example`
5. Update frontend filters

### Importer Template

```javascript
const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

async function run() {
  logger.info('Running [SOURCE] importer');

  try {
    const response = await axios.get(API_URL);
    const events = parseData(response.data);

    let imported = 0;
    for (const eventData of events) {
      const event = {
        title: eventData.title,
        type: '[TYPE]',
        source: '[SOURCE_ID]',
        lat: eventData.lat,
        lon: eventData.lon,
        timestamp: eventData.timestamp,
        data: eventData
      };

      await eventService.create(event);
      imported++;
    }

    return { imported, total: events.length };
  } catch (error) {
    logger.error('[SOURCE] importer failed:', error);
    throw error;
  }
}

module.exports = { run };
```

## Source Health Monitoring

Check source health via API:

```bash
curl http://localhost:3001/api/sources/status
```

View `source_health` database view for detailed status.

## Runtime Notes

- Frontend source filters are persisted locally in the browser.
- WebSocket clients now receive `event.created`, `event.updated`, `stats:update` and `source.status`.
- The basemap can use MapTiler `dataviz-v4-dark` with German labels when `MAPTILER_API_KEY` is present in `private/.env`.
