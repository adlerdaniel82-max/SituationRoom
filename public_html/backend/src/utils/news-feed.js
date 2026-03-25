const axios = require('axios');
const { resolveCountryCentroid } = require('./country-centroid');

const EVENT_TYPE_KEYWORDS = {
  earthquake: ['earthquake', 'quake', 'seismic'],
  tsunami: ['tsunami', 'tidal wave'],
  volcano: ['volcano', 'volcanic', 'eruption'],
  flood: ['flood', 'flooding', 'inundation'],
  fire: ['wildfire', 'wild fire', 'bushfire', 'forest fire'],
  hurricane: ['hurricane', 'cyclone', 'typhoon'],
  conflict: ['war', 'conflict', 'military', 'strike', 'attack'],
  humanitarian: ['humanitarian', 'refugee', 'evacuation', 'crisis']
};

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
const NOMINATIM_TIMEOUT_MS = 8000;
const MAX_CANDIDATES = 12;
const geocodeCache = new Map();

function matchAll(input, regex) {
  return [...String(input || '').matchAll(regex)].map((match) => match[1]);
}

function getTag(input, tagName) {
  const escaped = escapeRegExp(tagName);
  const match = String(input || '').match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? match[1].trim() : '';
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

function detectEventType(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return type;
    }
  }

  return 'other';
}

async function resolveNewsLocation(title, description) {
  const candidates = extractLocationCandidates(title, description);

  for (const candidate of candidates) {
    try {
      const resolved = await resolveLocationCandidate(candidate);
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

async function resolveLocationCandidate(candidate) {
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

module.exports = {
  cleanupText,
  decodeEntities,
  detectEventType,
  getTag,
  matchAll,
  parseRfcDate,
  resolveNewsLocation
};
