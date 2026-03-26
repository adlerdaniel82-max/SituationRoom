INSERT INTO sources (id, name, type, enabled, interval_seconds, config)
VALUES
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
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  enabled = VALUES(enabled),
  interval_seconds = VALUES(interval_seconds),
  config = VALUES(config);

UPDATE sources
SET
  enabled = 0,
  last_status = 'inactive: public feed retired',
  config = JSON_SET(
    COALESCE(config, JSON_OBJECT()),
    '$.access_model', 'retired_public_feed',
    '$.public_feed_status', 'deprecated_or_404_2026_03_26'
  )
WHERE id IN ('ap', 'reuters');
