import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// ===== Helmet — Comprehensive Secure HTTP Headers =====
export const securityHeaders = helmet({
  // Content-Security-Policy: Prevent XSS and injection attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'none'"],
      objectSrc: ["'none'"],
      childSrc: ["'none'"],
      frameAncestors: ["'none'"],      // Replaces X-Frame-Options
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },

  // Strict-Transport-Security: Force HTTPS for 2 years
  strictTransportSecurity: {
    maxAge: 63072000,          // 2 years in seconds
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options: Prevent clickjacking
  frameguard: { action: 'deny' },

  // X-Content-Type-Options: Prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection: Disable legacy XSS filter (CSP replaces this)
  xXssProtection: false,

  // Referrer-Policy: Limit referrer information leakage
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // X-Permitted-Cross-Domain-Policies: Block Flash/PDF cross-domain
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // X-DNS-Prefetch-Control: Prevent DNS prefetching
  dnsPrefetchControl: { allow: false },

  // Hide X-Powered-By header (Helmet does this by default)
  hidePoweredBy: true,

  // Cross-Origin-Embedder-Policy: Spectre protection
  crossOriginEmbedderPolicy: { policy: 'credentialless' },

  // Cross-Origin-Opener-Policy: Spectre protection
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin-Resource-Policy: Restrict resource sharing
  crossOriginResourcePolicy: { policy: 'same-site' },
});

// ===== Additional Security Headers (not covered by Helmet) =====
export function additionalSecurityHeaders(req, res, next) {
  // Permissions-Policy: Restrict browser features
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Remove any accidental server info leaks
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
}

// ===== CORS — Strict Origin Control =====
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : DEFAULT_DEV_ORIGINS;

if (!process.env.ALLOWED_ORIGINS) {
  console.warn(
    '⚠️  WARNING: ALLOWED_ORIGINS not set. CORS restricted to localhost only.\n' +
    '   Set ALLOWED_ORIGINS env var for production (e.g. "https://domushr.example.com").'
  );
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
});

// ===== Rate Limiters =====

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
