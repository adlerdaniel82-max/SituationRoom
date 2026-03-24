#!/usr/bin/env node
require('../config/env');

const { query } = require('../config/db');
const newsValidationService = require('../services/news-validation.service');
const logger = require('../utils/logger');
const { acquireJobLock, isLockError } = require('../utils/job-lock');

const BATCH_SIZE = 100;

async function main() {
  let lock;

  try {
    lock = acquireJobLock('backfill-news-validation');

    let lastId = 0;
    let processed = 0;
    let validated = 0;

    for (;;) {
      const rows = await query(
        `
          SELECT id, title, type, source, lat, lon, magnitude, depth, affected_population, timestamp, url, data, score, updated_at
          FROM events
          WHERE id > ?
            AND source NOT IN ('gdelt', 'reliefweb')
          ORDER BY id ASC
          LIMIT ?
        `,
        [lastId, BATCH_SIZE]
      );

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        lastId = row.id;
        processed += 1;
        const result = await newsValidationService.refreshForEvent(row);
        if (result.status === 'validated') {
          validated += 1;
        }
      }
    }

    logger.info('News validation backfill completed', { processed, validated });
    lock.release();
    process.exit(0);
  } catch (error) {
    if (lock) {
      lock.release();
    }
    if (isLockError(error)) {
      logger.warn('News validation backfill skipped because another run is active');
      process.exit(0);
    }
    logger.error('News validation backfill failed', error);
    process.exit(1);
  }
}

main();
