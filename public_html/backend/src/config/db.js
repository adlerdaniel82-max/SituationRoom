const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'situation_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'situation',
    decimalNumbers: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error;
  }

  return pool;
}

async function query(sql, params) {
  if (!pool) await initDb();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { initDb, query, getPool: () => pool };
