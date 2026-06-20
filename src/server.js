require('dotenv').config();
if (process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.NODE_ENV.trim();
}
const app = require('./app');
const logger = require('./utils/logger');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

/**
 * Start server after database connection is verified
 */
async function startServer() {
  try {
    // Verify database connection
    await sequelize.authenticate();
    logger.info('✅ MySQL database connected successfully');

    // Sync models (alter: true adds missing columns without data loss)
    const forceSync = process.env.DB_SYNC_FORCE === 'true';
    const alterSync = process.env.DB_SYNC_ALTER === 'true';
    await sequelize.sync({ force: forceSync, alter: alterSync });
    logger.info(`✅ Database models synced (force: ${forceSync}, alter: ${alterSync})`);

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 HRMS Backend running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   API Prefix: ${process.env.API_PREFIX || '/api/v1'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received — shutting down gracefully...`);
      server.close(() => logger.info('HTTP server closed'));
      await sequelize.close();
      logger.info('Database connection closed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();


