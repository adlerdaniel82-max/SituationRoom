#!/usr/bin/env node
require('../config/env');
const { runSource } = require('../services/source-runner.service');
const logger = require('../utils/logger');
const { acquireJobLock, isLockError } = require('../utils/job-lock');

async function main() {
  let lock;

  try {
    lock = acquireJobLock('run-bbc');
    const result = await runSource('bbc');
    logger.info('BBC job completed', result);
    lock.release();
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    if (lock) {
      lock.release();
    }
    if (isLockError(error)) {
      logger.warn('BBC job skipped because another run is active');
      process.exit(0);
    }
    logger.error('BBC job failed', error);
    process.exit(1);
  }
}

main();
