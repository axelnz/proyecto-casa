const express = require('express');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { createSystemService, SystemError } = require('../services/systemService');

// A bounded, read-only probe separate from the application's initialization query.
// A paused database must never prevent these HTTP endpoints from responding.
const probePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 4000,
  query_timeout: 4000,
  statement_timeout: 4000,
  idleTimeoutMillis: 10000,
  allowExitOnIdle: true
});
probePool.on('error', () => {}); // An idle connection can disappear when Supabase pauses.

const service = createSystemService({
  checkDatabase: async () => {
    if (!process.env.DATABASE_URL) return false;
    try {
      await probePool.query('SELECT 1 FROM users LIMIT 1');
      return true;
    } catch {
      return false;
    }
  }
});

function createSystemRouter(system = service) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  const statusLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Demasiadas comprobaciones. Esperá un minuto.' }
  });
  const wakeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Demasiados intentos de activación. Esperá 15 minutos.' }
  });
  const handle = operation => async (req, res) => {
    try {
      const status = await operation(req);
      res.status(status.state === 'restoring' ? 202 : 200).json(status);
    } catch (error) {
      res.status(error instanceof SystemError ? error.status : 503).json({
        error: error instanceof SystemError ? error.message : 'No pudimos comprobar el sistema. Intentá nuevamente.'
      });
    }
  };
  router.get('/status', statusLimiter, handle(() => system.getStatus()));
  router.post('/wake', wakeLimiter, express.json({ limit: '1kb' }), handle(req => system.restore(req.body?.activationCode)));
  router.use((error, req, res, next) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Solicitud de activación inválida.' });
  });
  return router;
}

module.exports = createSystemRouter;
