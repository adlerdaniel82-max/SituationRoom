USE webuser_situation;

UPDATE sources
SET
  enabled = 1,
  last_status = 'ready: activation requested, waiting for first successful run',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'acled';
