import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL ERROR: JWT_SECRET environment variable is NOT SET. Server cannot start in production mode for security reasons.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET is not set. Using insecure local development fallback.');
  }
}
const ACTUAL_SECRET = JWT_SECRET || 'dev_insecure_key_123';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, ACTUAL_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token sudah expired. Silakan login ulang.' });
    }
    return res.status(403).json({ error: 'Token tidak valid.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tidak terautentikasi.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk operasi ini.' });
    }
    next();
  };
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    ACTUAL_SECRET,
    { expiresIn: '24h' }
  );
}

export { ACTUAL_SECRET as JWT_SECRET };
