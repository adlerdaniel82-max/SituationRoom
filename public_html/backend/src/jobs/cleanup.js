#!/usr/bin/env node
require('../config/env');
const eventRepository = require('../repositories/event.repository');
const rawRepository = require('../repositories/raw.repository');
const logger = require('../utils/logger');
const { acquireJobLock, isLockError } = require('../utils/job-lock');

async function main() {
  let lock;

  try {
    lock = acquireJobLock('cleanup');
    logger.info('Starting cleanup job');

    // Delete events older than 30 days
    const deletedEvents = await eventRepository.deleteOlderThan(30);
    logger.info(`Deleted ${deletedEvents} old events`);

    // Delete raw data older than 7 days
    const deletedRaw = await rawRepository.cleanup(7);
    logger.info(`Deleted ${deletedRaw} old raw data records`);

    logger.info('Cleanup job completed');
    lock.release();
    process.exit(0);
  } catch (error) {
    if (lock) {
      lock.release();
    }
    if (isLockError(error)) {
      logger.warn('Cleanup job skipped because another run is active');
      process.exit(0);
    }
    logger.error('Cleanup job failed', error);
    process.exit(1);
  }
}

main();
