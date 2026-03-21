#!/usr/bin/env node
require('dotenv').config();
const { runSource } = require('../services/source-runner.service');
const logger = require('../utils/logger');

async function main() {
  try {
    const result = await runSource('reliefweb');
    logger.info('ReliefWeb job completed', result);
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    logger.error('ReliefWeb job failed', error);
    process.exit(1);
  }
}

main();
