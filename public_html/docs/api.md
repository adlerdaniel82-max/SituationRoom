# API Documentation

## Base URL

```
/api
```

## Events

### List Events

```
GET /api/events?[type=<type>][&source=<source>][&minScore=<score>][&startDate=<date>][&endDate=<date>][&limit=<n>][&offset=<n>]
```

**Parameters:**
- `type` - Filter by event type (earthquake, fire, disaster, conflict, humanitarian, aviation)
- `source` - Filter by source (usgs, gdacs, firms, acled, reliefweb, opensky)
- `minScore` - Minimum severity score (0-1)
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `limit` - Max results (default: 100, max: 1000)
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

### Get Event

```
GET /api/events/:id
```

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
