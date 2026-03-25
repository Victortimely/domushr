import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function HistoryPage() {
    const [surveys, setSurveys] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadSurveys();
    }, []);

    async function loadSurveys() {
        const all = await api.get('/surveys');
        setSurveys(all);
        setFiltered(all);
    }

    useEffect(() => {
        let result = surveys;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (s) =>
                    s.employee_name?.toLowerCase().includes(q) ||
                    s.surveyor_name?.toLowerCase().includes(q) ||
                    s.employee_nik?.toLowerCase().includes(q)
            );
        }
        if (filterStatus !== 'all') {
            result = result.filter((s) => s.status === filterStatus);
        }
        setFiltered(result);
    }, [search, filterStatus, surveys]);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Riwayat Survey</h1>
                <p className="page-subtitle">{surveys.length} survey tercatat</p>
            </div>

            {/* Search */}
            <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                    id="search-input"
                    type="text"
                    placeholder="Cari nama karyawan, NIK, atau surveyor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Tabs */}
            <div className="nav-tabs">
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'draft', label: 'Draft' },
                    { key: 'saved', label: 'Tersimpan' },
                    { key: 'synced', label: 'Synced' },
                    { key: 'verified', label: 'Terverifikasi' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        className={`nav-tab ${filterStatus === tab.key ? 'active' : ''}`}
                        onClick={() => setFilterStatus(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">Tidak Ada Data</div>
                    <p>{search ? 'Coba ubah kata pencarian' : 'Belum ada survey'}</p>
                </div>
            ) : (
                <div className="survey-list">
                    {filtered.map((s) => (
                        <Link to={`/detail/${s.id}`} key={s.id} className="survey-item">
                            <div className="survey-item-avatar">
                                {s.employee_name?.[0] || '?'}
                            </div>
                            <div className="survey-item-info">
                                <div className="survey-item-name">{s.employee_name || 'Unnamed'}</div>
                                <div className="survey-item-meta">
                                    <span>📅 {new Date(s.created_at).toLocaleDateString('id-ID')}</span>
                                    <span>🕐 {new Date(s.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>👤 {s.surveyor_name}</span>
                                    {s.latitude && <span>📍 GPS</span>}
                                </div>
                            </div>
                            <span className={`badge badge-${s.status === 'draft' ? 'draft' : s.status === 'verified' ? 'verified' : 'saved'}`}>
                                {s.status === 'draft' ? '📝 Draft' : s.status === 'verified' ? '✅ Verified' : '💾 Saved'}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
