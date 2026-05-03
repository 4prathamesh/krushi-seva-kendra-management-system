'use strict';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Security packages (install: npm i helmet express-rate-limit)
let helmet, rateLimit;
try {
  const helmetModule = await import('helmet');
  const rateLimitModule = await import('express-rate-limit');
  helmet = helmetModule.default;
  rateLimit = rateLimitModule.default;
} catch (_) {
  // Graceful fallback if packages not yet installed
  helmet = () => (_, __, next) => next();
  rateLimit = () => (_, __, next) => next();
}

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import customerRoutes from './routes/customer.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import errorMiddleware from './middleware/error.middleware.js';
import loggerMiddleware from './middleware/logger.middleware.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use('/api/purchases', apiLimiter,  purchaseRoutes);
app.use('/api/suppliers', apiLimiter,  supplierRoutes);

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

export default app;
