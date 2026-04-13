import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Helmet — secure HTTP headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://maps.gstatic.com", "https://*.googleapis.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS — allow frontend origin
const allowedOriginsStr = process.env.ALLOWED_ORIGINS;
let allowedOrigins = '*';

if (allowedOriginsStr) {
  allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());
} else if (process.env.NODE_ENV === 'production') {
  console.error('CRITICAL ERROR: ALLOWED_ORIGINS environment variable is NOT SET in production.');
  process.exit(1);
} else {
  console.warn('WARNING: CORS origin is set to "*". Consider limiting this in production via ALLOWED_ORIGINS.');
}

export const corsMiddleware = cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// General rate limiter — 200 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
  message: { error: 'Terlalu banyak request. Coba lagi nanti.' },
});

// Auth rate limiter — 10 login attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});
