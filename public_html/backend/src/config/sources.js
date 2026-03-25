const { query } = require('./db');

const HIDDEN_SOURCE_IDS = new Set(['acled', 'ap']);

const DEFAULT_SOURCES = [
  { id: 'usgs', name: 'USGS Earthquakes', type: 'earthquake', enabled: true, interval: 300 },
  { id: 'gdacs', name: 'GDACS Disasters', type: 'disaster', enabled: true, interval: 600 },
  { id: 'gdelt', name: 'GDELT Attention', type: 'humanitarian', enabled: true, interval: 10800 },
  { id: 'noaa_tsunami', name: 'NOAA Tsunami', type: 'tsunami', enabled: true, interval: 300 },
  { id: 'firms', name: 'FIRMS Fires', type: 'fire', enabled: true, interval: 600 },
  { id: 'acled', name: 'ACLED Conflicts', type: 'conflict', enabled: false, interval: 3600 },
  { id: 'reliefweb', name: 'ReliefWeb', type: 'humanitarian', enabled: true, interval: 1800 },
  { id: 'opensky', name: 'OpenSky Network', type: 'aviation', enabled: true, interval: 60 },
  { id: 'ap', name: 'AP News', type: 'humanitarian', enabled: false, interval: 1800 },
  { id: 'reuters', name: 'Reuters', type: 'humanitarian', enabled: false, interval: 1800 },
  { id: 'bbc', name: 'BBC News', type: 'humanitarian', enabled: true, interval: 1800 }
];

let sources = [];

async function loadSources() {
  try {
    const rows = await query('SELECT * FROM sources ORDER BY id');
    sources = rows;
  } catch (error) {
    // Fallback to defaults if table doesn't exist
    sources = DEFAULT_SOURCES;
  }
  return sources;
}

function getSources() {
  return sources;
}

function isSourceVisible(id) {
  return !HIDDEN_SOURCE_IDS.has(String(id || '').trim());
}

function getVisibleSources(list = sources) {
  return (Array.isArray(list) ? list : []).filter((source) => isSourceVisible(source.id));
}

function getSourceById(id) {
  return sources.find(s => s.id === id);
}

function getEnabledSources() {
  return sources.filter(s => s.enabled && isSourceVisible(s.id));
}

module.exports = {
  loadSources,
  getSources,
  getVisibleSources,
  getSourceById,
  getEnabledSources,
  isSourceVisible,
  DEFAULT_SOURCES,
  HIDDEN_SOURCE_IDS
};
