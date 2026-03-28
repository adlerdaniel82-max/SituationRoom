const axios = require('axios');
const eventService = require('../services/event.service');
const logger = require('../utils/logger');
const {
  cleanupText,
  decodeEntities,
  detectEventType,
  extractFeedLanguage,
  getTag,
  getTagList,
  isRecentNewsItem,
  isRelevantNewsItem,
  matchAll,
  normalizeNewsUrl,
  parseRfcDate,
  resolveNewsLocation,
  sourceDomainFromUrl
} = require('../utils/news-feed');

function createRssNewsImporter(sourceConfig) {
  return {
    async run() {
      logger.info(`Running ${sourceConfig.displayName} importer`);

      const allItems = [];
      let successfulFeeds = 0;

      for (const [category, feedUrl] of Object.entries(sourceConfig.feeds)) {
        try {
          const response = await axios.get(feedUrl, {
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SituationRoom/1.0; +https://situation.schnueddels.de)'
            }
          });

          const xml = response.data;
          const batch = await parseRssFeed(xml, category, sourceConfig);
          allItems.push(batch);
          successfulFeeds += 1;
          logger.info(`${sourceConfig.displayName} ${category} feed: ${batch.items.length} items, ${batch.skippedOld} skipped_old, ${batch.skippedNoKeyword} skipped_no_keyword, ${batch.skippedNoLocation} skipped_no_location, ${batch.skippedDuplicateFeed} skipped_duplicate_feed`);
        } catch (error) {
          logger.warn(`${sourceConfig.displayName} ${category} feed failed: ${error.message}`);
        }
      }

      const totalFeeds = Object.keys(sourceConfig.feeds).length;

      if (successfulFeeds === 0) {
        throw new Error(`${sourceConfig.displayName} feeds unavailable`);
      }

      const partialFailure = successfulFeeds < totalFeeds * 0.5
        ? `warning: ${totalFeeds - successfulFeeds}/${totalFeeds} feeds failed`
        : null;

      let imported = 0;
      let duplicates = 0;
      let skippedNoLocation = 0;
      let skippedNoKeyword = 0;
      let skippedOld = 0;
      let skippedDuplicateFeed = 0;

      for (const item of allItems.flatMap((batch) => batch.items || [])) {
        const result = await eventService.create(item);
        if (result.isDuplicate) {
          duplicates += 1;
        } else {
          imported += 1;
        }
      }

      skippedNoLocation = allItems.reduce((sum, batch) => sum + (batch.skippedNoLocation || 0), 0);
      skippedNoKeyword = allItems.reduce((sum, batch) => sum + (batch.skippedNoKeyword || 0), 0);
      skippedOld = allItems.reduce((sum, batch) => sum + (batch.skippedOld || 0), 0);
      skippedDuplicateFeed = allItems.reduce((sum, batch) => sum + (batch.skippedDuplicateFeed || 0), 0);
      const total = allItems.reduce((sum, batch) => sum + (batch.total || 0), 0);

      if (partialFailure) {
        logger.warn(`${sourceConfig.displayName} ${partialFailure}`);
      }
      logger.info(`${sourceConfig.displayName} importer completed: ${imported} imported, ${duplicates} duplicates, ${skippedOld} skipped_old, ${skippedNoKeyword} skipped_no_keyword, ${skippedNoLocation} skipped_no_location, ${skippedDuplicateFeed} skipped_duplicate_feed`);
      return { imported, duplicates, skippedOld, skippedNoKeyword, skippedNoLocation, skippedDuplicateFeed, total, partialFailure };
    }
  };
}

async function parseRssFeed(xml, category, sourceConfig, options = {}) {
  const items = matchAll(xml, /<item>([\s\S]*?)<\/item>/g).slice(0, Math.max(1, Number(sourceConfig.maxItems || 40)));
  const parsedItems = [];
  let skippedNoLocation = 0;
  let skippedNoKeyword = 0;
  let skippedOld = 0;
  let skippedDuplicateFeed = 0;
  const feedLanguage = extractFeedLanguage(xml) || sourceConfig.contentLanguage || 'en';
  const seenKeys = new Set();
  const resolveLocation = typeof options.resolveLocation === 'function' ? options.resolveLocation : resolveNewsLocation;

  for (const itemXml of items) {
    const title = decodeEntities(cleanupText(getTag(itemXml, 'title')));
    const description = decodeEntities(cleanupText(getTag(itemXml, 'description')));
    const link = decodeEntities(getTag(itemXml, 'link'));
    const pubDate = parseRfcDate(getTag(itemXml, 'pubDate'));
    const guid = getTag(itemXml, 'guid');
    const categories = getTagList(itemXml, 'category').map((value) => decodeEntities(cleanupText(value))).filter(Boolean);

    if (!title || !link || !pubDate) {
      skippedOld += 1;
      continue;
    }

    if (!isRecentNewsItem(pubDate, sourceConfig.maxAgeHours || 12)) {
      skippedOld += 1;
      continue;
    }

    const eventType = detectEventType(title, description);
    if (!isRelevantNewsItem(title, description, categories, eventType)) {
      skippedNoKeyword += 1;
      continue;
    }

    const normalizedUrl = normalizeNewsUrl(link);
    const feedKey = `${normalizedUrl || link}|${title.toLowerCase()}`;
    if (seenKeys.has(feedKey)) {
      skippedDuplicateFeed += 1;
      continue;
    }

    const location = await resolveLocation(title, description, {
      sourceId: sourceConfig.sourceId,
      category,
      eventType
    });
    if (!location) {
      skippedNoLocation += 1;
      continue;
    }

    seenKeys.add(feedKey);
    parsedItems.push({
      title,
      type: eventType === 'other' ? 'humanitarian' : eventType,
      source: sourceConfig.sourceId,
      lat: location.lat,
      lon: location.lon,
      timestamp: pubDate,
      url: normalizedUrl || link,
      data: {
        type: eventType === 'other' ? 'humanitarian' : eventType,
        timestamp: pubDate.toISOString(),
        source_event_id: guid || normalizedUrl || link,
        title,
        description,
        link: normalizedUrl || link,
        pubDate: pubDate.toISOString(),
        eventType: eventType === 'other' ? 'humanitarian' : eventType,
        location: location.name || null,
        country: location.country || null,
        categories,
        content_language: feedLanguage,
        source_domain: sourceDomainFromUrl(link),
        rss_category: category,
        visibility_tier: sourceConfig.visibilityTier,
        ownership_type: sourceConfig.ownershipType,
        editorial_tier: sourceConfig.editorialTier,
        is_state_affiliated: sourceConfig.isStateAffiliated,
        trust_base_score: sourceConfig.trustBaseScore,
        feed_access_type: sourceConfig.feedAccessType
      }
    });
  }

  return {
    items: parsedItems,
    skippedNoLocation,
    skippedNoKeyword,
    skippedOld,
    skippedDuplicateFeed,
    total: items.length
  };
}

module.exports = { createRssNewsImporter, parseRssFeed };
