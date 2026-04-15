'use strict';

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const path       = require('path');

// Security packages (install: npm i helmet express-rate-limit)
let helmet, rateLimit;
try {
  helmet    = require('helmet');
  rateLimit = require('express-rate-limit');
} catch (_) {
  // Graceful fallback if packages not yet installed
  helmet    = () => (_, __, next) => next();
  rateLimit = () => (_, __, next) => next();
}

const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/product.routes');
const customerRoutes = require('./routes/customer.routes');
const invoiceRoutes  = require('./routes/invoice.routes');

const errorMiddleware  = require('./middleware/error.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads images
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Strict limit for login to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limit — prevents scraping / accidental hammering
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 200,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));           // cap request body size
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(loggerMiddleware);

// Only log HTTP in development (morgan adds noise in production)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Static Uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);   // strict limit on auth
app.use('/api/products',  apiLimiter,  productRoutes);
app.use('/api/customers', apiLimiter,  customerRoutes);
app.use('/api/invoices',  apiLimiter,  invoiceRoutes);

// ─── Health Check (no auth, no rate limit — used by load balancers) ───────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: '🌾 Krushi Seva Kendra API is running',
    env: process.env.NODE_ENV,
    ts: new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
