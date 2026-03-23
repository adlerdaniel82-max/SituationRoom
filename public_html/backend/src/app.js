const express = require('express');
const cors = require('cors');
const eventsRoutes = require('./routes/events.routes');
const sourcesRoutes = require('./routes/sources.routes');
const healthRoutes = require('./routes/health.routes');
const statsRoutes = require('./routes/stats.routes');
const configRoutes = require('./routes/config.routes');
const logger = require('./utils/logger');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/events', eventsRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/config', configRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
