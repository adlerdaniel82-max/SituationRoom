# API Documentation

## Base URL

```
/api
```

## Events

### List Events

```
GET /api/events?[type=<type[,type2]>][&source=<source[,source2]>][&minScore=<score>][&startDate=<date>][&endDate=<date>][&bbox=<minLon,minLat,maxLon,maxLat>][&format=geojson][&limit=<n>][&offset=<n>]
```

**Parameters:**
- `type` - Filter by one or more event types
- `source` - Filter by one or more sources
- `minScore` - Minimum severity score (0-1)
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `bbox` - Bounding box in `minLon,minLat,maxLon,maxLat`
- `format` - `geojson` for FeatureCollection output, otherwise JSON array
- `limit` - Max results (default: 100, max: 500)
- `offset` - Pagination offset

**Response:**
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
      "geometry": {
        "type": "Point",
        "coordinates": [139.6503, 35.6762]
      },
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

### Get Event

```
GET /api/events/:id
```

### Get Event Validation

```
GET /api/events/:id/validation
```

Liefert die vorberechnete News-Validierungszusammenfassung eines Primärevents sowie persistierte Matches gegen `GDELT` und `ReliefWeb`.

### Get Nearby Events

```
GET /api/events/nearby?lat=<lat>&lon=<lon>[&radius=<km>][&limit=<n>]
```

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

## Sources

### List Sources

```
GET /api/sources
```

### Source Status / Health

```
GET /api/sources/status
```

### Get Source

```
GET /api/sources/:id
```

### Update Source

```
PUT /api/sources/:id
Content-Type: application/json

{
  "enabled": true,
  "interval": 300
}
```

### Run Source

```
POST /api/sources/:id/run
```

## Statistics

### Get Overview

```
GET /api/stats
```

### Get Stats by Type

```
GET /api/stats/by-type
```

### Get Stats by Source

```
GET /api/stats/by-source
```

### Get Timeline

```
GET /api/stats/timeline?[interval=hour|day|week]
```

## Health

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

### Readiness Check

```
GET /api/health/ready
```

## WebSocket

Connect to `/ws` for real-time updates.

### Messages

**Subscribe:**
```json
{
  "type": "subscribe",
  "payload": {
    "channels": ["events", "stats"]
  }
}
```

**New Event:**
```json
{
  "type": "event:new",
  "payload": { /* event object */ },
  "timestamp": 1705312200000
}
```

**Stats Update:**
```json
{
  "type": "stats:update",
  "payload": { /* stats object */ },
  "timestamp": 1705312200000
}
```

## Error Responses

```json
{
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error
