const path = require('path');
const dotenv = require('dotenv');

const envCandidates = [
  path.resolve(__dirname, '../../../../private/.env'),
  path.resolve(__dirname, '../../.env')
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT, 10) || 3001,
  wsPort: parseInt(process.env.WS_PORT, 10) || 3001,
  logLevel: process.env.LOG_LEVEL || 'info',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'situation',
    user: process.env.DB_USER || 'situation_user',
    password: process.env.DB_PASSWORD || ''
  },

  apiKeys: {
    usgs: process.env.USGS_API_KEY || '',
    gdacs: process.env.GDACS_API_KEY || '',
    firms: process.env.FIRMS_API_KEY || '',
    acled: process.env.ACLED_API_KEY || '',
    reliefweb: process.env.RELIEFWEB_API_KEY || '',
    opensky: process.env.OPENSKY_API_KEY || ''
  },

  sourceAuth: {
    acled: {
      username: process.env.ACLED_USERNAME || '',
      altUsername: process.env.ACLED_ALT_USERNAME || '',
      password: process.env.ACLED_PASSWORD || '',
      clientId: process.env.ACLED_CLIENT_ID || 'acled'
    },
    opensky: {
      clientId: process.env.OPENSKY_CLIENT_ID || '',
      clientSecret: process.env.OPENSKY_CLIENT_SECRET || ''
    }
  },

  sourceOptions: {
    firms: {
      dataset: process.env.FIRMS_DATASET || 'VIIRS_SNPP_NRT',
      dayRange: parseInt(process.env.FIRMS_DAY_RANGE, 10) || 1
    },
    reliefweb: {
      appname: process.env.RELIEFWEB_APPNAME || 'situation.schnueddels.de'
    }
  },

  scoring: {
    weightDistance: parseFloat(process.env.SCORING_WEIGHT_DISTANCE) || 0.4,
    weightTime: parseFloat(process.env.SCORING_WEIGHT_TIME) || 0.3,
    weightType: parseFloat(process.env.SCORING_WEIGHT_TYPE) || 0.3
  }
};
