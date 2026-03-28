const test = require('node:test');
const assert = require('node:assert/strict');

const { parseGdacsFeed } = require('../../src/importers/gdacs.importer');

test('parseGdacsFeed maps event types and keeps severity fields', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <title><![CDATA[GDACS - Earthquake]]></title>
          <description><![CDATA[Severe earthquake event]]></description>
          <link>https://example.com/gdacs-eq</link>
          <pubDate>Fri, 27 Mar 2026 10:00:00 GMT</pubDate>
          <geo:lat>35.1</geo:lat>
          <geo:long>138.7</geo:long>
          <gdacs:eventtype>EQ</gdacs:eventtype>
          <gdacs:eventid>123</gdacs:eventid>
          <gdacs:episodeid>1</gdacs:episodeid>
          <gdacs:eventname><![CDATA[Japan]]></gdacs:eventname>
          <gdacs:alertlevel>Red</gdacs:alertlevel>
          <gdacs:severity value="6.7" unit="Mw"><![CDATA[Magnitude 6.7 earthquake, Depth: 15 km]]></gdacs:severity>
          <gdacs:population value="120000" unit="people"><![CDATA[120000 people]]></gdacs:population>
          <gdacs:fromdate>Fri, 27 Mar 2026 09:00:00 GMT</gdacs:fromdate>
        </item>
        <item>
          <title><![CDATA[GDACS - Wildfire]]></title>
          <description><![CDATA[Large wildfire]]></description>
          <link>https://example.com/gdacs-fire</link>
          <pubDate>Fri, 27 Mar 2026 11:00:00 GMT</pubDate>
          <geo:lat>-12.1</geo:lat>
          <geo:long>130.9</geo:long>
          <gdacs:eventtype>WF</gdacs:eventtype>
          <gdacs:eventid>456</gdacs:eventid>
          <gdacs:episodeid>2</gdacs:episodeid>
          <gdacs:eventname><![CDATA[Australia]]></gdacs:eventname>
          <gdacs:alertlevel>Orange</gdacs:alertlevel>
          <gdacs:severity value="0" unit="index"><![CDATA[Wildfire signal]]></gdacs:severity>
          <gdacs:population value="5000" unit="people"><![CDATA[5000 people]]></gdacs:population>
          <gdacs:fromdate>Fri, 27 Mar 2026 10:30:00 GMT</gdacs:fromdate>
        </item>
      </channel>
    </rss>`;

  const events = parseGdacsFeed(xml);

  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'earthquake');
  assert.equal(events[0].depth, 15);
  assert.equal(events[0].magnitude, 6.7);
  assert.equal(events[0].data.alertLevel, 'Red');
  assert.equal(events[1].type, 'fire');
  assert.equal(events[1].data.country, '');
});
