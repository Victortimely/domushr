import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/history.css';

export default function HistoryPage() {
    const [surveys, setSurveys] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [time, setTime] = useState(new Date());
    const [showFilter, setShowFilter] = useState(false);
    const [sort, setSort] = useState('newest');

    useEffect(() => {
        loadSurveys();
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    async function loadSurveys() {
        try {
            const all = await api.get('/surveys');
            setSurveys(all);
            setFiltered(all);
        } catch (error) {
            console.error('Failed to load surveys:', error);
        }
    }

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

        if (sort === 'newest') {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sort === 'oldest') {
            result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (sort === 'name_asc') {
            result.sort((a, b) => String(a.employee_name || '').localeCompare(String(b.employee_name || '')));
        } else if (sort === 'name_desc') {
            result.sort((a, b) => String(b.employee_name || '').localeCompare(String(a.employee_name || '')));
        }

        setFiltered(result);
    }, [search, filterStatus, surveys, sort]);

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
            {/* TOPBAR */}
            <div className="topbar">
                <div className="topbar-right">
                    <div className="date-pill">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <strong>{time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    </div>
                    <div className="time-badge">
                        <div className="pulse"></div>
                        <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span style={{color: 'rgba(16,217,180,0.6)', fontSize: '11px'}}>WIB</span>
                    </div>
                </div>
            </div>

            {/* PAGE HEADER */}
            <div className="page-header">
                <div className="page-title">
                    <h1>Riwayat <span>Survey</span></h1>
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
                        Filter {sort !== 'newest' && <span style={{display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#3d8ef8', marginLeft: '4px'}}></span>}
                    </button>
                    {showFilter && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            <button className={`tab ${sort === 'newest' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { setSort('newest'); setShowFilter(false); }}>Terbaru</button>
                            <button className={`tab ${sort === 'oldest' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { setSort('oldest'); setShowFilter(false); }}>Terlama</button>
                            <button className={`tab ${sort === 'name_asc' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { setSort('name_asc'); setShowFilter(false); }}>Nama A-Z</button>
                            <button className={`tab ${sort === 'name_desc' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => { setSort('name_desc'); setShowFilter(false); }}>Nama Z-A</button>
                        </div>
                    )}
                </div>
                <button className="filter-btn">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    Ekspor
                </button>
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
                <span>Karyawan</span>
                <span>Tanggal</span>
                <span>Waktu</span>
                <span>Surveyor</span>
                <span style={{textAlign: 'right'}}>Status</span>
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
                                    {dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}
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
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* FOOTER */}
            <div className="list-footer">
                <span>Menampilkan <strong>{filtered.length}</strong> dari <strong>{surveys.length}</strong> entri</span>
                <span>Terakhir diperbarui: {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · <strong>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong> WIB</span>
            </div>
        </div>
    );
}
