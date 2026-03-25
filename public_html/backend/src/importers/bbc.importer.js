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

const BBC_RSS_FEEDS = {
  world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  uk: 'https://feeds.bbci.co.uk/news/uk/rss.xml',
  business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  politics: 'https://feeds.bbci.co.uk/news/politics/rss.xml',
  health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
  science_and_environment: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  technology: 'https://feeds.bbci.co.uk/news/technology/rss.xml'
};

async function run() {
  logger.info('Running BBC News importer');

  const allItems = [];

  try {
    for (const [category, feedUrl] of Object.entries(BBC_RSS_FEEDS)) {
      try {
        const response = await axios.get(feedUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SituationRoom/1.0; +https://situation.schnueddels.de)'
          }
        });

        const xml = response.data;
        const batch = await parseBbcRssFeed(xml, category);
        allItems.push(batch);

        logger.info(`BBC ${category} feed: ${batch.items.length} items, ${batch.skippedNoLocation} skipped_no_location`);
      } catch (error) {
        logger.warn(`BBC ${category} feed failed: ${error.message}`);
      }
    }

    let imported = 0;
    let duplicates = 0;
    let skippedNoLocation = 0;

    for (const item of allItems.flatMap((batch) => batch.items || [])) {
      const event = {
        ...item,
        source: 'bbc'
      };

      const result = await eventService.create(event);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    skippedNoLocation = allItems.reduce((sum, batch) => sum + (batch.skippedNoLocation || 0), 0);
    const total = allItems.reduce((sum, batch) => sum + (batch.items?.length || 0), 0) + skippedNoLocation;
    logger.info(`BBC News importer completed: ${imported} imported, ${duplicates} duplicates, ${skippedNoLocation} skipped_no_location`);
    return { imported, duplicates, skippedNoLocation, total };
  } catch (error) {
    logger.error('BBC News importer failed:', error.message);
    throw error;
  }
}

async function parseBbcRssFeed(xml, category) {
  const items = matchAll(xml, /<item>([\s\S]*?)<\/item>/g);
  const parsedItems = [];
  let skippedNoLocation = 0;
  const feedLanguage = cleanupText(getTag(xml, 'language')).toLowerCase() || 'en-gb';

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
      source: 'bbc',
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
        content_language: feedLanguage,
        category,
        ownership_type: 'public_broadcaster',
        editorial_tier: 'major_outlet',
        is_state_affiliated: false,
        trust_base_score: 0.88,
        feed_access_type: 'rss_open'
      }
    });
  }

  return { items: parsedItems, skippedNoLocation };
}

module.exports = { run };
