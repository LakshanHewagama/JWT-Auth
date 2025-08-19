const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Trust proxy (if behind reverse proxy)
app.set('trust proxy', 1);

// CORS (simple allowlist)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server / curl
    return allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, try again later.' }
});

// Core middleware (before routes)
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Dev request logging
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    const hasAccess = Boolean(req.cookies?.accessToken);
    const hasRefresh = Boolean(req.cookies?.refreshToken);
    console.log(`${req.method} ${req.originalUrl} - access:${hasAccess} refresh:${hasRefresh}`);
    next();
  });
}

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// API info
app.get('/api/v1', (_req, res) => {
  res.json({
    status: 'success',
    message: 'JWT Auth API v1',
    version: '1.0.0',
    endpoints: { auth: '/api/v1/auth', admin: '/api/v1/admin', health: '/health' }
  });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'fail', message: `Route ${req.originalUrl} not found` });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((val) => ({ field: val.path, message: val.message }));
    return res.status(400).json({ status: 'fail', message: 'Validation error', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ status: 'fail', message: `${field} already exists` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'fail', message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'fail', message: 'Token expired' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ status: 'fail', message: 'CORS policy violation' });
  }

  return res.status(err.statusCode || 500).json({ status: err.status || 'error', message: err.message || 'Internal server error' });
});

module.exports = app;
