import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import client from 'prom-client';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import usersRouter from './routes/users.js';
import milestonesRouter from './routes/milestones.js';
import commentsRouter from './routes/comments.js';
import notificationsRouter from './routes/notifications.js';
import notificationPreferencesRouter from './routes/notificationPreferences.js';
import orgsRouter from './routes/organizations.js';
import teamsRouter2 from './routes/teams.js';
import { initDB } from './db/data-source.js';
import attachmentsRouter from './routes/attachments.js';
import searchRouter from './routes/search.js';
import { cacheMiddleware, getCacheStats } from './middlewares/cache.js';
import { flags } from './config/flags.js';

// ===== OBSERVABILITY SETUP =====

// Prometheus metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500, 1000, 5000],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const sloViolationsTotal = new client.Counter({
  name: 'slo_violations_total',
  help: 'Total number of SLO violations',
  labelNames: ['type', 'threshold'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(sloViolationsTotal);

// SLO configuration
const SLO_LATENCY_MS = Number(process.env.SLO_LATENCY_MS || 1000);

// Helper functions
function generateCorrelationId(): string {
  return randomUUID();
}

function structuredLog(level: string, message: string, meta: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  console.log(JSON.stringify(logEntry));
}

// SQLite backup functionality
let backupInterval: NodeJS.Timeout | null = null;

async function createSQLiteBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(process.cwd(), 'db', `planara-backup-${timestamp}.sqlite`);
  const sourcePath = path.join(process.cwd(), 'db', 'planara.sqlite');

  try {
    if (fs.existsSync(sourcePath)) {
      await fs.promises.copyFile(sourcePath, backupPath);
      structuredLog('info', 'SQLite backup created', { backupPath, sourcePath });
      return backupPath;
    } else {
      throw new Error('Source database file not found');
    }
  } catch (error) {
    structuredLog('error', 'SQLite backup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function testSQLiteRestore(backupPath: string): Promise<boolean> {
  try {
    const testPath = path.join(process.cwd(), 'db', 'test-restore.sqlite');
    await fs.promises.copyFile(backupPath, testPath);

    // Basic smoke test - try to read the file
    const stats = await fs.promises.stat(testPath);
    const isValid = stats.size > 0;

    // Cleanup test file
    await fs.promises.unlink(testPath);

    structuredLog('info', 'SQLite restore smoke test completed', { backupPath, isValid });
    return isValid;
  } catch (error) {
    structuredLog('error', 'SQLite restore smoke test failed', {
      backupPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function startBackupScheduler() {
  const intervalMinutes = Number(process.env.DB_BACKUP_INTERVAL_MINUTES || 60);
  const intervalMs = intervalMinutes * 60 * 1000;

  backupInterval = setInterval(async () => {
    try {
      await createSQLiteBackup();
    } catch (error) {
      structuredLog('error', 'Scheduled backup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, intervalMs);

  structuredLog('info', 'SQLite backup scheduler started', { intervalMinutes });
}

// Optional Sentry monitoring (error tracking) using runtime-only import to avoid TS/module resolution
if (process.env.SENTRY_DSN) {
  (async () => {
    try {
      const Sentry = await new Function('return import("@sentry/node")')();
      const Profiling = await new Function('return import("@sentry/profiling-node")')();
      (Sentry as any).init({
        dsn: process.env.SENTRY_DSN,
        integrations: [new (Profiling as any).ProfilingIntegration()],
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      } as any);
      // Basic global handlers
      process.on('uncaughtException', (err) => {
        try {
          (Sentry as any).captureException(err);
        } catch {}
      });
      process.on('unhandledRejection', (reason) => {
        try {
          (Sentry as any).captureException(reason);
        } catch {}
      });
      console.log('[monitoring] Sentry initialized');
    } catch (err) {
      console.warn(
        '[monitoring] Sentry init failed or not installed:',
        err instanceof Error ? err.message : String(err)
      );
    }
  })();
}

// If a managed Postgres URL is present, relax TLS globally to avoid self-signed cert errors
const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (dbUrl) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('[startup] NODE_TLS_REJECT_UNAUTHORIZED=0 set due to DATABASE_URL presence');
  } catch {}
}

const app = express();
// Trust proxy headers so req.protocol reflects HTTPS behind reverse proxies
app.set('trust proxy', 1);

// Configure CORS for production domains via env (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions = allowedOrigins.length ? { origin: allowedOrigins } : undefined;
app.use(cors(corsOptions as any));

// Increase payload limits to support larger JSON bodies (e.g., avatars)
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// ===== OBSERVABILITY MIDDLEWARE =====

// Correlation ID middleware
app.use((req: any, res: any, next: any) => {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// Structured request logging and metrics middleware
app.use((req: any, res: any, next: any) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode.toString();
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;

    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestsTotal.inc({ method, route, status_code: statusCode });

    // Check SLO violations
    if (duration > SLO_LATENCY_MS) {
      sloViolationsTotal.inc({ type: 'latency', threshold: SLO_LATENCY_MS.toString() });
    }

    // Structured logging
    structuredLog('info', 'HTTP request completed', {
      correlationId: req.correlationId,
      method,
      path: req.path,
      route,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      sloViolation: duration > SLO_LATENCY_MS,
    });

    return originalSend.call(this, body);
  };

  next();
});

app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Metrics endpoint for Prometheus scraping
app.get('/metrics', async (_req, res) => {
  try {
    const cacheStats = getCacheStats();

    // Add cache metrics to response headers for monitoring
    res.set('X-Cache-Total', cacheStats.total.toString());
    res.set('X-Cache-Active', cacheStats.active.toString());
    res.set('X-Cache-Expired', cacheStats.expired.toString());

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Admin backup endpoints (require ADMIN_TOKEN)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

app.post('/admin/backup', async (req: any, res: any) => {
  if (!ADMIN_TOKEN || req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const backupPath = await createSQLiteBackup();
    structuredLog('info', 'Manual backup triggered', {
      correlationId: req.correlationId,
      backupPath,
      triggeredBy: 'admin',
    });
    res.json({ success: true, backupPath });
  } catch (error) {
    structuredLog('error', 'Manual backup failed', {
      correlationId: req.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Backup failed' });
  }
});

app.post('/admin/backup/test', async (req: any, res: any) => {
  if (!ADMIN_TOKEN || req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { backupPath } = req.body;
  if (!backupPath) {
    return res.status(400).json({ error: 'backupPath required' });
  }

  try {
    const isValid = await testSQLiteRestore(backupPath);
    structuredLog('info', 'Backup smoke test completed', {
      correlationId: req.correlationId,
      backupPath,
      isValid,
      triggeredBy: 'admin',
    });
    res.json({ success: true, isValid });
  } catch (error) {
    structuredLog('error', 'Backup smoke test failed', {
      correlationId: req.correlationId,
      backupPath,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Smoke test failed' });
  }
});

// Apply caching middleware with different TTLs based on data volatility
app.use('/api/projects', cacheMiddleware({ ttl: 2 * 60 * 1000 }), projectsRouter); // 2 minutes
app.use('/api/tasks', cacheMiddleware({ ttl: 1 * 60 * 1000 }), tasksRouter); // 1 minute
app.use('/api/users', cacheMiddleware({ ttl: 5 * 60 * 1000 }), usersRouter); // 5 minutes
app.use('/api/milestones', cacheMiddleware({ ttl: 3 * 60 * 1000 }), milestonesRouter); // 3 minutes
app.use('/api/comments', cacheMiddleware({ ttl: 30 * 1000 }), commentsRouter); // 30 seconds
app.use('/api/notifications', cacheMiddleware({ skipCache: true }), notificationsRouter); // No cache - real-time
app.use(
  '/api/notifications/preferences',
  cacheMiddleware({ ttl: 10 * 60 * 1000 }),
  notificationPreferencesRouter
); // 10 minutes
app.use('/api/orgs', cacheMiddleware({ ttl: 10 * 60 * 1000 }), orgsRouter); // 10 minutes
app.use('/api/teams', cacheMiddleware({ ttl: 5 * 60 * 1000 }), teamsRouter2); // 5 minutes
app.use('/api/attachments', cacheMiddleware({ ttl: 30 * 60 * 1000 }), attachmentsRouter); // 30 minutes
// Conditionally enable search based on feature flags
if (flags.searchEnabled) {
  app.use('/api/search', cacheMiddleware({ ttl: 2 * 60 * 1000 }), searchRouter);
} else {
  console.log('[flags] Search API disabled');
}

// Enhanced error handler with correlation ID and Sentry integration
app.use((err: any, req: any, res: any, _next: any) => {
  const correlationId = req.correlationId || 'unknown';
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Structured error logging
  structuredLog('error', 'Unhandled application error', {
    correlationId,
    error: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  // Sentry error capture with correlation context
  try {
    if (process.env.SENTRY_DSN) {
      new Function('return import("@sentry/node")')()
        .then((Sentry: any) => {
          try {
            (Sentry as any).withScope((scope: any) => {
              scope.setTag('correlationId', correlationId);
              scope.setContext('request', {
                path: req.path,
                method: req.method,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
              });
              (Sentry as any).captureException(err);
            });
          } catch {}
        })
        .catch(() => {});
    }
  } catch {}

  // Don't expose internal error details in production
  const errorResponse =
    process.env.NODE_ENV === 'production'
      ? { success: false, error: 'Internal Server Error', correlationId }
      : { success: false, error: message, correlationId, stack: err.stack };

  res.status(statusCode).json(errorResponse);
});

// Serve built UI from ui/dist when present (single-domain deployment)
const uiDist = path.join(process.cwd(), 'ui', 'dist');
if (fs.existsSync(path.join(uiDist, 'index.html'))) {
  app.use(express.static(uiDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
    res.sendFile(path.join(uiDist, 'index.html'));
  });
}

import http from 'http';
import { initRealtime } from './controllers/realtime.js';

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

await initDB();

const server = http.createServer(app);
// Conditionally initialize realtime server
if (flags.realtimeEnabled) {
  initRealtime(server);
} else {
  console.log('[flags] Realtime disabled');
}

server.listen(port, host as any, () => {
  const url = `http://${host}:${port}`;
  const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  const hint = publicDomain ? ` (public: https://${publicDomain})` : '';

  // Start backup scheduler only outside of test environment
  if (process.env.NODE_ENV !== 'test') {
    startBackupScheduler();
  }

  // Structured startup logging
  structuredLog('info', 'Server started successfully', {
    url,
    publicDomain,
    port,
    host,
    nodeEnv: process.env.NODE_ENV || 'development',
    sloLatencyMs: SLO_LATENCY_MS,
    backupIntervalMinutes: Number(process.env.DB_BACKUP_INTERVAL_MINUTES || 60),
    adminTokenConfigured: !!ADMIN_TOKEN,
    sentryEnabled: !!process.env.SENTRY_DSN,
  });

  console.log(`API server listening on ${url}${hint}`);
});
