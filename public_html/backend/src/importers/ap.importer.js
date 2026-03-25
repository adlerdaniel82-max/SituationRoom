const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');
const {
  cleanupText,
  decodeEntities,
  detectEventType,
  getTag,
  matchAll,
  parseRfcDate,
  resolveNewsLocation
} = require('../utils/news-feed');

const AP_RSS_FEED = 'https://apnews.com/rss';

async function run() {
  logger.info('Running AP importer');

  try {
    const response = await axios.get(AP_RSS_FEED, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SituationRoom/1.0; +https://situation.schnueddels.de)'
      }
    });

    const xml = response.data;
    const { items, skippedNoLocation } = await parseApRssFeed(xml);

    let imported = 0;
    let duplicates = 0;

    for (const item of items) {
      const event = {
        ...item,
        source: 'ap'
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    logger.info(`AP importer completed: ${imported} imported, ${duplicates} duplicates, ${skippedNoLocation} skipped_no_location`);
    return { imported, duplicates, skippedNoLocation, total: items.length + skippedNoLocation };
  } catch (error) {
    logger.error('AP importer failed:', error.message);
    throw error;
  }
}

async function parseApRssFeed(xml) {
  const items = matchAll(xml, /<item>([\s\S]*?)<\/item>/g);
  const parsedItems = [];
  let skippedNoLocation = 0;

  for (const itemXml of items) {
    const title = decodeEntities(cleanupText(getTag(itemXml, 'title')));
    const description = decodeEntities(cleanupText(getTag(itemXml, 'description')));
    const link = decodeEntities(getTag(itemXml, 'link'));
    const pubDate = parseRfcDate(getTag(itemXml, 'pubDate'));
    const guid = getTag(itemXml, 'guid');

    if (!title || !link) {
      continue;
    }

    const eventType = detectEventType(title, description);
    const location = await resolveNewsLocation(title, description);
    if (!location) {
      skippedNoLocation += 1;
      continue;
    }

    parsedItems.push({
      title,
      type: eventType,
      source: 'ap',
      lat: location.lat,
      lon: location.lon,
      timestamp: pubDate || new Date(),
      url: link,
      data: {
        type: eventType,
        timestamp: (pubDate || new Date()).toISOString(),
        source_event_id: guid || link,
        title,
        description,
        link,
        pubDate: pubDate?.toISOString() || null,
        eventType,
        location: location.name || null,
        country: location.country || null,
        content_language: 'en',
        ownership_type: 'private_non_state',
        editorial_tier: 'wire',
        is_state_affiliated: false,
        trust_base_score: 0.95,
        feed_access_type: 'rss_open'
      }
    });
  }

  return { items: parsedItems, skippedNoLocation };
}

module.exports = { run };
