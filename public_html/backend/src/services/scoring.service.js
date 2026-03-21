const config = require('../config/env');
const distanceService = require('../utils/distance');

async function calculate(eventData) {
  const { type, magnitude, affectedPopulation, timestamp } = eventData;

  let score = 0;

  // Type-based base score
  const typeScores = {
    earthquake: 0.3,
    tsunami: 0.9,
    volcano: 0.5,
    flood: 0.6,
    fire: 0.5,
    conflict: 0.7,
    humanitarian: 0.4,
    aviation: 0.3
  };
  score += (typeScores[type] || 0.2) * config.scoring.weightType;

  // Magnitude score (normalized)
  if (magnitude) {
    const magnitudeScore = Math.min(magnitude / 10, 1);
    score += magnitudeScore * config.scoring.weightDistance;
  }

  // Population impact score
  if (affectedPopulation) {
    const popScore = Math.min(Math.log10(affectedPopulation + 1) / 7, 1);
    score += popScore * config.scoring.weightTime;
  }

  // Recency bonus
  if (timestamp) {
    const hoursSinceEvent = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - hoursSinceEvent / 72);
    score += recencyScore * 0.1;
  }

  return Math.min(score, 1);
}

function calculateCorrelationScore(event1, event2) {
  const distanceWeight = config.scoring.weightDistance;
  const timeWeight = config.scoring.weightTime;
  const typeWeight = config.scoring.weightType;

  // Distance correlation
  const distance = distanceService.calculate(
    event1.lat, event1.lon,
    event2.lat, event2.lon
  );
  const distanceScore = Math.max(0, 1 - distance / 500);

  // Time correlation
  const timeDiff = Math.abs(new Date(event1.timestamp) - new Date(event2.timestamp)) / (1000 * 60 * 60);
  const timeScore = Math.max(0, 1 - timeDiff / 48);

  // Type correlation
  const typeScore = event1.type === event2.type ? 1 : 0.3;

  return (distanceScore * distanceWeight) + (timeScore * timeWeight) + (typeScore * typeWeight);
}

module.exports = { calculate, calculateCorrelationScore };
