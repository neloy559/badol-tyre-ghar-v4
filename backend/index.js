'use strict';

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\nBTG v4 API running in [${process.env.NODE_ENV || 'development'}] mode`);
    console.log(`Listening on http://localhost:${PORT}/api/v1/health\n`);
  });
}

module.exports = app;
