const test = require('node:test');
const assert = require('node:assert/strict');

const { parseRssFeed } = require('../../src/importers/rss-news.importer');
const { RSS_NEWS_SOURCES } = require('../../src/config/rss-news-sources');

test('parseRssFeed filters by age, keyword relevance and location', async () => {
  const recentDate = new Date().toUTCString();
  const oldDate = new Date(Date.now() - (48 * 60 * 60 * 1000)).toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>BBC World</title>
        <language>en-gb</language>
        <item>
          <title>Chile earthquake prompts evacuations</title>
          <description>Emergency teams respond after a strong quake.</description>
          <link>https://example.com/chile-earthquake?utm_source=rss</link>
          <guid>item-1</guid>
          <pubDate>${recentDate}</pubDate>
          <category>World</category>
        </item>
        <item>
          <title>Sports update from London</title>
          <description>A football report with league standings and player quotes.</description>
          <link>https://example.com/sport</link>
          <guid>item-2</guid>
          <pubDate>${recentDate}</pubDate>
          <category>Sport</category>
        </item>
        <item>
          <title>Sudan conflict deepens</title>
          <description>Fresh fighting continues overnight.</description>
          <link>https://example.com/sudan-conflict</link>
          <guid>item-3</guid>
          <pubDate>${recentDate}</pubDate>
          <category>World</category>
        </item>
        <item>
          <title>Japan tsunami alert archived</title>
          <description>Older item outside the active time window.</description>
          <link>https://example.com/old-item</link>
          <guid>item-4</guid>
          <pubDate>${oldDate}</pubDate>
          <category>World</category>
        </item>
      </channel>
    </rss>`;

  const result = await parseRssFeed(xml, 'world', RSS_NEWS_SOURCES.bbc, {
    resolveLocation: async (title) => {
      if (title.includes('Chile')) {
        return { lat: -30, lon: -71, country: 'Chile', name: 'Chile' };
      }
      return null;
    }
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.skippedOld, 1);
  assert.equal(result.skippedNoKeyword, 1);
  assert.equal(result.skippedNoLocation, 1);
  assert.equal(result.items[0].data.content_language, 'en-gb');
  assert.equal(result.items[0].data.source_domain, 'example.com');
  assert.equal(result.items[0].url, 'https://example.com/chile-earthquake');
});
