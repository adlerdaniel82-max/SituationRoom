const RSS_NEWS_SOURCES = {
  bbc: {
    sourceId: 'bbc',
    displayName: 'BBC News',
    visibilityTier: 'primary',
    maxAgeHours: 12,
    maxItems: 24,
    contentLanguage: 'en-gb',
    ownershipType: 'public_broadcaster',
    editorialTier: 'major_outlet',
    isStateAffiliated: false,
    trustBaseScore: 0.92,
    feedAccessType: 'rss_open',
    feeds: {
      world: 'https://feeds.bbci.co.uk/news/world/rss.xml'
    }
  },
  guardian: {
    sourceId: 'guardian',
    displayName: 'The Guardian',
    visibilityTier: 'primary',
    maxAgeHours: 12,
    maxItems: 12,
    contentLanguage: 'en',
    ownershipType: 'private_non_state',
    editorialTier: 'major_outlet',
    isStateAffiliated: false,
    trustBaseScore: 0.9,
    feedAccessType: 'rss_open',
    feeds: {
      world: 'https://www.theguardian.com/world/rss'
    }
  },
  aljazeera: {
    sourceId: 'aljazeera',
    displayName: 'Al Jazeera',
    visibilityTier: 'primary',
    maxAgeHours: 12,
    maxItems: 24,
    contentLanguage: 'en',
    ownershipType: 'state_affiliated_media',
    editorialTier: 'major_outlet',
    isStateAffiliated: true,
    trustBaseScore: 0.88,
    feedAccessType: 'rss_open',
    feeds: {
      all: 'https://www.aljazeera.com/xml/rss/all.xml'
    }
  },
  dw: {
    sourceId: 'dw',
    displayName: 'DW',
    visibilityTier: 'secondary',
    maxAgeHours: 12,
    maxItems: 24,
    contentLanguage: 'en',
    ownershipType: 'public_broadcaster',
    editorialTier: 'major_outlet',
    isStateAffiliated: true,
    trustBaseScore: 0.87,
    feedAccessType: 'rss_open',
    feeds: {
      all: 'https://rss.dw.com/xml/rss-en-all'
    }
  },
  france24: {
    sourceId: 'france24',
    displayName: 'France24',
    visibilityTier: 'secondary',
    maxAgeHours: 12,
    maxItems: 24,
    contentLanguage: 'en',
    ownershipType: 'public_broadcaster',
    editorialTier: 'major_outlet',
    isStateAffiliated: true,
    trustBaseScore: 0.86,
    feedAccessType: 'rss_open',
    feeds: {
      all: 'https://www.france24.com/en/rss'
    }
  },
  npr: {
    sourceId: 'npr',
    displayName: 'NPR',
    visibilityTier: 'secondary',
    maxAgeHours: 12,
    maxItems: 24,
    contentLanguage: 'en',
    ownershipType: 'public_media',
    editorialTier: 'major_outlet',
    isStateAffiliated: false,
    trustBaseScore: 0.89,
    feedAccessType: 'rss_open',
    feeds: {
      world: 'https://feeds.npr.org/1004/rss.xml'
    }
  },
  skynews: {
    sourceId: 'skynews',
    displayName: 'Sky News',
    visibilityTier: 'secondary',
    maxAgeHours: 12,
    maxItems: 24,
    contentLanguage: 'en',
    ownershipType: 'private_non_state',
    editorialTier: 'major_outlet',
    isStateAffiliated: false,
    trustBaseScore: 0.85,
    feedAccessType: 'rss_open',
    feeds: {
      world: 'https://feeds.skynews.com/feeds/rss/world.xml'
    }
  }
};

module.exports = { RSS_NEWS_SOURCES };
