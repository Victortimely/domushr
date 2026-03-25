import Dexie from 'dexie';

export const db = new Dexie('SurveyKaryawanDB');

db.version(1).stores({
    users: '++id, username, name, role',
    employees: '++id, nik, name, department, position',
    surveys: '++id, employeeId, employeeName, surveyorId, surveyorName, status, createdAt, updatedAt, latitude, longitude',
    auditLogs: '++id, action, userId, userName, timestamp, details',
});

db.version(2).stores({
    employees: '++id, nik, name, department, position, address',
}).upgrade(tx => {
    return tx.table('employees').toCollection().modify(emp => {
        if (!emp.address) emp.address = '';
    });
});

db.version(3).stores({
    users: '++id, username, name, role',
    employees: '++id, nik, name, department, position, address',
    surveys: '++id, employeeId, employeeName, surveyorId, surveyorName, status, createdAt, updatedAt, latitude, longitude',
    auditLogs: '++id, action, userId, userName, timestamp, details',
    passwordResetRequests: '++id, userId, username, userName, status, createdAt',
    settings: 'key',
});

db.version(4).stores({
    users: '++id, username, name, role',
    employees: '++id, nik, name, department, position, address, currentAddress',
    surveys: '++id, employeeId, employeeName, surveyorId, surveyorName, status, createdAt, updatedAt, latitude, longitude',
    auditLogs: '++id, action, userId, userName, timestamp, details',
    passwordResetRequests: '++id, userId, username, userName, status, createdAt',
    settings: 'key',
}).upgrade(tx => {
    return tx.table('employees').toCollection().modify(emp => {
        if (!emp.currentAddress) emp.currentAddress = '';
    });
});

db.version(5).stores({
    users: '++id, username, name, role',
    employees: '++id, nik, name, department, position, address, currentAddress',
    surveys: '++id, employeeId, employeeName, surveyorId, surveyorName, status, createdAt, updatedAt, latitude, longitude',
    auditLogs: '++id, action, userId, userName, timestamp, details',
    passwordResetRequests: '++id, userId, username, userName, status, createdAt',
    registrationRequests: '++id, name, username, password, status, createdAt',
    settings: 'key',
});

// Seed default users
export async function seedDatabase() {
    const userCount = await db.users.count();
    if (userCount === 0) {
        await db.users.bulkAdd([
            { username: 'surveyor1', name: 'Ahmad Firdaus', role: 'surveyor', password: 'survey123' },
            { username: 'surveyor2', name: 'Siti Rahmawati', role: 'surveyor', password: 'survey123' },
            { username: 'surveyor3', name: 'Budi Santoso', role: 'surveyor', password: 'survey123' },
            { username: 'admin', name: 'Admin Utama', role: 'admin', password: 'admin123' },
            { username: 'adminhrdjkt', name: 'Admin Vetting 1', role: 'master', password: 'Khususvetting123' },
        ]);
    } else {
        // Ensure master user exists even if DB was already seeded
        const masterExists = await db.users.where('username').equals('adminhrdjkt').first();
        if (!masterExists) {
            await db.users.add({ username: 'adminhrdjkt', name: 'Admin Vetting 1', role: 'master', password: 'Khususvetting123' });
        }
    }

    const empCount = await db.employees.count();
    if (empCount === 0) {
        await db.employees.bulkAdd([
            { nik: 'EMP001', name: 'Andi Wijaya', department: 'Produksi', position: 'Operator Mesin', address: 'Jl. Merdeka No. 10, Jakarta Barat' },
            { nik: 'EMP002', name: 'Dewi Lestari', department: 'HRD', position: 'Staff HRD', address: 'Jl. Sudirman No. 25, Jakarta Selatan' },
            { nik: 'EMP003', name: 'Fajar Nugroho', department: 'Keuangan', position: 'Akuntan', address: 'Jl. Gatot Subroto No. 8, Jakarta Pusat' },
            { nik: 'EMP004', name: 'Gita Permata', department: 'Marketing', position: 'Sales Executive', address: 'Jl. Thamrin No. 15, Jakarta Pusat' },
            { nik: 'EMP005', name: 'Hendra Kusuma', department: 'IT', position: 'Programmer', address: 'Jl. Kebon Jeruk No. 30, Jakarta Barat' },
            { nik: 'EMP006', name: 'Indah Sari', department: 'Produksi', position: 'Quality Control', address: 'Jl. Cempaka Putih No. 12, Jakarta Pusat' },
            { nik: 'EMP007', name: 'Joko Prasetyo', department: 'Logistik', position: 'Warehouse Staff', address: 'Jl. Kelapa Gading No. 5, Jakarta Utara' },
            { nik: 'EMP008', name: 'Kartika Dewi', department: 'HRD', position: 'Recruitment', address: 'Jl. Kemang Raya No. 20, Jakarta Selatan' },
            { nik: 'EMP009', name: 'Lukman Hakim', department: 'Keuangan', position: 'Staff Pajak', address: 'Jl. Pasar Minggu No. 18, Jakarta Selatan' },
            { nik: 'EMP010', name: 'Maya Anggraini', department: 'Marketing', position: 'Digital Marketing', address: 'Jl. Pondok Indah No. 7, Jakarta Selatan' },
            { nik: 'EMP011', name: 'Nurul Hidayat', department: 'IT', position: 'System Admin', address: 'Jl. Sunter No. 22, Jakarta Utara' },
            { nik: 'EMP012', name: 'Oscar Ramadhan', department: 'Produksi', position: 'Supervisor', address: 'Jl. Cibubur No. 14, Jakarta Timur' },
            { nik: 'EMP013', name: 'Putri Amelia', department: 'GA', position: 'Staff GA', address: 'Jl. Rawamangun No. 9, Jakarta Timur' },
            { nik: 'EMP014', name: 'Rahmat Dani', department: 'Logistik', position: 'Driver', address: 'Jl. Tanah Abang No. 33, Jakarta Pusat' },
            { nik: 'EMP015', name: 'Sari Mulyani', department: 'Keuangan', position: 'Kasir', address: 'Jl. Pluit No. 11, Jakarta Utara' },
            { nik: 'EMP016', name: 'Taufik Ismail', department: 'Produksi', position: 'Teknisi', address: 'Jl. Cipinang No. 16, Jakarta Timur' },
            { nik: 'EMP017', name: 'Ulfa Maharani', department: 'HRD', position: 'Training Staff', address: 'Jl. Fatmawati No. 28, Jakarta Selatan' },
            { nik: 'EMP018', name: 'Vino Bastian', department: 'Marketing', position: 'Brand Manager', address: 'Jl. Senayan No. 6, Jakarta Selatan' },
            { nik: 'EMP019', name: 'Wulan Setiawati', department: 'GA', position: 'Resepsionis', address: 'Jl. Daan Mogot No. 45, Tangerang' },
            { nik: 'EMP020', name: 'Yoga Pratama', department: 'IT', position: 'Network Engineer', address: 'Jl. Bekasi Raya No. 17, Bekasi' },
        ]);
    }
}

export default db;
