const test = require('node:test');
const assert = require('node:assert/strict');

const { mapFeatureToEvent } = require('../../src/importers/usgs.importer');

test('mapFeatureToEvent converts a USGS feature into an event payload', () => {
  const feature = {
    properties: {
      title: 'M 6.1 - Near the coast of Chile',
      mag: 6.1,
      time: Date.UTC(2026, 2, 27, 12, 0, 0),
      url: 'https://earthquake.usgs.gov/example'
    },
    geometry: {
      coordinates: [-71.2, -30.5, 18.4]
    }
  };

  const event = mapFeatureToEvent(feature);

  assert.equal(event.type, 'earthquake');
  assert.equal(event.source, 'usgs');
  assert.equal(event.lon, -71.2);
  assert.equal(event.lat, -30.5);
  assert.equal(event.depth, 18.4);
  assert.equal(event.magnitude, 6.1);
  assert.equal(event.url, 'https://earthquake.usgs.gov/example');
  assert.equal(event.data.content_language, 'en');
});
