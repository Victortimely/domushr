import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/trips — list all trips for the current user
router.get('/', (req, res) => {
  try {
    const trips = db.prepare(
      'SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    // Parse JSON columns
    const parsed = trips.map(t => ({
      ...t,
      itinerary: t.itinerary ? JSON.parse(t.itinerary) : [],
      budget: t.budget ? JSON.parse(t.budget) : { total: 0, items: [] },
      packing: t.packing ? JSON.parse(t.packing) : {},
      members: t.members ? JSON.parse(t.members) : [],
      vettingTargets: t.vetting_targets ? JSON.parse(t.vetting_targets) : [],
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/trips/:id — get single trip
router.get('/:id', (req, res) => {
  try {
    const trip = db.prepare(
      'SELECT * FROM trips WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!trip) return res.status(404).json({ error: 'Trip tidak ditemukan.' });

    trip.itinerary = trip.itinerary ? JSON.parse(trip.itinerary) : [];
    trip.budget = trip.budget ? JSON.parse(trip.budget) : { total: 0, items: [] };
    trip.packing = trip.packing ? JSON.parse(trip.packing) : {};
    trip.members = trip.members ? JSON.parse(trip.members) : [];
    trip.vettingTargets = trip.vetting_targets ? JSON.parse(trip.vetting_targets) : [];

    res.json(trip);
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/trips — create new trip
router.post('/', (req, res) => {
  try {
    const { name, type, startDate, endDate, itinerary, budget, packing, members, vettingTargets } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama trip wajib diisi.' });
    }

    const result = db.prepare(`
      INSERT INTO trips (user_id, name, type, start_date, end_date, itinerary, budget, packing, members, vetting_targets)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      name.trim(),
      type || 'luar-kota',
      startDate || null,
      endDate || null,
      JSON.stringify(itinerary || []),
      JSON.stringify(budget || { total: 0, items: [] }),
      JSON.stringify(packing || {}),
      JSON.stringify(members || []),
      JSON.stringify(vettingTargets || [])
    );

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(result.lastInsertRowid);
    trip.itinerary = JSON.parse(trip.itinerary || '[]');
    trip.budget = JSON.parse(trip.budget || '{"total":0,"items":[]}');
    trip.packing = JSON.parse(trip.packing || '{}');
    trip.members = JSON.parse(trip.members || '[]');
    trip.vettingTargets = JSON.parse(trip.vetting_targets || '[]');

    res.status(201).json(trip);
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/trips/:id — update trip (full or partial)
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare(
      'SELECT * FROM trips WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existing) return res.status(404).json({ error: 'Trip tidak ditemukan.' });

    const { name, type, startDate, endDate, itinerary, budget, packing, members, vettingTargets } = req.body;

    db.prepare(`
      UPDATE trips SET
        name = ?,
        type = ?,
        start_date = ?,
        end_date = ?,
        itinerary = ?,
        budget = ?,
        packing = ?,
        members = ?,
        vetting_targets = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      name !== undefined ? name : existing.name,
      type !== undefined ? type : existing.type,
      startDate !== undefined ? startDate : existing.start_date,
      endDate !== undefined ? endDate : existing.end_date,
      itinerary !== undefined ? JSON.stringify(itinerary) : existing.itinerary,
      budget !== undefined ? JSON.stringify(budget) : existing.budget,
      packing !== undefined ? JSON.stringify(packing) : existing.packing,
      members !== undefined ? JSON.stringify(members) : existing.members,
      vettingTargets !== undefined ? JSON.stringify(vettingTargets) : existing.vetting_targets,
      req.params.id,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    updated.itinerary = JSON.parse(updated.itinerary || '[]');
    updated.budget = JSON.parse(updated.budget || '{"total":0,"items":[]}');
    updated.packing = JSON.parse(updated.packing || '{}');
    updated.members = JSON.parse(updated.members || '[]');
    updated.vettingTargets = JSON.parse(updated.vetting_targets || '[]');

    res.json(updated);
  } catch (err) {
    console.error('Update trip error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/trips/:id — delete trip
router.delete('/:id', (req, res) => {
  try {
    const trip = db.prepare(
      'SELECT * FROM trips WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!trip) return res.status(404).json({ error: 'Trip tidak ditemukan.' });

    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    res.json({ message: 'Trip berhasil dihapus.' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
