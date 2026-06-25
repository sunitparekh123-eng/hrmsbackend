const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const isProduction = (process.env.NODE_ENV || '').trim() === 'production';

/**
 * Sequelize instance — connects to MySQL
 * In production (Render + Railway), SSL is required for the database connection.
 */
const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: env.DB_DIALECT,
  logging: env.DB_LOGGING ? (msg) => logger.debug(msg) : false,
  pool: {
    max: isProduction ? 5 : 10,   // Keep connections low on free/hobby tier
    min: 0,
    acquire: 60000,               // Allow 60s to acquire connection (cloud DBs are slower)
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  dialectOptions: {
    charset: 'utf8mb4',
    // SSL required for cloud MySQL providers. For Hostinger VPS local MySQL, set DB_SSL=false.
    ...(env.DB_SSL && {
      ssl: {
        rejectUnauthorized: false,  // Required for self-signed certs on managed MySQL
      },
    }),
  },
});

/**
 * Test database connection
 * Used by server.js on startup
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
}

// Allow CLI sync: node src/config/database.js --sync
if (process.argv.includes('--sync')) {
  (async () => {
    await testConnection();
    const force = env.DB_SYNC_FORCE;
    await sequelize.sync({ force });
    logger.info(`Database synced (force: ${force})`);
    process.exit(0);
  })();
}

module.exports = { sequelize, testConnection };