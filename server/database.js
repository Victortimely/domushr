import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'domushr.db') : path.join(__dirname, 'domushr.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'surveyor',
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nik TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT DEFAULT '',
    position TEXT DEFAULT '',
    address TEXT DEFAULT '',
    current_address TEXT DEFAULT '',
    status TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    employee_name TEXT,
    employee_nik TEXT,
    employee_dept TEXT,
    surveyor_id INTEGER NOT NULL,
    surveyor_name TEXT,
    status TEXT DEFAULT 'draft',
    survey_date TEXT,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    data TEXT,
    photos TEXT,
    signature TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    synced_at TEXT,
    FOREIGN KEY (surveyor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id INTEGER,
    user_name TEXT,
    details TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT,
    user_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS registration_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'luar-kota',
    start_date TEXT,
    end_date TEXT,
    itinerary TEXT DEFAULT '[]',
    budget TEXT DEFAULT '{"total":0,"items":[]}',
    packing TEXT DEFAULT '{}',
    members TEXT DEFAULT '[]',
    vetting_targets TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration for adding status to employees if it doesn't exist
try {
  db.exec('ALTER TABLE employees ADD COLUMN status TEXT DEFAULT ""');
  console.log('✅ Migrated: added status column to employees table');
} catch (e) {
  // column already exists
}

// Seed default users if none exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const insert = db.prepare('INSERT INTO users (username, name, role, password) VALUES (?, ?, ?, ?)');
  const seedUsers = db.transaction(() => {
    insert.run('surveyor1', 'Ahmad Firdaus', 'surveyor', bcrypt.hashSync('survey123', 10));
    insert.run('surveyor2', 'Siti Rahmawati', 'surveyor', bcrypt.hashSync('survey123', 10));
    insert.run('surveyor3', 'Budi Santoso', 'surveyor', bcrypt.hashSync('survey123', 10));
    insert.run('admin', 'Admin Utama', 'admin', bcrypt.hashSync('admin123', 10));
    insert.run('adminhrdjkt', 'Admin Vetting 1', 'master', bcrypt.hashSync('Khususvetting123', 10));
  });
  seedUsers();
  console.log('✅ Default users seeded');
}

// Seed default employees if none exist
const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get();
if (empCount.count === 0) {
  const insert = db.prepare('INSERT INTO employees (nik, name, department, position, address) VALUES (?, ?, ?, ?, ?)');
  const seedEmps = db.transaction(() => {
    insert.run('EMP001', 'Andi Wijaya', 'Produksi', 'Operator Mesin', 'Jl. Merdeka No. 10, Jakarta Barat');
    insert.run('EMP002', 'Dewi Lestari', 'HRD', 'Staff HRD', 'Jl. Sudirman No. 25, Jakarta Selatan');
    insert.run('EMP003', 'Fajar Nugroho', 'Keuangan', 'Akuntan', 'Jl. Gatot Subroto No. 8, Jakarta Pusat');
    insert.run('EMP004', 'Gita Permata', 'Marketing', 'Sales Executive', 'Jl. Thamrin No. 15, Jakarta Pusat');
    insert.run('EMP005', 'Hendra Kusuma', 'IT', 'Programmer', 'Jl. Kebon Jeruk No. 30, Jakarta Barat');
    insert.run('EMP006', 'Indah Sari', 'Produksi', 'Quality Control', 'Jl. Cempaka Putih No. 12, Jakarta Pusat');
    insert.run('EMP007', 'Joko Prasetyo', 'Logistik', 'Warehouse Staff', 'Jl. Kelapa Gading No. 5, Jakarta Utara');
    insert.run('EMP008', 'Kartika Dewi', 'HRD', 'Recruitment', 'Jl. Kemang Raya No. 20, Jakarta Selatan');
    insert.run('EMP009', 'Lukman Hakim', 'Keuangan', 'Staff Pajak', 'Jl. Pasar Minggu No. 18, Jakarta Selatan');
    insert.run('EMP010', 'Maya Anggraini', 'Marketing', 'Digital Marketing', 'Jl. Pondok Indah No. 7, Jakarta Selatan');
    insert.run('EMP011', 'Nurul Hidayat', 'IT', 'System Admin', 'Jl. Sunter No. 22, Jakarta Utara');
    insert.run('EMP012', 'Oscar Ramadhan', 'Produksi', 'Supervisor', 'Jl. Cibubur No. 14, Jakarta Timur');
    insert.run('EMP013', 'Putri Amelia', 'GA', 'Staff GA', 'Jl. Rawamangun No. 9, Jakarta Timur');
    insert.run('EMP014', 'Rahmat Dani', 'Logistik', 'Driver', 'Jl. Tanah Abang No. 33, Jakarta Pusat');
    insert.run('EMP015', 'Sari Mulyani', 'Keuangan', 'Kasir', 'Jl. Pluit No. 11, Jakarta Utara');
    insert.run('EMP016', 'Taufik Ismail', 'Produksi', 'Teknisi', 'Jl. Cipinang No. 16, Jakarta Timur');
    insert.run('EMP017', 'Ulfa Maharani', 'HRD', 'Training Staff', 'Jl. Fatmawati No. 28, Jakarta Selatan');
    insert.run('EMP018', 'Vino Bastian', 'Marketing', 'Brand Manager', 'Jl. Senayan No. 6, Jakarta Selatan');
    insert.run('EMP019', 'Wulan Setiawati', 'GA', 'Resepsionis', 'Jl. Daan Mogot No. 45, Tangerang');
    insert.run('EMP020', 'Yoga Pratama', 'IT', 'Network Engineer', 'Jl. Bekasi Raya No. 17, Bekasi');
  });
  seedEmps();
  console.log('✅ Default employees seeded');
}

export default db;
