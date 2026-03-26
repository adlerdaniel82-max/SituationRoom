const { RSS_NEWS_SOURCES } = require('../config/rss-news-sources');
const { createRssNewsImporter } = require('./rss-news.importer');

module.exports = createRssNewsImporter(RSS_NEWS_SOURCES.france24);
