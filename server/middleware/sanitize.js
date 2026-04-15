/**
 * Input Sanitization Middleware
 * 
 * Strips HTML tags from all string values in request body
 * to prevent stored XSS attacks via form submissions.
 * 
 * This is a defense-in-depth measure — CSP and output encoding
 * are the primary XSS defenses, but sanitizing input adds
 * an extra layer of protection.
 */

// Simple HTML tag stripper — removes all HTML tags from a string
function stripHtmlTags(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '')     // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')   // Remove inline event handlers (onclick=, onerror=, etc.)
    .trim();
}

// Recursively sanitize all string values in an object
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return stripHtmlTags(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value);
  }
  return value;
}

function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value);
  }
  return sanitized;
}

/**
 * Express middleware that sanitizes req.body and req.query
 * by stripping HTML tags from all string values.
 * 
 * Skips fields that are expected to contain special content
 * (e.g. signature data URLs, base64 photos).
 */
const SKIP_FIELDS = ['signature', 'photos', 'data', 'value'];

export function sanitizeInput(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        // Skip fields that legitimately contain HTML/base64/JSON
        if (SKIP_FIELDS.includes(key)) continue;
        req.body[key] = sanitizeValue(value);
      }
    }

    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        req.query[key] = sanitizeValue(value);
      }
    }
  } catch (err) {
    console.error('Sanitization error:', err);
    // Don't block the request on sanitization failure
  }

  next();
}
