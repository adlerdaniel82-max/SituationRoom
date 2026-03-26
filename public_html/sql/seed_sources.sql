-- Situation Dashboard: Seed Sources Data
-- Initial configuration for data sources

USE webuser_situation;

-- Idempotent upsert of source definitions and runtime defaults
INSERT INTO sources (id, name, type, enabled, interval_seconds, config) VALUES
  (
    'usgs',
    'USGS Earthquakes',
    'earthquake',
    1,
    300,
    JSON_OBJECT(
      'api_endpoint', 'https://earthquake.usgs.gov/fdsnws/event/1/query',
      'params', JSON_OBJECT('format', 'geojson', 'minmagnitude', 4.5, 'limit', 100),
      'timeout', 30
    )
  ),
  (
    'gdacs',
    'GDACS Disasters',
    'disaster',
    1,
    600,
    JSON_OBJECT(
      'feed_url', 'https://www.gdacs.org/xml/rss.xml',
      'parse_format', 'rss',
      'timeout', 60
    )
  ),
  (
    'gdelt',
    'GDELT Attention',
    'humanitarian',
    1,
    10800,
    JSON_OBJECT(
      'doc_endpoint', 'https://api.gdeltproject.org/api/v2/doc/doc',
      'query_mode', 'country_attention',
      'timespan', '6h',
      'maxrecords', 60,
      'min_country_articles', 1,
      'max_countries', 20,
      'country_lookup', 'https://restcountries.com/v3.1/name',
      'timeout', 30
    )
  ),
  (
    'noaa_tsunami',
    'NOAA Tsunami',
    'tsunami',
    1,
    300,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY(
        'https://www.tsunami.gov/events/xml/PAAQAtom.xml',
        'https://www.tsunami.gov/events/xml/PHEBAtom.xml'
      ),
      'parse_format', 'atom',
      'provider', 'NOAA Tsunami.gov',
      'timeout', 30
    )
  ),
  (
    'firms',
    'FIRMS Fires',
    'fire',
    1,
    600,
    JSON_OBJECT(
      'api_endpoint', 'https://firms.modaps.eosdis.nasa.gov/api/area',
      'params', JSON_OBJECT('bbox', '-180,-90,180,90', 'format', 'csv'),
      'requires_api_key', TRUE,
      'timeout', 60
    )
  ),
  (
    'acled',
    'ACLED Conflicts',
    'conflict',
    0,
    3600,
    JSON_OBJECT(
      'api_endpoint', 'https://acleddata.com/api/acled/read',
      'auth_endpoint', 'https://acleddata.com/oauth/token',
      'auth_mode', 'oauth2_password',
      'params', JSON_OBJECT('limit', 100, 'event_date_where', 'BETWEEN'),
      'requires_auth', TRUE,
      'timeout', 60
    )
  ),
  (
    'reliefweb',
    'ReliefWeb',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'api_endpoint', 'https://api.reliefweb.int/v2/reports',
      'access_model', 'approved_appname',
      'method', 'POST',
      'preset', 'latest',
      'profile', 'list',
      'timeout', 30
    )
  ),
  (
    'bbc',
    'BBC News',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://feeds.bbci.co.uk/news/world/rss.xml'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'primary',
      'trust_base_score', 0.92,
      'timeout', 30
    )
  ),
  (
    'guardian',
    'The Guardian',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://www.theguardian.com/world/rss'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'primary',
      'trust_base_score', 0.90,
      'timeout', 30
    )
  ),
  (
    'aljazeera',
    'Al Jazeera',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://www.aljazeera.com/xml/rss/all.xml'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'primary',
      'trust_base_score', 0.88,
      'timeout', 30
    )
  ),
  (
    'dw',
    'DW',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://rss.dw.com/xml/rss-en-all'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'secondary',
      'trust_base_score', 0.87,
      'timeout', 30
    )
  ),
  (
    'france24',
    'France24',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://www.france24.com/en/rss'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'secondary',
      'trust_base_score', 0.86,
      'timeout', 30
    )
  ),
  (
    'npr',
    'NPR',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://feeds.npr.org/1004/rss.xml'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'secondary',
      'trust_base_score', 0.89,
      'timeout', 30
    )
  ),
  (
    'skynews',
    'Sky News',
    'humanitarian',
    1,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY('https://feeds.skynews.com/feeds/rss/world.xml'),
      'parse_format', 'rss',
      'access_model', 'public_feed_stable',
      'visibility_tier', 'secondary',
      'trust_base_score', 0.85,
      'timeout', 30
    )
  ),
  (
    'opensky',
    'OpenSky Network',
    'aviation',
    1,
    60,
    JSON_OBJECT(
      'api_endpoint', 'https://opensky-network.org/api/states/all',
      'auth_endpoint', 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      'auth_mode', 'oauth2_client_credentials',
      'params', JSON_OBJECT('extended', 1, 'lamin', -90, 'lamax', 90, 'lomin', -180, 'lomax', 180),
      'requires_auth', TRUE,
      'timeout', 30
    )
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  enabled = VALUES(enabled),
  interval_seconds = VALUES(interval_seconds),
  config = VALUES(config);

-- Verify sources
SELECT id, name, type, enabled, interval_seconds, config FROM sources ORDER BY id;
