# Data Sources

## Overview

Situation Room aggregates data from multiple crisis monitoring sources. Each source is managed by a dedicated importer module.

Current bootstrap files:
- `public_html/sql/schema.sql` creates tables and inserts the current default source definitions
- `public_html/sql/seed_sources.sql` can be rerun idempotently to realign names, intervals, enabled flags and JSON config
- `ACLED` remains in code and schema, but is intentionally hidden from operational UI/API output
- `AP` remains in code, but is intentionally retired from operational UI/API output

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

**Notes:**
- Current importer preserves the concrete GDACS family instead of flattening everything to `disaster`.
- `EQ` events are normalized to `earthquake` with parsed depth where present.
- `FL` events are normalized to `flood`.
- `WF` events are normalized to `fire`.
- Tropical cyclone wind speeds are normalized before they influence scoring, instead of using raw `km/h` values directly.
- Additional GDACS fields such as alert score, episode alert score, CAP URL, icon URL, bbox and date metadata are preserved in event payloads.

---

### GDELT Attention

**Type:** Humanitarian  
**ID:** `gdelt`  
**Default Interval:** 3 hours

**API:** https://api.gdeltproject.org/api/v2/doc/doc

**Role in Situation Room:**
- Secondary news and attention layer
- Aggregated by publisher country
- Not imported as unfiltered article-per-marker stream
- Used as secondary validation source for primary incidents

**Data:**
- Global crisis-related news attention
- Top article bundles per country
- Distinct domains and latest article time
- Article language metadata per bundle where available

**Notes:**
- Current importer uses the GDELT DOC API in `artlist` mode with a broad crisis query window.
- Articles are grouped by `sourcecountry` and turned into one attention marker per country.
- Marker coordinates are resolved via country centroids, so this layer represents media attention geography, not verified incident coordinates.
- The frontend shows `GDELT` as a selectable source, but it is not enabled by default in fresh browser filter states.
- On repeated `429` rate limits, the importer falls back to the latest cached raw snapshot.
- The current runtime groups countries from even single matching articles to avoid collapsing the layer to only a handful of countries during rate-limited periods.
- GDELT article titles remain in their original language; the importer stores language metadata but does not translate article text.

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
- In addition, the current importer suppresses clustered night-time detections with low FRP, low/nominal confidence and industrial thermal signatures before import
- Manual exclusion zones can still be added in `backend/src/config/firms-industrial-hotspots.js` for known steelworks, flare stacks or refineries

---

### BBC News

**Type:** Humanitarian / News  
**ID:** `bbc`  
**Default Interval:** 30 minutes

**Feeds:**
- `https://feeds.bbci.co.uk/news/world/rss.xml`
- `https://feeds.bbci.co.uk/news/uk/rss.xml`
- `https://feeds.bbci.co.uk/news/business/rss.xml`
- `https://feeds.bbci.co.uk/news/politics/rss.xml`
- `https://feeds.bbci.co.uk/news/health/rss.xml`
- `https://feeds.bbci.co.uk/news/science_and_environment/rss.xml`
- `https://feeds.bbci.co.uk/news/technology/rss.xml`

**Role in Situation Room:**
- Secondary validation source
- Optional map layer
- News-style humanitarian context source

**Notes:**
- Enabled by default on the backend, but not enabled by default in fresh browser source filters.
- The importer resolves coarse event coordinates via conservative country/territory centroid detection.
- Items without a plausible country/territory match are skipped instead of being inserted at `0,0`.
- The feed itself is English-language and is stored with `content_language = en-gb`.

---

### AP News

**Type:** Humanitarian / News  
**ID:** `ap`  
**Default Interval:** 30 minutes

**Feed:** `https://apnews.com/rss`

**Default State:** retired / hidden

**Notes:**
- Integrated in code, but currently not used operationally.
- The previously tested public RSS endpoint is no longer reliable enough for production use.
- The importer uses the same conservative centroid resolution as `BBC`.

---

### Reuters

**Type:** Humanitarian / News  
**ID:** `reuters`  
**Default Interval:** 30 minutes

**Feeds:**
- `https://www.reutersagency.com/feed/?best-topics=world&post_type=best`
- `https://www.reutersagency.com/feed/?post_type=best&best-topics=breakingviews`

**Default State:** disabled

**Notes:**
- Integrated as a prepared secondary news source.
- Current feed access still needs operational verification before activation.
- The importer uses the same conservative centroid resolution as `BBC`.
- Reuters items are treated as original-language content and currently prepared as English-language feed data.

---

### ACLED (Armed Conflict Location & Event Data)

**Type:** Conflict  
**ID:** `acled`  
**Default Interval:** 60 minutes

**Default State:** disabled and operationally hidden

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
- Login is prepared with primary and alternate username fallback via `ACLED_USERNAME` and `ACLED_ALT_USERNAME`
- The source remains in code, but is intentionally hidden from operational UI/API output.
- Current blocker is the unavailable paid API license.

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
- ReliefWeb reports are also used as a secondary validation source for primary incidents when title/country/time signals align.
- Where ReliefWeb exposes report language metadata, it is preserved as `content_language` / `content_languages`; report text itself remains untranslated.

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
4. Add job runner under `backend/src/jobs/`
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
