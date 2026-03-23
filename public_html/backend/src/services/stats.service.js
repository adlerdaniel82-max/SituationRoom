const axios = require('axios');
const eventRepository = require('../repositories/event.repository');
const { query } = require('../config/db');

const STOOQ_QUOTE_URL = 'https://stooq.com/q/l/';
const MARKET_CACHE_TTL_MS = 5 * 60 * 1000;
const MARKET_INSTRUMENTS = [
  { id: 'gold', label: 'Gold', symbol: 'xauusd', kind: 'asset', unit: 'USD/oz' },
  { id: 'btc', label: 'BTC', symbol: 'btcusd', kind: 'asset', unit: 'USD' },
  { id: 'dollar', label: 'Dollar Index', symbol: 'dx.f', kind: 'fx', unit: 'DXY' },
  { id: 'euro', label: 'Euro', symbol: 'eurusd', kind: 'fx', unit: 'EUR/USD' },
  { id: 'sp500', label: 'S&P 500', symbol: '^spx', kind: 'index' },
  { id: 'nasdaq100', label: 'Nasdaq 100', symbol: '^ndq', kind: 'index' },
  { id: 'dowjones', label: 'Dow Jones', symbol: '^dji', kind: 'index' },
  { id: 'dax', label: 'DAX', symbol: '^dax', kind: 'index' },
  { id: 'nikkei225', label: 'Nikkei 225', symbol: '^nkx', kind: 'index' }
];

const marketCache = {
  expiresAt: 0,
  payload: null
};

async function getOverview() {
  return eventRepository.getStats();
}

async function getSummary() {
  return getOverview();
}

async function getByType() {
  const sql = `
    SELECT 
      type,
      COUNT(*) as count,
      AVG(score) as avg_score,
      MAX(score) as max_score,
      COUNT(CASE WHEN score >= 0.8 THEN 1 END) as critical,
      COUNT(CASE WHEN score >= 0.6 AND score < 0.8 THEN 1 END) as high
    FROM events
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY type
    ORDER BY count DESC
  `;
  return query(sql);
}

async function getBySource() {
  const sql = `
    SELECT 
      e.source,
      s.name as source_name,
      COUNT(*) as count,
      AVG(e.score) as avg_score,
      MAX(e.timestamp) as last_event
    FROM events e
    LEFT JOIN sources s ON e.source = s.id
    WHERE e.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY e.source, s.name
    ORDER BY count DESC
  `;
  return query(sql);
}

async function getTimeline(interval = 'hour') {
  let format;
  let whereClause = 'timestamp >= DATE_SUB(NOW(), INTERVAL 48 HOUR)';
  
  switch (interval) {
    case 'day':
      format = '%Y-%m-%d';
      whereClause = 'timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      break;
    case 'week':
      format = '%Y-%u';
      whereClause = 'timestamp >= DATE_SUB(NOW(), INTERVAL 12 WEEK)';
      break;
    default:
      format = '%Y-%m-%d %H:00';
  }

  const sql = `
    SELECT 
      DATE_FORMAT(timestamp, '${format}') as period,
      COUNT(*) as event_count,
      AVG(score) as avg_score,
      MAX(score) as max_score,
      COUNT(DISTINCT type) as type_count
    FROM events
    WHERE ${whereClause}
    GROUP BY DATE_FORMAT(timestamp, '${format}')
    ORDER BY period DESC
  `;
  return query(sql);
}

async function getHotRegions({ hours = 24, limit = 12 } = {}) {
  const safeHours = Math.max(1, Math.min(Number(hours) || 24, 168));
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 50));

  const sql = `
    SELECT
      ROUND(lat / 5) * 5 AS lat_bucket,
      ROUND(lon / 5) * 5 AS lon_bucket,
      COUNT(*) AS event_count,
      AVG(score) AS avg_score,
      MAX(score) AS max_score,
      COUNT(DISTINCT type) AS type_count,
      COUNT(DISTINCT source) AS source_count,
      MAX(timestamp) AS latest_event
    FROM events
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
    GROUP BY ROUND(lat / 5), ROUND(lon / 5)
    HAVING event_count > 0
    ORDER BY max_score DESC, event_count DESC, latest_event DESC
    LIMIT ?
  `;

  const rows = await query(sql, [safeHours, safeLimit]);
  return rows.map((row) => ({
    ...row,
    lat: Number(row.lat_bucket),
    lon: Number(row.lon_bucket),
    label: `${Number(row.lat_bucket).toFixed(0)}, ${Number(row.lon_bucket).toFixed(0)}`,
    event_count: Number(row.event_count),
    avg_score: Number(row.avg_score || 0),
    max_score: Number(row.max_score || 0),
    type_count: Number(row.type_count),
    source_count: Number(row.source_count)
  }));
}

async function getMarkets() {
  if (marketCache.payload && marketCache.expiresAt > Date.now()) {
    return marketCache.payload;
  }

  const results = await Promise.allSettled(
    MARKET_INSTRUMENTS.map((instrument) => fetchMarketInstrument(instrument))
  );

  const instruments = results
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => result.value);

  if (instruments.length === 0) {
    throw new Error('No market data available');
  }

  const payload = {
    updated_at: new Date().toISOString(),
    instruments
  };

  marketCache.payload = payload;
  marketCache.expiresAt = Date.now() + MARKET_CACHE_TTL_MS;
  return payload;
}

async function fetchMarketInstrument(instrument) {
  const response = await axios.get(STOOQ_QUOTE_URL, {
    params: {
      s: instrument.symbol,
      i: 'd'
    },
    timeout: 15000,
    responseType: 'text',
    transformResponse: [(body) => body]
  });

  const row = parseStooqRow(response.data);
  if (!row) {
    return null;
  }

  const open = safeNumber(row.open);
  const close = safeNumber(row.close);
  const high = safeNumber(row.high);
  const low = safeNumber(row.low);
  const change = Number.isFinite(open) && Number.isFinite(close) ? close - open : null;
  const changePercent =
    Number.isFinite(open) && open !== 0 && Number.isFinite(close)
      ? ((close - open) / open) * 100
      : null;

  return {
    id: instrument.id,
    label: instrument.label,
    symbol: row.symbol || instrument.symbol.toUpperCase(),
    kind: instrument.kind,
    unit: instrument.unit || null,
    as_of: parseQuoteTimestamp(row.date, row.time),
    open,
    high,
    low,
    close,
    change,
    change_percent: changePercent
  };
}

function parseStooqRow(body) {
  const line = String(body || '')
    .trim()
    .split('\n')
    .find(Boolean);

  if (!line) {
    return null;
  }

  const [symbol, date, time, open, high, low, close] = line.split(',');
  if (!symbol || close === 'N/D') {
    return null;
  }

  return { symbol, date, time, open, high, low, close };
}

function parseQuoteTimestamp(date, time) {
  if (!date || !time || date === 'N/D' || time === 'N/D') {
    return null;
  }

  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`;
  return new Date(iso).toISOString();
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = { getOverview, getSummary, getByType, getBySource, getTimeline, getHotRegions, getMarkets };
