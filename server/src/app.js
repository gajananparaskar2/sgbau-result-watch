const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const logger = require('./utils/logger');
const migrate = require('./database/migrate');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resultRoutes = require('./routes/resultRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');

migrate().catch((err) => {
  logger.error(`Initial migration error: ${err.message}`);
});

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === env.CLIENT_URL ||
        origin === 'http://localhost:5173' ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mockMode: env.MOCK_RESULT_MODE, env: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.PORT, () => {
    logger.info(`SGBAU Result Watch API listening on port ${env.PORT} (${env.NODE_ENV})`);
    if (env.MOCK_RESULT_MODE) {
      logger.warn('MOCK_RESULT_MODE is ON. Never enable this in production.');
    }
  });
}

module.exports = app;
