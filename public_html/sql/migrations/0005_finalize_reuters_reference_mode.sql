UPDATE sources
SET
  enabled = 0,
  last_status = 'inactive: official public feeds unavailable',
  config = JSON_SET(
    COALESCE(config, JSON_OBJECT()),
    '$.access_model', 'licensed_or_partner_feed_required',
    '$.public_feed_status', 'official_reutersagency_endpoints_404_2026_03_26'
  )
WHERE id = 'reuters';
