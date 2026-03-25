import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { nik: '', name: '', department: '', position: '', address: '', current_address: '' };

export default function EmployeesPage() {
    const toast = useToast();
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [filtered, setFiltered] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => { loadEmployees(); }, []);

    async function loadEmployees() {
        const all = await api.get('/employees');
        setEmployees(all);
        setFiltered(all);
    }

    useEffect(() => {
        if (!search) { setFiltered(employees); return; }
        const q = search.toLowerCase();
        setFiltered(employees.filter((e) =>
            e.name.toLowerCase().includes(q) ||
            e.nik.toLowerCase().includes(q) ||
            e.department?.toLowerCase().includes(q) ||
            e.position?.toLowerCase().includes(q)
        ));
    }, [search, employees]);

    const openAdd = () => {
        setEditId(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditId(emp.id);
        setForm({ nik: emp.nik, name: emp.name, department: emp.department || '', position: emp.position || '', address: emp.address || '', current_address: emp.current_address || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.nik.trim()) {
            toast.error('Nama dan NIK wajib diisi');
            return;
        }
        try {
            if (editId) {
                await api.put(`/employees/${editId}`, form);
                toast.success('Data karyawan diperbarui');
            } else {
                await api.post('/employees', form);
                toast.success('Karyawan baru ditambahkan');
            }
            setShowModal(false);
            loadEmployees();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/employees/${deleteTarget.id}`);
            toast.success(`Data "${deleteTarget.name}" berhasil dihapus`);
            setDeleteTarget(null);
            loadEmployees();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Data Karyawan</h1>
                <p className="page-subtitle">{employees.length} karyawan terdaftar</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari nama, NIK, divisi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" onClick={openAdd} id="add-employee-btn">
                    ➕ Tambah
                </button>
            </div>

            {/* Employee List */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">Tidak Ada Data</div>
                    <p>{search ? 'Coba ubah kata pencarian' : 'Belum ada karyawan terdaftar'}</p>
                </div>
            ) : (
                <div className="survey-list">
                    {filtered.map((emp) => (
                        <div key={emp.id} className="survey-item" style={{ cursor: 'default' }}>
                            <div className="survey-item-avatar" style={{ background: 'var(--gradient-2)' }}>
                                {emp.name?.[0] || '?'}
                            </div>
                            <div className="survey-item-info">
                                <div className="survey-item-name">{emp.name}</div>
                                <div className="survey-item-meta">
                                    <span>🆔 {emp.nik}</span>
                                    <span>🏢 {emp.department || '-'}</span>
                                    <span>💼 {emp.position || '-'}</span>
                                </div>
                                    {emp.address && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            📍 KTP: {emp.address}
                                        </div>
                                    )}
                                    {emp.currentAddress && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            🏠 Saat Ini: {emp.currentAddress}
                                        </div>
                                    )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)} title="Edit">✏️</button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setDeleteTarget(emp)}
                                    title="Hapus"
                                    style={{ color: 'var(--danger)' }}
                                    id={`delete-emp-${emp.id}`}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 20 }}>{editId ? '✏️ Edit Karyawan' : '➕ Tambah Karyawan Baru'}</h3>

                        <div className="form-group">
                            <label className="form-label">NIK <span className="required">*</span></label>
                            <input className="form-input" value={form.nik} onChange={(e) => updateForm('nik', e.target.value)} placeholder="Contoh: EMP021" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nama Lengkap <span className="required">*</span></label>
                            <input className="form-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Nama karyawan" />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Divisi</label>
                                <input className="form-input" value={form.department} onChange={(e) => updateForm('department', e.target.value)} placeholder="Contoh: IT, HRD" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Jabatan</label>
                                <input className="form-input" value={form.position} onChange={(e) => updateForm('position', e.target.value)} placeholder="Contoh: Programmer" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Alamat KTP</label>
                            <textarea className="form-textarea" value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Alamat lengkap sesuai KTP" rows={2} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Alamat Saat Ini</label>
                            <textarea className="form-textarea" value={form.currentAddress} onChange={(e) => updateForm('currentAddress', e.target.value)} placeholder="Alamat tempat tinggal saat ini" rows={2} />
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }} id="save-employee-btn">
                                💾 {editId ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
                            <h3 style={{ marginBottom: 8 }}>Hapus Karyawan?</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>
                                Apakah Anda yakin ingin menghapus data:
                            </p>
                            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                                <div style={{ fontWeight: 700 }}>{deleteTarget.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>NIK: {deleteTarget.nik}</div>
                            </div>
                            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: 20 }}>
                                ⚠ Tindakan ini tidak bisa dibatalkan!
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>Batal</button>
                                <button className="btn btn-danger" onClick={confirmDelete} style={{ flex: 1 }} id="confirm-delete-btn">
                                    🗑️ Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
