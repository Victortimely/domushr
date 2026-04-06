import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Hanya file gambar (jpg, png, webp) yang diperbolehkan.'));
  },
});

const router = Router();

// GET /api/surveys — list surveys (with optional filters)
router.get('/', (req, res) => {
  try {
    const { status, surveyor_id } = req.query;
    let query = 'SELECT * FROM surveys';
    const params = [];
    const conditions = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (surveyor_id) { conditions.push('surveyor_id = ?'); params.push(surveyor_id); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    const surveys = db.prepare(query).all(...params);
    // Parse JSON fields
    const parsed = surveys.map(s => ({
      ...s,
      data: s.data ? JSON.parse(s.data) : {},
      photos: s.photos ? JSON.parse(s.photos) : [],
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Get surveys error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/surveys/:id
router.get('/:id', (req, res) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey tidak ditemukan.' });

    // Security check: Only owner or admin/master can view
    if (req.user.role !== 'master' && req.user.role !== 'admin' && survey.surveyor_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke survey ini.' });
    }

    survey.data = survey.data ? JSON.parse(survey.data) : {};
    survey.photos = survey.photos ? JSON.parse(survey.photos) : [];
    res.json(survey);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/surveys — create survey
router.post('/', (req, res) => {
  try {
    const {
      employee_id, employee_name, employee_nik, employee_dept,
      status, survey_date, latitude, longitude, accuracy,
      data, photos, signature
    } = req.body;

    const result = db.prepare(`
      INSERT INTO surveys (employee_id, employee_name, employee_nik, employee_dept,
        surveyor_id, surveyor_name, status, survey_date, latitude, longitude, accuracy,
        data, photos, signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_id || null, employee_name || '', employee_nik || '', employee_dept || '',
      req.user.id, req.user.name,
      status || 'draft', survey_date || new Date().toISOString(),
      latitude || null, longitude || null, accuracy || null,
      JSON.stringify(data || {}), JSON.stringify(photos || []), signature || null
    );

    // Audit log
    db.prepare('INSERT INTO audit_logs (action, user_id, user_name, details) VALUES (?, ?, ?, ?)')
      .run('CREATE_SURVEY', req.user.id, req.user.name, JSON.stringify({ surveyId: result.lastInsertRowid, employee: employee_name }));

    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(result.lastInsertRowid);
    survey.data = survey.data ? JSON.parse(survey.data) : {};
    survey.photos = survey.photos ? JSON.parse(survey.photos) : [];
    res.status(201).json(survey);
  } catch (err) {
    console.error('Create survey error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/surveys/:id — update survey
router.put('/:id', (req, res) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey tidak ditemukan.' });

    // Security check: Only owner or master can edit
    if (req.user.role !== 'master' && survey.surveyor_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda tidak diizinkan mengubah survey ini.' });
    }

    const {
      employee_id, employee_name, employee_nik, employee_dept,
      status, survey_date, latitude, longitude, accuracy,
      data, photos, signature, synced_at
    } = req.body;

    db.prepare(`
      UPDATE surveys SET
        employee_id=?, employee_name=?, employee_nik=?, employee_dept=?,
        status=?, survey_date=?, latitude=?, longitude=?, accuracy=?,
        data=?, photos=?, signature=?, synced_at=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      employee_id ?? survey.employee_id, employee_name ?? survey.employee_name,
      employee_nik ?? survey.employee_nik, employee_dept ?? survey.employee_dept,
      status ?? survey.status, survey_date ?? survey.survey_date,
      latitude ?? survey.latitude, longitude ?? survey.longitude, accuracy ?? survey.accuracy,
      data ? JSON.stringify(data) : survey.data, photos ? JSON.stringify(photos) : survey.photos,
      signature ?? survey.signature, synced_at ?? survey.synced_at, req.params.id
    );

    const updated = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    updated.data = updated.data ? JSON.parse(updated.data) : {};
    updated.photos = updated.photos ? JSON.parse(updated.photos) : [];
    res.json(updated);
  } catch (err) {
    console.error('Update survey error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/surveys/:id
router.delete('/:id', (req, res) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey tidak ditemukan.' });

    // Security check: Only owner or admin/master can delete
    if (req.user.role !== 'master' && req.user.role !== 'admin' && survey.surveyor_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda tidak diizinkan menghapus survey ini.' });
    }

    db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
    res.json({ message: 'Survey berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/surveys/:id/photos — upload photos
router.post('/:id/photos', upload.array('photos', 10), (req, res) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey tidak ditemukan.' });

    // Security check: Only owner or master can upload photos
    if (req.user.role !== 'master' && survey.surveyor_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda tidak diizinkan mengunggah foto ke survey ini.' });
    }

    const existingPhotos = survey.photos ? JSON.parse(survey.photos) : [];
    const newPhotos = req.files.map(f => `/uploads/${f.filename}`);
    const allPhotos = [...existingPhotos, ...newPhotos];

    db.prepare('UPDATE surveys SET photos = ? WHERE id = ?').run(JSON.stringify(allPhotos), req.params.id);
    res.json({ photos: allPhotos });
  } catch (err) {
    console.error('Upload photos error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/surveys/stats/summary — dashboard stats
router.get('/stats/summary', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM surveys').get().count;
    const draft = db.prepare("SELECT COUNT(*) as count FROM surveys WHERE status = 'draft'").get().count;
    const saved = db.prepare("SELECT COUNT(*) as count FROM surveys WHERE status = 'saved'").get().count;
    const synced = db.prepare("SELECT COUNT(*) as count FROM surveys WHERE status = 'synced'").get().count;
    const verified = db.prepare("SELECT COUNT(*) as count FROM surveys WHERE status = 'verified'").get().count;
    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
    const surveyedNiks = db.prepare("SELECT DISTINCT employee_nik FROM surveys WHERE status IN ('saved','synced','verified')").all();
    const surveyedCount = surveyedNiks.length;

    res.json({ total, draft, saved, synced, verified, totalEmployees, surveyedCount, unsurveyed: totalEmployees - surveyedCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
