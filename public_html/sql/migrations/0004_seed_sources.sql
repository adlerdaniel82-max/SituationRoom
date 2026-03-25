-- Situation Dashboard: Seed Sources Data
-- Initial configuration for data sources

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
    'ap',
    'AP News',
    'humanitarian',
    0,
    1800,
    JSON_OBJECT(
      'feed_url', 'https://apnews.com/rss',
      'parse_format', 'rss',
      'access_model', 'public_feed_review',
      'timeout', 30
    )
  ),
  (
    'reuters',
    'Reuters',
    'humanitarian',
    0,
    1800,
    JSON_OBJECT(
      'feed_urls', JSON_ARRAY(
        'https://www.reutersagency.com/feed/?best-topics=world&post_type=best',
        'https://www.reutersagency.com/feed/?post_type=best&best-topics=breakingviews'
      ),
      'parse_format', 'rss',
      'access_model', 'public_feed_review',
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
      'feed_urls', JSON_ARRAY(
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://feeds.bbci.co.uk/news/uk/rss.xml',
        'https://feeds.bbci.co.uk/news/business/rss.xml',
        'https://feeds.bbci.co.uk/news/politics/rss.xml',
        'https://feeds.bbci.co.uk/news/health/rss.xml',
        'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
        'https://feeds.bbci.co.uk/news/technology/rss.xml'
      ),
      'parse_format', 'rss',
      'access_model', 'public_feed_review',
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
