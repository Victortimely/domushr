import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { generateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Username tidak ditemukan.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Password salah.' });
    }

    const token = generateToken(user);

    // Audit log
    db.prepare('INSERT INTO audit_logs (action, user_id, user_name, details) VALUES (?, ?, ?, ?)')
      .run('LOGIN', user.id, user.name, JSON.stringify({ ip: req.ip }));

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/register — creates a pending registration request
router.post('/register', authLimiter, (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    // Check if username already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }

    // Check if there's already a pending request
    const pendingReq = db.prepare("SELECT id FROM registration_requests WHERE username = ? AND status = 'pending'").get(username);
    if (pendingReq) {
      return res.status(409).json({ error: 'Permintaan registrasi dengan username ini sudah ada.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO registration_requests (name, username, password) VALUES (?, ?, ?)')
      .run(name, username, hashedPassword);

    res.json({ message: 'Pendaftaran berhasil dikirim. Menunggu persetujuan admin.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/auth/me — get current user info from token
router.get('/me', (req, res) => {
  // This requires the auth middleware to be applied before
  res.json({ user: req.user });
});

export default router;
