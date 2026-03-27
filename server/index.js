import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { securityHeaders, corsMiddleware, generalLimiter } from './middleware/security.js';
import { authenticateToken } from './middleware/auth.js';
import db from './database.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import surveyRoutes from './routes/surveys.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_PATH = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, 'uploads');

const app = express();
const PORT = process.env.PORT || 3001;

// ===== Security Middleware =====
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(generalLimiter);

// ===== Body Parsing =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Static Files =====
// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_PATH));

// ===== API Routes =====
// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Password reset request (public - any user can request)
app.post('/api/password-reset-request', (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username wajib diisi.' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(404).json({ error: 'Username tidak ditemukan.' });

    // Check for existing pending request
    const existing = db.prepare("SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending'").get(user.id);
    if (existing) return res.status(409).json({ error: 'Permintaan reset password sudah ada.' });

    db.prepare('INSERT INTO password_reset_requests (user_id, username, user_name) VALUES (?, ?, ?)')
      .run(user.id, user.username, user.name);

    res.json({ message: 'Permintaan reset password berhasil dikirim. Menunggu persetujuan admin.' });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Protected routes (require auth)
app.use('/api/employees', authenticateToken, employeeRoutes);
app.use('/api/surveys', authenticateToken, surveyRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Settings endpoints
app.get('/api/settings/:key', authenticateToken, (req, res) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    res.json({ key: req.params.key, value: setting ? setting.value : null });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

app.put('/api/settings/:key', authenticateToken, (req, res) => {
  try {
    const { value } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, String(value));
    res.json({ key: req.params.key, value });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ===== Root Health Check =====
app.get('/', (req, res) => {
  res.json({ status: 'DomusHR Backend API is running', version: '2.0.0' });
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File terlalu besar. Maksimal 10MB.' });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`\n🚀 DomusHR Backend running on http://localhost:${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api`);
  console.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
  console.log(`💾 Database: SQLite (WAL mode)\n`);
});
