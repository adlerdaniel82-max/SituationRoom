const crypto = require('crypto');
const eventReportRepository = require('../repositories/event-report.repository');
const eventService = require('./event.service');

const INDUSTRIAL_HEAT_REPORT_TYPE = 'industrial_heat';
const INDUSTRIAL_HEAT_HIDE_THRESHOLD = 3;

async function reportIndustrialHeat(eventId, reporterContext) {
  const event = await eventService.getById(eventId);
  if (!event) {
    return { error: 'not_found' };
  }

  if (event.source !== 'firms' || event.type !== 'fire') {
    return { error: 'unsupported_event_type' };
  }

  const reporterKey = buildReporterKey(reporterContext);
  if (!reporterKey) {
    return { error: 'missing_reporter' };
  }

  const { inserted } = await eventReportRepository.createReport({
    eventId,
    reportType: INDUSTRIAL_HEAT_REPORT_TYPE,
    reporterKey
  });

  const reportCount = await eventReportRepository.countReports(eventId, INDUSTRIAL_HEAT_REPORT_TYPE);

  return {
    inserted,
    reportCount,
    hidden: reportCount >= INDUSTRIAL_HEAT_HIDE_THRESHOLD,
    threshold: INDUSTRIAL_HEAT_HIDE_THRESHOLD,
    reportType: INDUSTRIAL_HEAT_REPORT_TYPE
  };
}

function buildReporterKey(reporterContext = {}) {
  const clientId = String(reporterContext.clientId || '').trim();
  const ip = String(reporterContext.ip || '').trim();
  const userAgent = String(reporterContext.userAgent || '').trim();

  if (!clientId && !ip) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(`${clientId}|${ip}|${userAgent}`)
    .digest('hex');
}

module.exports = {
  reportIndustrialHeat,
  INDUSTRIAL_HEAT_HIDE_THRESHOLD,
  INDUSTRIAL_HEAT_REPORT_TYPE
};
