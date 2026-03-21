#!/usr/bin/env node
require('dotenv').config();
const eventRepository = require('../repositories/event.repository');
const rawRepository = require('../repositories/raw.repository');
const logger = require('../utils/logger');

async function main() {
  try {
    logger.info('Starting cleanup job');

    // Delete events older than 30 days
    const deletedEvents = await eventRepository.deleteOlderThan(30);
    logger.info(`Deleted ${deletedEvents} old events`);

    // Delete raw data older than 7 days
    const deletedRaw = await rawRepository.cleanup(7);
    logger.info(`Deleted ${deletedRaw} old raw data records`);

    logger.info('Cleanup job completed');
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup job failed', error);
    process.exit(1);
  }
}

main();
