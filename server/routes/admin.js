import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// All admin routes require admin or master role
router.use(requireRole('admin', 'master'));

// GET /api/admin/users — list all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, name, role, created_at FROM users ORDER BY id ASC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/admin/users/:id — delete user (master only)
router.delete('/users/:id', requireRole('master'), (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri.' });
    if (user.role === 'master') return res.status(400).json({ error: 'Tidak bisa menghapus Master User.' });

    db.prepare('DELETE FROM password_reset_requests WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    db.prepare('INSERT INTO audit_logs (action, user_id, user_name, details) VALUES (?, ?, ?, ?)')
      .run('DELETE_USER', req.user.id, req.user.name, JSON.stringify({ deletedUser: user.username }));

    res.json({ message: `User ${user.username} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/password-resets — list password reset requests
router.get('/password-resets', (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM password_reset_requests ORDER BY created_at DESC').all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admin/password-resets/:id/approve — reset user password
router.post('/password-resets/:id/approve', (req, res) => {
  try {
    const resetReq = db.prepare('SELECT * FROM password_reset_requests WHERE id = ?').get(req.params.id);
    if (!resetReq) return res.status(404).json({ error: 'Request tidak ditemukan.' });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, resetReq.user_id);
    db.prepare("UPDATE password_reset_requests SET status = 'approved', resolved_at = datetime('now') WHERE id = ?").run(req.params.id);

    db.prepare('INSERT INTO audit_logs (action, user_id, user_name, details) VALUES (?, ?, ?, ?)')
      .run('RESET_PASSWORD', req.user.id, req.user.name, JSON.stringify({ forUser: resetReq.username }));

    res.json({ message: 'Password berhasil direset.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admin/password-resets/:id/reject
router.post('/password-resets/:id/reject', (req, res) => {
  try {
    db.prepare("UPDATE password_reset_requests SET status = 'rejected', resolved_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Request ditolak.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/registrations — list registration requests
router.get('/registrations', (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM registration_requests ORDER BY created_at DESC').all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admin/registrations/:id/approve — approve registration
router.post('/registrations/:id/approve', (req, res) => {
  try {
    const regReq = db.prepare('SELECT * FROM registration_requests WHERE id = ?').get(req.params.id);
    if (!regReq) return res.status(404).json({ error: 'Request tidak ditemukan.' });
    if (regReq.status !== 'pending') return res.status(400).json({ error: 'Request sudah diproses.' });

    // Check if username is still available
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(regReq.username);
    if (existing) {
      db.prepare("UPDATE registration_requests SET status = 'rejected', resolved_at = datetime('now') WHERE id = ?").run(req.params.id);
      return res.status(409).json({ error: 'Username sudah digunakan. Request ditolak otomatis.' });
    }

    // Create user — password is already hashed during registration
    db.prepare('INSERT INTO users (username, name, role, password) VALUES (?, ?, ?, ?)')
      .run(regReq.username, regReq.name, 'surveyor', regReq.password);

    db.prepare("UPDATE registration_requests SET status = 'approved', resolved_at = datetime('now') WHERE id = ?").run(req.params.id);

    db.prepare('INSERT INTO audit_logs (action, user_id, user_name, details) VALUES (?, ?, ?, ?)')
      .run('APPROVE_REGISTRATION', req.user.id, req.user.name, JSON.stringify({ newUser: regReq.username }));

    res.json({ message: `User ${regReq.username} berhasil disetujui.` });
  } catch (err) {
    console.error('Approve registration error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admin/registrations/:id/reject
router.post('/registrations/:id/reject', (req, res) => {
  try {
    const regReq = db.prepare('SELECT * FROM registration_requests WHERE id = ?').get(req.params.id);
    if (!regReq) return res.status(404).json({ error: 'Request tidak ditemukan.' });

    db.prepare("UPDATE registration_requests SET status = 'rejected', resolved_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Pendaftaran ditolak.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admin/forgot-password — create password reset request
router.post('/forgot-password', (req, res) => {
  // This endpoint doesn't require admin role — override the middleware
});

// GET /api/admin/audit-logs — get audit logs
router.get('/audit-logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
