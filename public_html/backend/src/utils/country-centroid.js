const axios = require('axios');

const COUNTRY_API_BY_NAME = 'https://restcountries.com/v3.1/name';
const COUNTRY_API_BY_ALPHA = 'https://restcountries.com/v3.1/alpha';
const REQUEST_TIMEOUT_MS = 15000;

const ALIASES = {
  usa: 'United States',
  us: 'United States',
  uk: 'United Kingdom',
  uae: 'United Arab Emirates',
  russia: 'Russian Federation',
  'south korea': 'Korea (Republic of)',
  'north korea': "Korea (Democratic People's Republic of)",
  syria: 'Syrian Arab Republic',
  iran: 'Iran (Islamic Republic of)',
  laos: "Lao People's Democratic Republic",
  bolivia: 'Bolivia (Plurinational State of)',
  moldova: 'Moldova (Republic of)',
  tanzania: 'Tanzania, United Republic of',
  venezuela: 'Venezuela (Bolivarian Republic of)',
  vietnam: 'Viet Nam',
  palestine: 'Palestine, State of',
  'ivory coast': "Côte d'Ivoire",
  'dr congo': 'Congo (Democratic Republic of the)',
  'congo drc': 'Congo (Democratic Republic of the)',
  'republic of the congo': 'Congo',
  'czech republic': 'Czechia'
};

const cache = new Map();

async function resolveCountryCentroid(country) {
  const normalized = normalizeCountryName(country);
  if (!normalized) {
    return null;
  }

  if (cache.has(normalized)) {
    return cache.get(normalized);
  }

  const lookupValue = ALIASES[normalized] || country;
  const result = await resolveFromApi(lookupValue);
  cache.set(normalized, result);
  return result;
}

async function resolveFromApi(country) {
  const trimmed = String(country || '').trim();
  if (!trimmed) {
    return null;
  }

  const response = await requestCountryLookup(trimmed);
  const countries = Array.isArray(response.data) ? response.data : [];
  if (countries.length === 0) {
    return null;
  }

  const match = pickBestCountryMatch(trimmed, countries);
  const coordinates = extractCoordinates(match);
  if (!coordinates) {
    return null;
  }

  return {
    lat: coordinates.lat,
    lon: coordinates.lon,
    country: match.name?.common || trimmed,
    alpha2: match.cca2 || null,
    alpha3: match.cca3 || null
  };
}

async function requestCountryLookup(country) {
  const isAlphaCode = /^[A-Za-z]{2,3}$/.test(country);
  const url = isAlphaCode
    ? `${COUNTRY_API_BY_ALPHA}/${encodeURIComponent(country)}`
    : `${COUNTRY_API_BY_NAME}/${encodeURIComponent(country)}`;

  return axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      fields: 'name,cca2,cca3,latlng,capitalInfo'
    }
  });
}

function pickBestCountryMatch(input, countries) {
  const normalizedInput = normalizeCountryName(input);

  return countries.find((country) => {
    const candidates = [
      country.name?.common,
      country.name?.official,
      country.cca2,
      country.cca3
    ]
      .filter(Boolean)
      .map((value) => normalizeCountryName(value));

    return candidates.includes(normalizedInput);
  }) || countries[0];
}

function extractCoordinates(country) {
  const capitalLatLng = country.capitalInfo?.latlng;
  if (Array.isArray(capitalLatLng) && capitalLatLng.length >= 2) {
    return {
      lat: Number(capitalLatLng[0]),
      lon: Number(capitalLatLng[1])
    };
  }

  if (Array.isArray(country.latlng) && country.latlng.length >= 2) {
    return {
      lat: Number(country.latlng[0]),
      lon: Number(country.latlng[1])
    };
  }

  return null;
}

function normalizeCountryName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[().,]/g, '')
    .replace(/\s+/g, ' ');
}

module.exports = { resolveCountryCentroid };
