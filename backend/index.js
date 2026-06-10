'use strict';

const app       = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
  } catch (err) {
    console.warn('MongoDB connection failed:', err.message);
    console.warn('Starting server without database connection...');
  }

  app.listen(PORT, () => {
    console.log(`\nBTG v4 API running in [${process.env.NODE_ENV || 'development'}] mode`);
    console.log(`Listening on http://localhost:${PORT}/api/v1/health\n`);
  });
}

startServer();

module.exports = app;
