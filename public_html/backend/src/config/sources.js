const { query } = require('./db');

const DEFAULT_SOURCES = [
  { id: 'usgs', name: 'USGS Earthquakes', type: 'earthquake', enabled: true, interval: 300 },
  { id: 'gdacs', name: 'GDACS Disasters', type: 'disaster', enabled: true, interval: 600 },
  { id: 'firms', name: 'FIRMS Fires', type: 'fire', enabled: true, interval: 600 },
  { id: 'acled', name: 'ACLED Conflicts', type: 'conflict', enabled: true, interval: 3600 },
  { id: 'reliefweb', name: 'ReliefWeb', type: 'humanitarian', enabled: true, interval: 1800 },
  { id: 'opensky', name: 'OpenSky Network', type: 'aviation', enabled: false, interval: 60 }
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

function getSourceById(id) {
  return sources.find(s => s.id === id);
}

function getEnabledSources() {
  return sources.filter(s => s.enabled);
}

module.exports = { loadSources, getSources, getSourceById, getEnabledSources, DEFAULT_SOURCES };
