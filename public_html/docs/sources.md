# Data Sources

## Overview

Situation Dashboard aggregates data from multiple crisis monitoring sources. Each source is managed by a dedicated importer module.

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

---

### ACLED (Armed Conflict Location & Event Data)

**Type:** Conflict  
**ID:** `acled`  
**Default Interval:** 60 minutes

**API:** https://api.acleddata.com/acledapi.json

**Data:**
- Conflict events
- Protest events
- Violence against civilians
- Fatalities count

**Requires API Key:** Yes (free registration)

---

### ReliefWeb

**Type:** Humanitarian  
**ID:** `reliefweb`  
**Default Interval:** 30 minutes

**API:** https://api.reliefweb.int/v1/reports

**Data:**
- Humanitarian reports
- Disaster responses
- Crisis updates

**Requires API Key:** Yes (free)

---

### OpenSky Network

**Type:** Aviation  
**ID:** `opensky`  
**Default Interval:** 5 minutes

**API:** https://opensky-network.org/api/states/all

**Data:**
- Aircraft positions
- Low-altitude flights
- Unusual flight patterns

**Features:**
- Filtered for low-altitude aircraft (<1000m)
- Useful for emergency response monitoring

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
curl http://localhost:3000/api/sources
```

View `source_health` database view for detailed status.
