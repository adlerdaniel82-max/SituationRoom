#!/usr/bin/env node
require('../config/env');

const { query } = require('../config/db');
const eventRepository = require('../repositories/event.repository');
const scoringService = require('../services/scoring.service');
const logger = require('../utils/logger');
const { acquireJobLock, isLockError } = require('../utils/job-lock');

const BATCH_SIZE = 200;

async function main() {
  let lock;

  try {
    lock = acquireJobLock('backfill-scoring');

    let lastId = 0;
    let processed = 0;
    let updated = 0;

    for (;;) {
      const rows = await query(
        `
          SELECT id, type, source, lat, lon, magnitude, depth, affected_population, timestamp, url, data, score, updated_at
          FROM events
          WHERE id > ?
          ORDER BY id ASC
          LIMIT ?
        `,
        [lastId, BATCH_SIZE]
      );

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        processed += 1;
        lastId = row.id;

        const data = parseJson(row.data);
        const scoringInput = {
          ...row,
          affectedPopulation: toNullableNumber(row.affected_population),
          data
        };
        const scoring = await scoringService.calculateDetailed(scoringInput);
        const mergedData = attachScoringToData(data, scoring);

        const currentScoring = data?.scoring || {};
        const scoringChanged =
          currentScoring.source_confidence !== scoring.source_confidence
          || currentScoring.event_severity !== scoring.event_severity
          || currentScoring.validation_score !== scoring.validation_score
          || currentScoring.attention_score !== scoring.attention_score
          || currentScoring.combined_score !== scoring.score
          || Number(row.score) !== scoring.score;

        if (!scoringChanged) {
          continue;
        }

        await eventRepository.update(row.id, {
          magnitude: row.magnitude,
          score: scoring.score,
          data: mergedData,
          updated_at: row.updated_at
        });
        updated += 1;
      }
    }

    logger.info('Scoring backfill completed', { processed, updated });
    lock.release();
    process.exit(0);
  } catch (error) {
    if (lock) {
      lock.release();
    }
    if (isLockError(error)) {
      logger.warn('Scoring backfill skipped because another run is active');
      process.exit(0);
    }
    logger.error('Scoring backfill failed', error);
    process.exit(1);
  }
}

function parseJson(value) {
  if (!value || typeof value !== 'string') {
    return value && typeof value === 'object' ? value : {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function attachScoringToData(data, scoring) {
  return {
    ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
    scoring: {
      source_confidence: scoring.source_confidence,
      event_severity: scoring.event_severity,
      validation_score: scoring.validation_score,
      attention_score: scoring.attention_score,
      combined_score: scoring.score
    }
  };
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

main();
