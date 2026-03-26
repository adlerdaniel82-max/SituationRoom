const axios = require('axios');
const { resolveCountryCentroid } = require('./country-centroid');

const EVENT_TYPE_KEYWORDS = {
  earthquake: ['earthquake', 'quake', 'seismic', 'tremor', 'erdbeben'],
  tsunami: ['tsunami', 'tidal wave'],
  volcano: ['volcano', 'volcanic', 'eruption', 'ash cloud', 'vulkan'],
  flood: ['flood', 'flooding', 'inundation', 'flash flood', 'ueberschwemmung', 'hochwasser'],
  fire: ['wildfire', 'wild fire', 'bushfire', 'forest fire', 'blaze', 'firefighters', 'brand', 'feuer'],
  hurricane: ['hurricane', 'cyclone', 'typhoon', 'storm', 'tropical storm'],
  conflict: ['war', 'conflict', 'military', 'strike', 'attack', 'invasion', 'missile', 'drone', 'shelling', 'krieg', 'konflikt'],
  humanitarian: ['humanitarian', 'refugee', 'evacuation', 'crisis', 'aid', 'displacement', 'evacuees', 'krise', 'evakuierung']
};

const RELEVANT_NEWS_KEYWORDS = Array.from(new Set([
  ...Object.values(EVENT_TYPE_KEYWORDS).flat(),
  'disaster',
  'emergency',
  'catastrophe',
  'evacuate',
  'evacuated',
  'evacuating',
  'conflicts',
  'militant',
  'troops',
  'ceasefire',
  'airstrike',
  'explosion',
  'outbreak',
  'landslide',
  'drought',
  'famine',
  'hostage',
  'massacre',
  'attackers',
  'invasion',
  'disaster',
  'katastrophe'
]));

const LOCATION_PATTERNS = [
  /\b(?:in|near|across|from|over|amid|inside)\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})/g,
  /\b([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})\s+(?:earthquake|quake|wildfire|floods?|storm|violence|conflict|attack|evacuation|eruption)/g,
  /\b([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})\s+(?:state|province|territory|district|region)\b/g,
  /\b(West Bank|Gaza Strip|Gaza)\b/g
];

const DATELINE_PATTERNS = [
  /^([\p{Lu}][\p{L}'’. -]+(?:\s*,\s*[\p{Lu}][\p{L}'’. -]+){0,2})\s+\((?:AP|Reuters|BBC)\)\s*(?:—|-|:)/u,
  /^([\p{Lu}][\p{L}'’. -]+(?:\s*,\s*[\p{Lu}][\p{L}'’. -]+){0,2})\s*(?:—|-|:)/u
];

const GENERIC_LOCATION_TERMS = new Set([
  'AP', 'BBC', 'News', 'World', 'Business', 'Politics', 'Health', 'Science', 'Technology',
  'Democrats', 'Republicans', 'Europe', 'Asia', 'Africa', 'Middle East', 'West', 'East',
  'North', 'South', 'House', 'Senate', 'Court', 'Agency', 'Police', 'Army', 'Navy',
  'Reuters', 'Breakingviews', 'Top News', 'Congressman', 'Newsnight', 'Siege', 'Warmest Day'
]);

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_TIMEOUT_MS = 1500;
const MAX_CANDIDATES = 5;
const MAX_GEOCODE_ATTEMPTS_PER_ITEM = 1;
const geocodeCache = new Map();

function matchAll(input, regex) {
  return [...String(input || '').matchAll(regex)].map((match) => match[1]);
}

function getTag(input, tagName) {
  const escaped = escapeRegExp(tagName);
  const match = String(input || '').match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? match[1].trim() : '';
}

function getTagList(input, tagName) {
  const escaped = escapeRegExp(tagName);
  return Array.from(
    String(input || '').matchAll(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'gi'))
  ).map((match) => cleanupText(match[1]));
}

function parseRfcDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function cleanupText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

function stripHtml(value) {
  return cleanupText(String(value || '').replace(/<[^>]+>/g, ' '));
}

function detectEventType(title, description) {
  const text = `${stripHtml(title)} ${stripHtml(description)}`.toLowerCase();

  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return type;
    }
  }

  return 'other';
}

function extractFeedLanguage(xml) {
  const fromLanguageTag = decodeEntities(cleanupText(getTag(xml, 'language')));
  if (fromLanguageTag) {
    return normalizeLanguageCode(fromLanguageTag);
  }

  const fromDcLanguage = decodeEntities(cleanupText(getTag(xml, 'dc:language')));
  if (fromDcLanguage) {
    return normalizeLanguageCode(fromDcLanguage);
  }

  return null;
}

function isRecentNewsItem(pubDate, maxAgeHours = 12) {
  if (!(pubDate instanceof Date) || Number.isNaN(pubDate.getTime())) {
    return false;
  }

  const ageMs = Date.now() - pubDate.getTime();
  const maxAgeMs = Math.max(1, Number(maxAgeHours) || 12) * 60 * 60 * 1000;

  return ageMs >= -(60 * 60 * 1000) && ageMs <= maxAgeMs;
}

