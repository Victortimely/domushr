import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/employees — list all employees
router.get('/', (req, res) => {
  try {
    const employees = db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
    res.json(employees);
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/employees/:id
router.get('/:id', (req, res) => {
  try {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/employees — create employee
router.post('/', (req, res) => {
  try {
    const { nik, name, department, position, address, current_address } = req.body;
    if (!nik || !name) {
      return res.status(400).json({ error: 'NIK dan Nama wajib diisi.' });
    }
    const existing = db.prepare('SELECT id FROM employees WHERE nik = ?').get(nik);
    if (existing) {
      return res.status(409).json({ error: 'NIK sudah terdaftar.' });
    }
    const result = db.prepare(
      'INSERT INTO employees (nik, name, department, position, address, current_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(nik, name, department || '', position || '', address || '', current_address || '');

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(emp);
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/employees/:id — update employee
router.put('/:id', (req, res) => {
  try {
    const { nik, name, department, position, address, current_address } = req.body;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });

    db.prepare(
      'UPDATE employees SET nik=?, name=?, department=?, position=?, address=?, current_address=? WHERE id=?'
    ).run(
      nik || emp.nik, name || emp.name, department ?? emp.department,
      position ?? emp.position, address ?? emp.address,
      current_address ?? emp.current_address, req.params.id
    );

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', (req, res) => {
  try {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    res.json({ message: 'Karyawan berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/employees/import — bulk import
router.post('/import', (req, res) => {
  try {
    const { employees } = req.body;
    if (!Array.isArray(employees)) {
      return res.status(400).json({ error: 'Data karyawan harus berupa array.' });
    }
    const insert = db.prepare(
      'INSERT OR IGNORE INTO employees (nik, name, department, position, address, current_address) VALUES (?, ?, ?, ?, ?, ?)'
    );
    let imported = 0;
    const tx = db.transaction(() => {
      for (const emp of employees) {
        if (emp.nik && emp.name) {
          const result = insert.run(emp.nik, emp.name, emp.department || '', emp.position || '', emp.address || '', emp.current_address || '');
          if (result.changes > 0) imported++;
        }
      }
    });
    tx();
    res.json({ message: `${imported} karyawan berhasil diimport.`, imported });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
