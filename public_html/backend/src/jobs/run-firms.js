#!/usr/bin/env node
require('dotenv').config();
const { runSource } = require('../services/source-runner.service');
const logger = require('../utils/logger');

async function main() {
  try {
    const result = await runSource('firms');
    logger.info('FIRMS job completed', result);
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    logger.error('FIRMS job failed', error);
    process.exit(1);
  }
}

main();