function isRelevantNewsItem(title, description, categories = [], eventType = 'other') {
  if (eventType && eventType !== 'other') {
    return true;
  }

  const haystack = [
    stripHtml(title),
    stripHtml(description),
    ...(Array.isArray(categories) ? categories : [])
  ].join(' ').toLowerCase();

  return RELEVANT_NEWS_KEYWORDS.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function normalizeNewsUrl(value) {
  const raw = cleanupText(value);
  if (!raw) {
    return '';
  }

  try {
    const url = new URL(raw);
    const filteredParams = new URLSearchParams();
    for (const [key, paramValue] of url.searchParams.entries()) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.startsWith('utm_')
        || normalizedKey.startsWith('_x_tr_')
        || ['at_medium', 'at_campaign', 'rss', 'ocid', 'fbclid', 'gclid', 'cmpid'].includes(normalizedKey)
      ) {
        continue;
      }
      filteredParams.append(key, paramValue);
    }

    url.search = filteredParams.toString();
    url.hash = '';
    return url.toString().replace(/\?$/, '');
  } catch {
    return raw;
  }
}

function sourceDomainFromUrl(value) {
  const raw = cleanupText(value);
  if (!raw) {
    return '';
  }

  try {
    return String(new URL(raw).hostname || '')
      .trim()
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function resolveNewsLocation(title, description) {
  const candidates = extractLocationCandidates(title, description);
  const geocodeState = { attempts: 0 };

  for (const candidate of candidates) {
    try {
      const resolved = await resolveLocationCandidate(candidate, geocodeState);
      if (resolved) {
        return {
          ...resolved,
          name: candidate
        };
      }
    } catch {
      // Ignore non-country candidates and continue with the next phrase.
    }
  }

  return null;
}

function extractLocationCandidates(title, description) {
  const titleText = String(title || '');
  const descriptionText = String(description || '');
  const text = `${titleText}. ${descriptionText}`;
  const candidates = [];

  candidates.push(...extractDatelineCandidates(titleText));
  candidates.push(...extractDatelineCandidates(descriptionText));

  for (const pattern of LOCATION_PATTERNS) {
    candidates.push(...matchAll(text, pattern));
  }

  const phraseMatches = text.match(/\b[\p{Lu}][\p{L}'’. -]+(?:\s+[\p{Lu}][\p{L}'’. -]+){0,2}\b/gu) || [];
  candidates.push(...phraseMatches);

  return Array.from(new Set(
    candidates
      .map((value) => cleanupText(value).replace(/[,:;.!?]+$/g, ''))
      .filter((value) => value.length >= 3 && !GENERIC_LOCATION_TERMS.has(value))
  )).slice(0, MAX_CANDIDATES);
}

function extractDatelineCandidates(text) {
  const value = cleanupText(text);
  if (!value) {
    return [];
  }

  const candidates = [];
  for (const pattern of DATELINE_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) {
      candidates.push(match[1]);
    }
  }

  return candidates;
}

async function resolveLocationCandidate(candidate, geocodeState = { attempts: 0 }) {
  const direct = await resolveCountryCandidate(candidate);
  if (direct) {
    return direct;
  }

  const parts = candidate
    .split(',')
    .map((part) => cleanupText(part))
    .filter(Boolean);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const resolvedPart = await resolveCountryCandidate(parts[index]);
    if (resolvedPart) {
      return resolvedPart;
    }
  }

  if (!isGeocodeCandidate(candidate)) {
    return null;
  }

  if ((geocodeState.attempts || 0) >= MAX_GEOCODE_ATTEMPTS_PER_ITEM) {
    return null;
  }

  geocodeState.attempts = (geocodeState.attempts || 0) + 1;
  return geocodePlace(candidate);
}

async function resolveCountryCandidate(value) {
  try {
    return await resolveCountryCentroid(value);
  } catch {
    return null;
  }
}

function isGeocodeCandidate(candidate) {
  const value = cleanupText(candidate);
  if (!value || value.length < 3 || value.length > 60) {
    return false;
  }

  if (GENERIC_LOCATION_TERMS.has(value)) {
    return false;
  }

  const words = value.split(/\s+/);
  if (words.length > 4) {
    return false;
  }

  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value);
}

async function geocodePlace(candidate) {
  const cacheKey = cleanupText(candidate).toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const response = await axios.get(NOMINATIM_URL, {
      timeout: NOMINATIM_TIMEOUT_MS,
      headers: {
        'User-Agent': 'SituationRoom/1.0 (admin@schnueddels.de)'
      },
      params: {
        q: candidate,
        format: 'jsonv2',
        limit: 1,
        addressdetails: 1
      }
    });

    const match = Array.isArray(response.data) ? response.data[0] : null;
    const lat = Number(match?.lat);
    const lon = Number(match?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const result = {
      lat,
      lon,
      country: match?.address?.country || null,
      alpha2: match?.address?.country_code ? String(match.address.country_code).toUpperCase() : null,
      alpha3: null
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch {
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeLanguageCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace('_', '-');
}

module.exports = {
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
};
