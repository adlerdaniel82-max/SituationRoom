const axios = require('axios');
const env = require('../config/env');
const rawRepository = require('../repositories/raw.repository');
const eventService = require('../services/event.service');
const { resolveCountryCentroid } = require('../utils/country-centroid');
const logger = require('../utils/logger');

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_RATE_LIMIT_DELAY_MS = 6000;
const COUNTRY_LOOKUP_CONCURRENCY = 1;

async function run() {
  logger.info('Running GDELT importer');

  const options = env.sourceOptions.gdelt;
  const query = options.query;
  const response = await fetchDocAttention(query, options);
  const articles = parseDocArticles(response.data);

  if (!response.fromCache) {
    await rawRepository.storeRaw('gdelt', {
      query,
      timespan: options.timespan,
      total_articles: articles.length,
      payload: response.data
    });
  }

  const countryGroups = buildCountryGroups(articles)
    .filter((group) => group.articleCount >= options.minCountryArticles)
    .slice(0, options.maxCountries);

  let imported = 0;
  let duplicates = 0;
  let updated = 0;
  let skipped = 0;

  for (let index = 0; index < countryGroups.length; index += COUNTRY_LOOKUP_CONCURRENCY) {
    const batch = countryGroups.slice(index, index + COUNTRY_LOOKUP_CONCURRENCY);
    const results = await Promise.all(batch.map((group) => importCountryAttention(group, query)));

    for (const result of results) {
      if (!result) {
        skipped += 1;
        continue;
      }

      imported += result.imported;
      duplicates += result.duplicates;
      updated += result.updated;
      skipped += result.skipped;
    }
  }

  logger.info(`GDELT importer completed: ${imported} imported, ${duplicates} duplicates, ${updated} updated, ${skipped} skipped`);
  return {
    imported,
    duplicates,
    updated,
    skipped,
    from_cache: Boolean(response.fromCache),
    total_articles: articles.length,
    grouped_countries: countryGroups.length
  };
}

async function fetchDocAttention(query, options) {
  const params = {
    query,
    mode: 'artlist',
    format: 'json',
    sort: 'date',
    maxrecords: options.maxRecords,
    timespan: options.timespan
  };

  try {
    return await axios.get(GDELT_DOC_API, {
      timeout: options.timeoutMs,
      params
    });
  } catch (error) {
    if (error.response?.status === 429) {
      await wait(GDELT_RATE_LIMIT_DELAY_MS);
      try {
        return await axios.get(GDELT_DOC_API, {
          timeout: options.timeoutMs,
          params
        });
      } catch (retryError) {
        if (retryError.response?.status === 429) {
          const cached = await rawRepository.getLatest('gdelt');
          const createdAt = cached?.created_at || cached?.createdAt || null;
          const cacheAgeHours = createdAt
            ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
            : null;

          if (cached?.payload && (cacheAgeHours === null || cacheAgeHours <= options.cacheMaxAgeHours)) {
            logger.warn(`GDELT rate limited; reusing cached snapshot${cacheAgeHours !== null ? ` (${cacheAgeHours.toFixed(1)}h old)` : ''}`);
            return {
              data: cached.payload,
              fromCache: true
            };
          }
        }

        throw retryError;
      }
    }

    throw error;
  }
}

function parseDocArticles(payload) {
  const articles = Array.isArray(payload?.articles)
    ? payload.articles
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  return articles
    .map((article) => {
      const title = String(article.title || '').trim();
      const url = String(article.url || '').trim();
      const sourceCountry = normalizeCountry(article.sourcecountry);
      const seenAt = parseGdeltDate(article.seendate);

      if (!title || !url || !sourceCountry || !seenAt) {
        return null;
      }

      return {
        title,
        url,
        sourceCountry,
        domain: String(article.domain || '').trim() || null,
        language: String(article.language || '').trim() || null,
        sourceCountryCode: String(article.sourcecountrycode || '').trim() || null,
        seenAt,
        socialImage: String(article.socialimage || '').trim() || null,
        tone: article.tone ?? null
      };
    })
    .filter(Boolean);
}

function buildCountryGroups(articles) {
  const groups = new Map();

  for (const article of articles) {
    const key = article.sourceCountry.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        country: article.sourceCountry,
        articles: []
      });
    }

    groups.get(key).articles.push(article);
  }

  return Array.from(groups.values())
    .map((group) => {
      group.articles.sort((left, right) => right.seenAt - left.seenAt);
      group.articleCount = group.articles.length;
      group.distinctDomains = new Set(group.articles.map((article) => article.domain).filter(Boolean)).size;
      group.latestSeenAt = group.articles[0]?.seenAt || new Date();
      return group;
    })
    .sort((left, right) => right.articleCount - left.articleCount || right.latestSeenAt - left.latestSeenAt);
}

async function importCountryAttention(group, query) {
  const centroid = await resolveCountryCentroid(group.country);
  if (!centroid) {
    logger.warn(`Skipping GDELT country without centroid: ${group.country}`);
    return { imported: 0, duplicates: 0, updated: 0, skipped: 1 };
  }

  const attentionWeight = Math.max(group.articleCount, 1) * 1000;
  const contentLanguages = Array.from(new Set(
    group.articles
      .map((article) => String(article.language || '').trim())
      .filter(Boolean)
  ));
  const event = {
    title: `GDELT Attention: ${group.country}`,
    type: 'humanitarian',
    source: 'gdelt',
    lat: centroid.lat,
    lon: centroid.lon,
    affectedPopulation: attentionWeight,
    timestamp: group.latestSeenAt,
    url: group.articles[0]?.url || null,
    data: {
      type: 'humanitarian',
      timestamp: group.latestSeenAt.toISOString(),
      affectedPopulation: attentionWeight,
      attention_type: 'news_attention',
      attention_country: group.country,
      attention_country_alpha2: centroid.alpha2,
      attention_country_alpha3: centroid.alpha3,
      article_count: group.articleCount,
      distinct_domains: group.distinctDomains,
      content_language: contentLanguages[0] || null,
      content_languages: contentLanguages,
      query,
      articles: group.articles.slice(0, 5).map((article) => ({
        title: article.title,
        url: article.url,
        domain: article.domain,
        language: article.language,
        source_country: article.sourceCountry,
        seen_at: article.seenAt.toISOString(),
        social_image: article.socialImage,
        tone: article.tone
      }))
    }
  };

  const result = await eventService.create(event);
  if (!result.isDuplicate) {
    return { imported: 1, duplicates: 0, updated: 0, skipped: 0 };
  }

  await eventService.update(result.id, {
    title: event.title,
    data: event.data
  });

  return { imported: 0, duplicates: 1, updated: 1, skipped: 0 };
}

function parseGdeltDate(value) {
  const input = String(value || '').trim();
  if (!input) {
    return null;
  }

  const compactMatch = input.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (compactMatch) {
    const [, year, month, day, hour, minute, second] = compactMatch;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeCountry(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wait(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

module.exports = { run };
