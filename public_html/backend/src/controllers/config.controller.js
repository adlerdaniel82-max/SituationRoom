const env = require('../config/env');

function getPublicConfig(req, res) {
  const hasMapTiler = Boolean(env.map?.maptiler?.apiKey);

  res.json({
    map: {
      provider: hasMapTiler ? 'maptiler' : 'osm',
      maptiler: hasMapTiler ? {
        mapId: env.map.maptiler.mapId,
        styleUrl: `https://api.maptiler.com/maps/${encodeURIComponent(env.map.maptiler.mapId)}/style.json?key=${encodeURIComponent(env.map.maptiler.apiKey)}`,
        labelLanguage: env.map.maptiler.labelLanguage,
        fallbackLanguage: env.map.maptiler.fallbackLanguage
      } : null
    }
  });
}

module.exports = { getPublicConfig };
