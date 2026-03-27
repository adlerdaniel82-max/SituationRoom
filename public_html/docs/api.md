# API Documentation

## Base URL

```
/api
```

---

## Events

### List Events

```
GET /api/events
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `type` | Filter by event type(s), comma-separated (e.g. `earthquake,fire`) |
| `source` | Filter by source(s), comma-separated (e.g. `usgs,gdacs`) |
| `minScore` | Minimum importance score `0–1` |
| `startDate` | Start date (ISO 8601) |
| `endDate` | End date (ISO 8601) |
| `bbox` | Bounding box: `minLon,minLat,maxLon,maxLat` |
| `format` | `geojson` for FeatureCollection, otherwise JSON array |
| `limit` | Max results (default: `100`, max: `500`) |
| `offset` | Pagination offset |

**Response (JSON array):**
```json
[
  {
    "id": 1,
    "title": "M 5.2 Earthquake",
    "type": "earthquake",
    "source": "usgs",
    "lat": 35.6762,
    "lon": 139.6503,
    "magnitude": 5.2,
    "timestamp": "2024-01-15T10:30:00Z",
    "score": 0.65,
    "severity": "high",
    "urgency": "recent"
  }
]
```

**GeoJSON Response (`format=geojson`):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [139.6503, 35.6762] },
      "properties": {
        "id": 1,
        "title": "M 5.2 Earthquake",
        "type": "earthquake",
        "source": "usgs",
        "score": 0.65
      }
    }
  ]
}
```

---

### Get Event

```
GET /api/events/:id
```

---

### Get Event Validation

```
GET /api/events/:id/validation
```

Returns the precomputed news-validation summary and persisted matches from GDELT, ReliefWeb and active RSS sources.

**Response:**
```json
{
  "event_id": 42,
  "source": "usgs",
  "type": "earthquake",
  "validation": { ... },
  "matches": [ ... ]
}
```

---

### Report Industrial Heat

```
POST /api/events/:id/report-industrial
```

Marks a FIRMS fire event as likely industrial heat. After 3 distinct reporter keys the event is hidden from map and list views (still accessible via direct GET).

**Rate limit:** 10 requests per IP per 15 minutes.

**Headers (at least one required):**

| Header | Description |
|--------|-------------|
| `x-client-id` | Client-side anonymous ID |
| `x-forwarded-for` / remote IP | Used if no client ID provided |

**Response:**
```json
{
  "inserted": true,
  "reportCount": 2,
  "hidden": false,
  "threshold": 3,
  "reportType": "industrial_heat"
}
```

---

### Get Nearby Events

```
GET /api/events/nearby?lat=<lat>&lon=<lon>[&radius=<km>][&limit=<n>]
```

---

### Get Event Stats

```
GET /api/events/stats
```

**Response:**
```json
{
  "total": 150,
  "critical": 5,
  "high": 20,
  "medium": 45,
  "low": 80
}
```

---

## Sources

### List Sources / Source Status

```
GET /api/sources
GET /api/sources/status
```

Both return visible sources with health data. Hidden sources (`acled`, `ap`, `reuters`) are excluded.

---

### Get Source

```
GET /api/sources/:id
```

---

### Update Source

```
PUT /api/sources/:id
x-api-key: <ADMIN_API_KEY>
Content-Type: application/json

{ "enabled": true, "interval": 300 }
```

**Auth required:** `x-api-key` header with `ADMIN_API_KEY` from `.env`.
Returns `401` if header missing, `403` if key wrong, `503` if key not configured.

---

### Run Source

```
POST /api/sources/:id/run
x-api-key: <ADMIN_API_KEY>
```

**Auth required:** same as above. Triggers the importer for the given source immediately.

---

## Statistics

```
GET /api/stats              # overview counts
GET /api/stats/summary      # summary with recent activity
GET /api/stats/by-type      # counts grouped by event type
GET /api/stats/by-source    # counts grouped by source
GET /api/stats/timeline     # time series (interval: hour|day|week)
GET /api/stats/hot-regions  # geographic activity buckets
GET /api/stats/markets      # market/commodity snapshot
```

---

## Config

### Public Config

```
GET /api/config/public
```

Returns map provider settings including the MapTiler style URL. The MapTiler API key is included in the style URL — this is intentional and required for browser map rendering. The key should be domain-restricted on the MapTiler dashboard.

**Response:**
```json
{
  "map": {
    "provider": "maptiler",
    "maptiler": {
      "mapId": "dataviz-v4-dark",
      "styleUrl": "https://api.maptiler.com/maps/dataviz-v4-dark/style.json?key=...",
      "labelLanguage": "de",
      "fallbackLanguage": "en"
    }
  }
}
```

---

## Health

```
GET /api/health        # basic liveness check
GET /api/health/ready  # readiness check (DB connection)
```

**Response:**
```json
{ "status": "ok", "timestamp": "2024-01-15T10:30:00Z", "uptime": 3600 }
```

---

## WebSocket

Connect to `/ws` for real-time push updates.

**Incoming events from server:**

| Type | Description |
|------|-------------|
| `event.created` | New event was imported |
| `event.updated` | Existing event was updated (score/data change) |
| `stats:update` | Aggregated stats changed |
| `source.status` | Source run state changed (running / ok / error) |

**Example — new event:**
```json
{
  "type": "event.created",
  "payload": { /* event object */ },
  "timestamp": 1705312200000
}
```

---

## Error Responses

```json
{ "error": "Error message" }
```

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `400` | Bad Request (missing/invalid parameter) |
| `401` | Missing `x-api-key` header |
| `403` | Invalid API key |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Admin endpoint unavailable (key not configured) |
