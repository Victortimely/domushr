import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/employees.css';

const EMPTY_FORM = { nik: '', name: '', department: '', position: '', address: '', currentAddress: '', status: '' };

const DIVISI_COLORS = {
  'ATM':                 { bg:'rgba(79,142,247,0.15)',  color:'#4f8ef7' },
  'CPC':                 { bg:'rgba(139,92,246,0.15)',  color:'#a78bfa' },
  'CIT':                 { bg:'rgba(100,119,240,0.15)', color:'#818cf8' },
  'Logistik':            { bg:'rgba(251,191,36,0.15)',  color:'#fbbf24' },
  'HRD':                 { bg:'rgba(52,211,153,0.15)',  color:'#34d399' },
  'Finance & Accounting':{ bg:'rgba(244,114,182,0.15)', color:'#f472b6' },
};
const JABATAN_COLORS = {
  'Staff':            { bg:'rgba(148,163,184,0.15)', color:'#94a3b8' },
  'Custody':          { bg:'rgba(79,142,247,0.15)',  color:'#60a5fa' },
  'Teller':           { bg:'rgba(139,92,246,0.15)',  color:'#a78bfa' },
  'Cleaning Service': { bg:'rgba(52,211,153,0.15)',  color:'#34d399' },
  'Leader':           { bg:'rgba(251,191,36,0.15)',  color:'#fbbf24' },
};
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6477f0,#8b5cf6)',
  'linear-gradient(135deg,#4f8ef7,#6477f0)',
  'linear-gradient(135deg,#f472b6,#a78bfa)',
  'linear-gradient(135deg,#34d399,#4f8ef7)',
  'linear-gradient(135deg,#fbbf24,#f472b6)',
  'linear-gradient(135deg,#a78bfa,#34d399)',
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function statusClass(s) {
  if (!s) return 'status-aktif';
  return s.includes('Nonaktif') ? 'status-nonaktif' : 'status-aktif';
}

