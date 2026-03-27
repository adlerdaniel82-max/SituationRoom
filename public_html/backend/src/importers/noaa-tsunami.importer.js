const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const NOAA_TSUNAMI_FEEDS = [
  {
    center: 'ntwc',
    url: 'https://www.tsunami.gov/events/xml/PAAQAtom.xml'
  },
  {
    center: 'ptwc',
    url: 'https://www.tsunami.gov/events/xml/PHEBAtom.xml'
  }
];

async function run() {
  logger.info('Running NOAA Tsunami importer');

  let imported = 0;
  let duplicates = 0;
  let total = 0;

  for (const feed of NOAA_TSUNAMI_FEEDS) {
    const response = await axios.get(feed.url, {
      timeout: 30000,
      responseType: 'text',
      transformResponse: [(body) => body]
    });

    const entries = parseAtomFeed(response.data, feed.center);
    total += entries.length;

    for (const entry of entries) {
      const result = await eventService.create(entry);
      if (result.isDuplicate) {
        duplicates += 1;
      } else {
        imported += 1;
      }
    }
  }

  logger.info(`NOAA Tsunami importer completed: ${imported} imported, ${duplicates} duplicates`);
  return { imported, duplicates, total };
}

function parseAtomFeed(xml, center) {
  const entries = matchAllBlocks(xml, 'entry');
  return entries
    .map((entryXml) => parseEntry(entryXml, center))
    .filter(Boolean);
}

function parseEntry(entryXml, center) {
  const title = decodeXml(getFirstTag(entryXml, 'title'));
  const updated = getFirstTag(entryXml, 'updated');
  const lat = Number(getFirstTag(entryXml, 'geo:lat'));
  const lon = Number(getFirstTag(entryXml, 'geo:long'));
  const summary = getSummaryText(entryXml);
  const bulletinUrl = getLinkHref(entryXml, 'alternate') || getLinkHref(entryXml, 'related') || null;
  const capUrl = getLinkHref(entryXml, 'related', 'CapXML document');
  const category = extractSummaryValue(summary, 'Category');
  const magnitude = Number(extractSummaryValue(summary, 'Preliminary Magnitude')?.match(/[\d.]+/)?.[0] || NaN);
  const affectedRegion = extractSummaryValue(summary, 'Affected Region') || title;
  const bulletinIssueTime = extractSummaryValue(summary, 'Bulletin Issue Time');

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !title) {
    return null;
  }

  return {
    title: `NOAA Tsunami ${category || 'Bulletin'}: ${affectedRegion}`,
    type: 'tsunami',
    source: 'noaa_tsunami',
    lat,
    lon,
    magnitude: Number.isFinite(magnitude) ? magnitude : null,
    timestamp: new Date(updated || bulletinIssueTime || Date.now()),
    url: bulletinUrl,
    data: {
      center,
      category: category || null,
      affected_region: affectedRegion,
      bulletin_issue_time: bulletinIssueTime || null,
      bulletin_title: title,
      summary,
      cap_url: capUrl || null,
      content_language: 'en'
    }
  };
}

function getSummaryText(entryXml) {
  const match = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
  if (!match) {
    return '';
  }

  return decodeXml(
    match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(strong|b)[^>]*>/gi, '')
      .replace(/<a[^>]*>/gi, '')
      .replace(/<\/a>/gi, '')
      .replace(/<img[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

function extractSummaryValue(summary, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedLabel}:\\s*([^\\n]+)`, 'i');
  return summary.match(regex)?.[1]?.trim() || null;
}

function getFirstTag(xml, tagName) {
  const regex = new RegExp(`<${escapeTag(tagName)}[^>]*>([\\s\\S]*?)<\\/${escapeTag(tagName)}>`, 'i');
  return xml.match(regex)?.[1]?.trim() || '';
}

function getLinkHref(xml, relValue, titleValue = null) {
  const links = xml.match(/<link\b[^>]*\/>/gi) || [];
  for (const link of links) {
    const rel = getAttribute(link, 'rel');
    const title = getAttribute(link, 'title');
    if (rel === relValue && (!titleValue || title === titleValue)) {
      return decodeXml(getAttribute(link, 'href') || '');
    }
  }
  return null;
}

function getAttribute(xml, attributeName) {
  const regex = new RegExp(`${attributeName}="([^"]*)"`, 'i');
  return xml.match(regex)?.[1] || '';
}

function matchAllBlocks(xml, tagName) {
  const regex = new RegExp(`<${escapeTag(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeTag(tagName)}>`, 'gi');
  const blocks = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function escapeTag(tagName) {
  return tagName.replace(':', '\\:');
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

module.exports = { run };
