-- Situation Room fresh-install entry point for the MySQL/MariaDB client.
-- Execute from the repository root after selecting an empty target database:
--   mariadb --database="$DB_NAME" < "$PROJECT_ROOT/install.sql"
--
-- The application installer runs these same migrations through the migration
-- runner and records their checksums in schema_migrations. Do not use this file
-- for an existing installation; use db:migrate instead.

SOURCE public_html/sql/migrations/0001_initial_schema.sql;
SOURCE public_html/sql/migrations/0002_views.sql;
SOURCE public_html/sql/migrations/0003_indexes.sql;
SOURCE public_html/sql/migrations/0004_seed_sources.sql;
SOURCE public_html/sql/migrations/0005_finalize_reuters_reference_mode.sql;
SOURCE public_html/sql/migrations/0006_add_stable_rss_news_sources.sql;
SOURCE public_html/sql/migrations/0007_opensky_classification.sql;
SOURCE public_html/sql/migrations/0008_cleanup_stale_events.sql;