export default function EmployeesPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [employees, setEmployees] = useState([]);
    
    // Check if user is privileged (master or admin)
    const isPrivileged = user?.role === 'master' || user?.role === 'admin';
    
    // Filters
    const [search, setSearch] = useState('');
    const [fDivisi, setFDivisi] = useState('');
    const [fJabatan, setFJabatan] = useState('');
    const [fStatus, setFStatus] = useState('');
    
    // Sorting
    const [sortKey, setSortKey] = useState(null);
    const [sortAsc, setSortAsc] = useState(true);

    // Modals & Forms
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => { loadEmployees(); }, []);

    async function loadEmployees() {
        try {
            const all = await api.get('/employees');
            setEmployees(all);
        } catch (err) {
            toast.error('Gagal memuat data karyawan');
        }
    }

    const filteredAndSorted = useMemo(() => {
        let result = employees.filter(e => {
            const s = search.toLowerCase();
            const matchSearch = !s || (e.name && e.name.toLowerCase().includes(s)) || (e.nik && e.nik.toLowerCase().includes(s));
            const matchDivisi = !fDivisi || e.department === fDivisi;
            const matchJabatan = !fJabatan || e.position === fJabatan;
            const matchStatus = !fStatus || e.status === fStatus;
            return matchSearch && matchDivisi && matchJabatan && matchStatus;
        });

        if (sortKey) {
            result.sort((a, b) => {
                const va = (a[sortKey] || '').toString().toLowerCase();
                const vb = (b[sortKey] || '').toString().toLowerCase();
                return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            });
        }
        return result;
    }, [employees, search, fDivisi, fJabatan, fStatus, sortKey, sortAsc]);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const resetFilters = () => {
        setSearch(''); setFDivisi(''); setFJabatan(''); setFStatus('');
    };

    const openAdd = () => {
        setEditId(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditId(emp.id);
        setForm({ 
            nik: emp.nik || '', 
            name: emp.name || '', 
            department: emp.department || '', 
            position: emp.position || '', 
            address: emp.address || '', 
            currentAddress: emp.current_address || emp.currentAddress || '',
            status: emp.status || '' 
        });
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

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const renderSortIcon = (key) => {
        const active = sortKey === key;
        return (
            <div className={`sort-icon ${active ? 'sorted' : ''}`}>
                <span className="up" style={{ opacity: active && !sortAsc ? 1 : '' }}></span>
                <span className="down" style={{ opacity: active && sortAsc ? 1 : '' }}></span>
            </div>
        );
    };

    return (
        <div className="employees-v2">
            
            {/* TOP NAV */}
            <div className="topnav">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        Data <span style={{ color: 'var(--accent)' }}>Karyawan</span>
                    </h1>
                </div>
                <div className="topnav-right">
                    {isPrivileged && (
                        <button className="btn-add" onClick={openAdd}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                            Tambah Karyawan
                        </button>
                    )}
                </div>
            </div>

            <div className="main">
                {/* FILTER BAR */}
                <div className="filters-bar">
                    <span className="filter-label">🔍 Filter</span>
                    <input 
                        className="filter-input" 
                        type="text" 
                        placeholder="Cari nama / No. ID karyawan..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="divider"></div>
                    <select className="filter-select" value={fDivisi} onChange={(e) => setFDivisi(e.target.value)}>
                        <option value="">Semua Divisi</option>
                        {Object.keys(DIVISI_COLORS).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="filter-select" value={fJabatan} onChange={(e) => setFJabatan(e.target.value)}>
                        <option value="">Semua Jabatan</option>
                        <option value="Staff">Staff</option>
                        <option value="Custody">Custody</option>
                        <option value="Teller">Teller</option>
                        <option value="Cleaning Service">Cleaning Service</option>
                        <option value="Leader">Leader</option>
                    </select>
                    <select className="filter-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                        <option value="">Semua Status</option>
                        <option value="Magang / Aktif">Magang / Aktif</option>
                        <option value="Kontrak / Aktif">Kontrak / Aktif</option>
                        <option value="Tetap / Aktif">Tetap / Aktif</option>
                        <option value="Magang / Nonaktif">Magang / Nonaktif</option>
                        <option value="Kontrak / Nonaktif">Kontrak / Nonaktif</option>
                        <option value="Tetap / Nonaktif">Tetap / Nonaktif</option>
                    </select>
                    <button className="btn-reset" onClick={resetFilters}>↺ Reset</button>
                </div>

                {/* TABLE CARD */}
                <div className="table-card">
                    <div className="table-info">
                        <h2>Daftar Karyawan</h2>
                        <div className="count-badge">{filteredAndSorted.length} Karyawan</div>
                    </div>
                    
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 60 }}><div className="th-inner">No.</div></th>
                                    <th onClick={() => handleSort('nik')} className={sortKey === 'nik' ? 'sorted' : ''}>
                                        <div className="th-inner">No. ID {renderSortIcon('nik')}</div>
                                    </th>
                                    <th onClick={() => handleSort('name')} className={sortKey === 'name' ? 'sorted' : ''}>
                                        <div className="th-inner">Nama Karyawan {renderSortIcon('name')}</div>
                                    </th>
                                    <th onClick={() => handleSort('department')} className={sortKey === 'department' ? 'sorted' : ''}>
                                        <div className="th-inner">Divisi {renderSortIcon('department')}</div>
                                    </th>
                                    <th onClick={() => handleSort('position')} className={sortKey === 'position' ? 'sorted' : ''}>
                                        <div className="th-inner">Jabatan {renderSortIcon('position')}</div>
                                    </th>
                                    <th onClick={() => handleSort('address')} className={sortKey === 'address' ? 'sorted' : ''}>
                                        <div className="th-inner">Alamat KTP {renderSortIcon('address')}</div>
                                    </th>
                                    <th onClick={() => handleSort('status')} className={sortKey === 'status' ? 'sorted' : ''}>
                                        <div className="th-inner">Status Karyawan {renderSortIcon('status')}</div>
                                    </th>
                                    <th style={{ textAlign: 'right' }}><div className="th-inner" style={{ justifyContent: 'flex-end' }}>Aksi</div></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSorted.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: 0 }}>
                                            <div className="empty-state">
                                                <span className="emoji">🔍</span>
                                                <p>Tidak ada data yang sesuai filter</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSorted.map((e, i) => {
                                        const dc = DIVISI_COLORS[e.department] || { bg: 'rgba(255,255,255,0.08)', color: '#ccc' };
                                        const jc = JABATAN_COLORS[e.position] || { bg: 'rgba(255,255,255,0.08)', color: '#ccc' };
                                        const sc = statusClass(e.status);
                                        const avColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                        return (
                                            <tr key={e.id}>
                                                <td className="no">{i + 1}.</td>
                                                <td className="noid">{e.nik}</td>
                                                <td>
                                                    <div className="emp-cell">
                                                        <div className="emp-avatar" style={{ background: avColor }}>{initials(e.name)}</div>
                                                        <div>
                                                            <div className="emp-name">{e.name}</div>
                                                            <div className="emp-pos">{e.position || '-'} · {e.department || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {e.department ? <span className="pill" style={{ background: dc.bg, color: dc.color }}>{e.department}</span> : '-'}
                                                </td>
                                                <td>
                                                    {e.position ? <span className="pill" style={{ background: jc.bg, color: jc.color }}>{e.position}</span> : '-'}
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.address}>
                                                        {e.address ? <span style={{ color: 'var(--text)', fontSize: '12px' }}>{e.address}</span> : <span style={{ color: 'var(--text-dim)' }}>-</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${sc}`}>
                                                        <span className="dot"></span>{e.status || 'Tidak diset'}
                                                    </span>
                                                </td>
                                                 <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {isPrivileged ? (
                                                        <>
                                                            <button className="action-btn" onClick={() => openEdit(e)} title="Edit Karyawan">✏️</button>
                                                            <button className="action-btn delete" onClick={() => setDeleteTarget(e)} title="Hapus Karyawan">🗑️</button>
                                                        </>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Read-only</span>
                                                    )}
                                                 </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL ADD/EDIT */}
            {showModal && (
                <div className="modal-overlay open" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>{editId ? '✏️ Edit Karyawan' : '➕ Tambah Karyawan Baru'}</h3>
                                <p>Isi data karyawan dengan lengkap</p>
                            </div>
                            <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">No. ID (NIK)</label>
                                    <input className="form-input" value={form.nik} onChange={(e) => updateForm('nik', e.target.value)} placeholder="Contoh: ID20240001" maxLength="20" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap</label>
                                    <input className="form-input" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Nama karyawan" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Divisi</label>
                                    <select className="form-select" value={form.department} onChange={(e) => updateForm('department', e.target.value)}>
                                        <option value="" disabled>Pilih divisi</option>
                                        {Object.keys(DIVISI_COLORS).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jabatan</label>
                                    <select className="form-select" value={form.position} onChange={(e) => updateForm('position', e.target.value)}>
                                        <option value="" disabled>Pilih jabatan</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Custody">Custody</option>
                                        <option value="Teller">Teller</option>
                                        <option value="Cleaning Service">Cleaning Service</option>
                                        <option value="Leader">Leader</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Alamat KTP</label>
                                    <input className="form-input" value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Sesuai KTP" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Alamat Saat Ini</label>
                                    <input className="form-input" value={form.currentAddress} onChange={(e) => updateForm('currentAddress', e.target.value)} placeholder="Domisili aktif" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status Karyawan</label>
                                <select className="form-select" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                                    <option value="" disabled>Pilih status</option>
                                    <optgroup label="— Aktif —">
                                        <option value="Magang / Aktif">Magang / Aktif</option>
                                        <option value="Kontrak / Aktif">Kontrak / Aktif</option>
                                        <option value="Tetap / Aktif">Tetap / Aktif</option>
                                    </optgroup>
                                    <optgroup label="— Nonaktif —">
                                        <option value="Magang / Nonaktif">Magang / Nonaktif</option>
                                        <option value="Kontrak / Nonaktif">Kontrak / Nonaktif</option>
                                        <option value="Tetap / Nonaktif">Tetap / Nonaktif</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
                            <button className="btn-save" onClick={handleSave}>{editId ? 'Simpan Perubahan' : 'Simpan Data'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteTarget && (
                <div className="modal-overlay open" onClick={() => setDeleteTarget(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div style={{ textAlign: 'center', padding: '30px 20px 20px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                            <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>Hapus Karyawan?</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
                                Apakah Anda yakin ingin menghapus data:
                            </p>
                            <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{deleteTarget.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>NIK: {deleteTarget.nik}</div>
                            </div>
                            <p style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '24px', fontWeight: 600 }}>
                                ⚠ Tindakan ini tidak bisa dibatalkan!
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Batal</button>
                                <button className="btn-delete" style={{ flex: 1 }} onClick={confirmDelete}>
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
