import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/history.css';

export default function HistoryPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [surveys, setSurveys] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [time, setTime] = useState(new Date());
    const [showFilter, setShowFilter] = useState(false);
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    useEffect(() => {
        loadSurveys();
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const lastUpdated = useMemo(() => {
        if (surveys.length === 0) return null;
        const dates = surveys.map(s => new Date(s.created_at).getTime()).filter(t => !isNaN(t));
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates));
    }, [surveys]);

    async function loadSurveys() {
        try {
            const all = await api.get('/surveys');
            setSurveys(all);
            setFiltered(all);
        } catch (error) {
            console.error('Failed to load surveys:', error);
        }
    }

    const handleVerify = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!window.confirm('Verifikasi data survey ini?')) return;

        try {
            await api.put(`/surveys/${id}`, { status: 'verified' });
            toast.success('Survey berhasil diverifikasi');
            
            // Update local state
            setSurveys(prev => prev.map(s => s.id === id ? { ...s, status: 'verified' } : s));
        } catch (error) {
            toast.error(error.message || 'Gagal memverifikasi survey');
        }
    };

    const handleVerifyAll = async () => {
        const syncedSurveys = filtered.filter(s => s.status === 'synced');
        if (syncedSurveys.length === 0) return;

        if (!window.confirm(`Verifikasi semua (${syncedSurveys.length}) data survey yang terpilih?`)) return;

        try {
            toast.info(`Memproses verifikasi ${syncedSurveys.length} survey...`);
            const promises = syncedSurveys.map(s => api.put(`/surveys/${s.id}`, { status: 'verified' }));
            await Promise.all(promises);
            
            toast.success(`${syncedSurveys.length} survey berhasil diverifikasi`);
            
            // Update local state
            const ids = syncedSurveys.map(s => s.id);
            setSurveys(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'verified' } : s));
        } catch (error) {
            toast.error(error.message || 'Gagal memverifikasi semua survey');
            loadSurveys(); // Reload to be safe
        }
    };

    useEffect(() => {
        let result = [...surveys];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (s) =>
                    String(s.employee_name || '').toLowerCase().includes(q) ||
                    String(s.surveyor_name || '').toLowerCase().includes(q) ||
                    String(s.employee_nik || '').toLowerCase().includes(q)
            );
        }
        if (filterStatus !== 'all') {
            result = result.filter((s) => s.status === filterStatus);
        }

        result.sort((a, b) => {
            let valA, valB;
            if (sortField === 'employee') {
                valA = String(a.employee_name || '').toLowerCase();
                valB = String(b.employee_name || '').toLowerCase();
            } else if (sortField === 'surveyor') {
                valA = String(a.surveyor_name || '').toLowerCase();
                valB = String(b.surveyor_name || '').toLowerCase();
            } else if (sortField === 'status') {
                valA = String(a.status || '').toLowerCase();
                valB = String(b.status || '').toLowerCase();
            } else {
                // default date/time sorting falls to created_at
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFiltered(result);
    }, [search, filterStatus, surveys, sortField, sortDirection]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'date' ? 'desc' : 'asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
        return <span style={{ color: 'var(--accent)', marginLeft: 4, fontWeight: 'bold' }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };

    const counts = {
        all: surveys.length,
        verified: surveys.filter(s => s.status === 'verified').length,
        saved: surveys.filter(s => s.status === 'saved').length,
        draft: surveys.filter(s => s.status === 'draft').length,
        synced: surveys.filter(s => s.status === 'synced').length,
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getAvatarColorClass = (index) => {
        const colors = ['av-blue', 'av-teal', 'av-purple', 'av-amber', 'av-pink', 'av-green'];
        return colors[index % colors.length];
    };

    return (
        <div className="history-container">
            {/* PAGE HEADER */}
            <div className="page-header">
                <div className="page-title">
                    <h1>Riwayat Survey</h1>
                    <p>{surveys.length} entri tercatat · Diperbarui baru saja</p>
                </div>
                <Link to="/survey/new" className="add-btn">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah Survey
                </Link>
            </div>

            {/* STATS */}
            <div className="stats-grid">
                <div className="stat-card blue">
                    <div className="stat-icon-box"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                    <div className="stat-value">{counts.all}</div>
                    <div className="stat-label">Total Survey</div>
                    <div className="stat-badge">All</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon-box"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                    <div className="stat-value">{counts.verified}</div>
                    <div className="stat-label">Terverifikasi</div>
                    <div className="stat-badge">+{counts.verified}</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon-box"><svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></div>
                    <div className="stat-value">{counts.saved}</div>
                    <div className="stat-label">Tersimpan</div>
                    <div className="stat-badge">Draft/Saved</div>
                </div>
                <div className="stat-card teal">
                    <div className="stat-icon-box"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></div>
                    <div className="stat-value">{counts.synced}</div>
                    <div className="stat-label">Synced</div>
                    <div className="stat-badge">Live</div>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="toolbar">
                <div className="search-wrap">
                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input 
                        className="search-input" 
                        type="text" 
                        placeholder="Cari nama karyawan, NIK, atau surveyor..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <button className="filter-btn" onClick={() => setShowFilter(!showFilter)}>
                        <svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        Filter <span style={{display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#3d8ef8', marginLeft: '4px'}}></span>
                    </button>
                    {showFilter && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10, minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                            <i>Gunakan klik langsung pada judul kolom tabel (Karyawan, Tanggal, dll) di bawah untuk memfilter urutan.</i>
                        </div>
                    )}
                </div>
                <button className="filter-btn">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    Ekspor
                </button>

                {filterStatus === 'synced' && filtered.length > 0 && (user?.role === 'master' || user?.role === 'admin') && (
                    <button className="verify-all-btn" onClick={handleVerifyAll}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Verifikasi Semua
                    </button>
                )}
            </div>

            {/* TABS */}
            <div className="survey-tabs">
                {[
                    { key: 'all', label: 'Semua', count: counts.all },
                    { key: 'draft', label: 'Draft', count: counts.draft },
                    { key: 'saved', label: 'Tersimpan', count: counts.saved },
                    { key: 'synced', label: 'Synced', count: counts.synced },
                    { key: 'verified', label: 'Terverifikasi', count: counts.verified },
                ].map(tab => (
                    <button 
                        key={tab.key}
                        className={`tab ${filterStatus === tab.key ? 'active' : ''}`}
                        onClick={() => setFilterStatus(tab.key)}
                    >
                        {tab.label} <span className="tab-count">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* LIST HEADER */}
            <div className="list-header">
                <button onClick={() => handleSort('employee')} className="sort-header">
                    Karyawan {getSortIcon('employee')}
                </button>
                <button onClick={() => handleSort('date')} className="sort-header">
                    Tanggal {getSortIcon('date')}
                </button>
                <button onClick={() => handleSort('date')} className="sort-header">
                    Waktu {getSortIcon('date')}
                </button>
                <button onClick={() => handleSort('surveyor')} className="sort-header">
                    Surveyor {getSortIcon('surveyor')}
                </button>
                <button onClick={() => handleSort('status')} className="sort-header" style={{textAlign: 'right', justifyContent: 'flex-end'}}>
                    {getSortIcon('status')} Status
                </button>
            </div>

            {/* SURVEY LIST */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Tidak ada survey yang ditemukan.
                </div>
            ) : (
                <div className="survey-list-new">
                    {filtered.map((s, index) => {
                        const isVerified = s.status === 'verified';
                        const isSaved = s.status === 'saved';
                        const isSynced = s.status === 'synced';
                        const isDraft = s.status === 'draft';
                        
                        let cardClass = '';
                        let badgeClass = '';
                        let badgeLabel = '';
                        
                        if (isVerified) {
                            cardClass = 'verified'; badgeClass = 'badge-verified-new'; badgeLabel = 'Verified';
                        } else if (isSaved) {
                            cardClass = 'saved'; badgeClass = 'badge-saved-new'; badgeLabel = 'Saved';
                        } else if (isSynced) {
                            cardClass = 'synced'; badgeClass = 'badge-synced-new'; badgeLabel = 'Synced';
                        } else {
                            cardClass = 'draft'; badgeClass = 'badge-draft-new'; badgeLabel = 'Draft';
                        }

                        const dateObj = new Date(s.created_at);
                        const avatarClass = getAvatarColorClass(index);

                        return (
                            <Link to={`/detail/${s.id}`} key={s.id} className={`survey-card ${cardClass}`}>
                                <div className="person-col">
                                    <div className={`avatar ${avatarClass}`}>{getInitials(s.employee_name)}</div>
                                    <div>
                                        <div className="person-name">{s.employee_name || 'Unnamed'}</div>
                                        <div className="person-nik">NIK · {s.employee_nik || '-'}</div>
                                    </div>
                                </div>
                                <div className="date-col">
                                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    {dateObj.toLocaleDateString('id-ID')}
                                </div>
                                <div className="time-col">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    {dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                </div>
                                <div className="admin-col">
                                    <div className="admin-name">
                                        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        {s.surveyor_name || '-'}
                                    </div>
                                    {s.latitude && (
                                        <span className="gps-tag">
                                            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            GPS
                                        </span>
                                    )}
                                </div>
                                <div className="status-col">
                                    <span className={`status-badge ${badgeClass}`}><span className="dot"></span> {badgeLabel}</span>
                                    {isSynced && (user?.role === 'master' || user?.role === 'admin') && (
                                        <button 
                                            className="verify-btn-sm" 
                                            onClick={(e) => handleVerify(e, s.id)}
                                            title="Verifikasi Survey"
                                        >
                                            Verifikasi
                                        </button>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* FOOTER */}
            <div className="list-footer">
                <span>Menampilkan <strong>{filtered.length}</strong> dari <strong>{surveys.length}</strong> entri</span>
                <span>Terakhir diperbarui: {lastUpdated ? `${lastUpdated.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : '-'} · <strong>{lastUpdated ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong> WIB</span>
            </div>
        </div>
    );
}
