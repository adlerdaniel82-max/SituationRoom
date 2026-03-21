const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');

const GDACS_RSS = 'https://www.gdacs.org/xml/rss.xml';

async function run() {
  logger.info('Running GDACS importer');

  try {
    const response = await axios.get(GDACS_RSS);
    const xml = response.data;
    const events = parseGdacsFeed(xml);

    let imported = 0;
    let duplicates = 0;

    for (const eventData of events) {
      const event = {
        ...eventData,
        type: 'disaster',
        source: 'gdacs'
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`GDACS importer completed: ${imported} imported, ${duplicates} duplicates`);
    return { imported, duplicates, total: events.length };
  } catch (error) {
    logger.error('GDACS importer failed:', error.message);
    throw error;
  }
}

function parseGdacsFeed(xml) {
  const items = matchAll(xml, /<item>([\s\S]*?)<\/item>/g);

  return items
    .map((itemXml) => {
      const eventTypeCode = getTag(itemXml, 'gdacs:eventtype');
      const eventId = getTag(itemXml, 'gdacs:eventid');
      const episodeId = getTag(itemXml, 'gdacs:episodeid');
      const lat = Number(getTag(itemXml, 'geo:lat'));
      const lon = Number(getTag(itemXml, 'geo:long'));

      if (!eventTypeCode || !eventId || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const severityTag = getTagAttributes(itemXml, 'gdacs:severity');
      const populationTag = getTagAttributes(itemXml, 'gdacs:population');
      const description = cleanupText(getTag(itemXml, 'description'));
      const title = cleanupText(getTag(itemXml, 'title'));
      const eventName = cleanupText(getTag(itemXml, 'gdacs:eventname'));

      return {
        title: eventName ? `${title} (${eventName})` : title,
        type: mapEventType(eventTypeCode),
        source: 'gdacs',
        lat,
        lon,
        magnitude: parseOptionalNumber(severityTag.value),
        affectedPopulation: parseOptionalNumber(populationTag.value),
        timestamp: parseRfcDate(getTag(itemXml, 'gdacs:fromdate')) || parseRfcDate(getTag(itemXml, 'pubDate')),
        url: decodeEntities(getTag(itemXml, 'link')),
        data: {
          source_event_id: `${eventTypeCode}${eventId}:${episodeId || '0'}`,
          description,
          eventTypeCode,
          alertLevel: getTag(itemXml, 'gdacs:alertlevel'),
          severityText: cleanupText(severityTag.text),
          severityUnit: severityTag.unit || null,
          populationText: cleanupText(populationTag.text),
          populationUnit: populationTag.unit || null,
          country: cleanupText(getTag(itemXml, 'gdacs:country')),
          iso3: cleanupText(getTag(itemXml, 'gdacs:iso3')),
          rawTitle: title
        }
      };
    })
    .filter(Boolean);
}

function mapEventType(code) {
  switch (code) {
    case 'EQ':
      return 'earthquake';
    case 'VO':
      return 'disaster';
    case 'FL':
      return 'flood';
    case 'TC':
      return 'disaster';
    default:
      return 'disaster';
  }
}

function matchAll(input, regex) {
  return [...input.matchAll(regex)].map((match) => match[1]);
}

function getTag(input, tagName) {
  const escaped = escapeRegExp(tagName);
  const match = input.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeEntities(match[1].trim()) : '';
}

function getTagAttributes(input, tagName) {
  const escaped = escapeRegExp(tagName);
  const match = input.match(new RegExp(`<${escaped}([^>]*)>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  if (!match) {
    return { text: '', value: null, unit: null };
  }

  return {
    text: decodeEntities(match[2].trim()),
    value: getAttribute(match[1], 'value'),
    unit: getAttribute(match[1], 'unit')
  };
}

function getAttribute(input, name) {
  const match = input.match(new RegExp(`${escapeRegExp(name)}="([^"]*)"`));
  return match ? decodeEntities(match[1]) : null;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRfcDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
}

function cleanupText(value) {
  return decodeEntities(String(value || '').replace(/\s+/g, ' ').trim());
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { run };
