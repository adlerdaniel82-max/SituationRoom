-- Situation Dashboard: Seed Sources Data
-- Initial configuration for data sources

USE webuser_situation;

-- Update sources with detailed configuration
UPDATE sources SET config = JSON_OBJECT(
  'api_endpoint', 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  'params', JSON_OBJECT(
    'format', 'geojson',
    'minmagnitude', 4.5,
    'limit', 100
  ),
  'timeout', 30
) WHERE id = 'usgs';

UPDATE sources SET config = JSON_OBJECT(
  'feed_url', 'https://www.gdacs.org/xml/rss.xml',
  'parse_format', 'rss',
  'timeout', 60
) WHERE id = 'gdacs';

UPDATE sources SET config = JSON_OBJECT(
  'api_endpoint', 'https://firms.modaps.eosdis.nasa.gov/api/area',
  'params', JSON_OBJECT(
    'bbox', '-180,-90,180,90',
    'format', 'csv'
  ),
  'requires_api_key', TRUE,
  'timeout', 60
) WHERE id = 'firms';

UPDATE sources SET config = JSON_OBJECT(
  'api_endpoint', 'https://api.acleddata.com/acledapi.json',
  'params', JSON_OBJECT(
    'limit', 100
  ),
  'requires_api_key', TRUE,
  'timeout', 60
) WHERE id = 'acled';

UPDATE sources SET config = JSON_OBJECT(
  'api_endpoint', 'https://api.reliefweb.int/v1/reports',
  'method', 'POST',
  'requires_api_key', TRUE,
  'timeout', 30
) WHERE id = 'reliefweb';

UPDATE sources SET config = JSON_OBJECT(
  'api_endpoint', 'https://opensky-network.org/api/states/all',
  'params', JSON_OBJECT(
    'lamin', -90,
    'lamax', 90,
    'lomin', -180,
    'lomax', 180
  ),
  'requires_auth', TRUE,
  'timeout', 30
) WHERE id = 'opensky';

-- Verify sources
SELECT id, name, type, enabled, interval_seconds, config FROM sources ORDER BY id;
