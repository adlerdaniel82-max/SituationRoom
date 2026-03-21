#!/usr/bin/env node
require('dotenv').config();
const { runSource } = require('../services/source-runner.service');
const logger = require('../utils/logger');

async function main() {
  try {
    const result = await runSource('usgs');
    logger.info('USGS job completed', result);
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    logger.error('USGS job failed', error);
    process.exit(1);
  }
}

main();
