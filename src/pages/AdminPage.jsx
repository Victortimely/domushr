import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/admin.css';

export default function AdminPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [regRequests, setRegRequests] = useState([]);

    const [resetUid, setResetUid] = useState('');
    const [resetPwd, setResetPwd] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');

    const [tab, setTab] = useState('overview');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const allRequests = await api.get('/admin/password-resets');
            setRequests(allRequests);
            const allUsers = await api.get('/admin/users');
            setUsers(allUsers.filter(u => u.role !== 'master'));
            const allRegRequests = await api.get('/admin/registrations');
            setRegRequests(allRegRequests);
        } catch (err) {
            console.error('Load admin data error:', err);
        }
    }

    const confirmDeleteUser = async (u) => {
        if (!window.confirm(`Yakin ingin menghapus akun ${u.name}?`)) return;
        try {
            await api.delete(`/admin/users/${u.id}`);
            toast.success(`Akun "${u.name}" berhasil dihapus`);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const approveRegistration = async (req) => {
        try {
            await api.post(`/admin/registrations/${req.id}/approve`);
            toast.success(`Akun "${req.name}" disetujui`);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const rejectRegistration = async (req) => {
        try {
            await api.post(`/admin/registrations/${req.id}/reject`);
            toast.success(`Pendaftaran "${req.name}" ditolak`);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const doReset = async () => {
        if (!resetUid || !resetPwd || !resetConfirm) {
            toast.error('Harap isi semua kolom.');
            return;
        }
        if (resetPwd !== resetConfirm) {
            toast.error('Password tidak cocok.');
            return;
        }
        if (resetPwd.length < 8) {
            toast.error('Password minimal 8 karakter.');
            return;
        }
        try {
            // Find user by username
            const targetUser = users.find(u => u.username === resetUid);
            if (!targetUser) {
                toast.error('User ID tidak ditemukan');
                return;
            }
            // Check if there's a pending request
            const pendingReq = requests.find(r => r.user_id === targetUser.id && r.status === 'pending');
            if (pendingReq) {
                await api.post(`/admin/password-resets/${pendingReq.id}/approve`, { newPassword: resetPwd });
            } else {
                // If no request, we simulate resetting if backend allowed it, for now show success UI
                toast.error('Reset manual langsung belum didukung API, gunakan persetujuan Request.');
                return;
            }
            toast.success(`Password untuk User ID ${resetUid} berhasil direset.`);
            setResetUid(''); setResetPwd(''); setResetConfirm('');
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const clearPwd = () => {
        setResetUid(''); setResetPwd(''); setResetConfirm('');
    };

    const { s1, s2, s3 } = useMemo(() => {
        let s1Str = '', s2Str = '', s3Str = '';
        for (let i = 0; i < 200; i++) {
            const x = Math.floor(Math.random() * 950), y = Math.floor(Math.random() * 780);
            const op = (Math.random() * 0.4 + 0.15).toFixed(2);
            s1Str += (i > 0 ? ', ' : '') + `${x}px ${y}px 0 0 rgba(255,255,255,${op})`;
        }
        for (let j = 0; j < 55; j++) {
            const x = Math.floor(Math.random() * 950), y = Math.floor(Math.random() * 780);
            const op = (Math.random() * 0.5 + 0.2).toFixed(2);
            s2Str += (j > 0 ? ', ' : '') + `${x}px ${y}px 0 0 rgba(255,255,255,${op})`;
        }
        for (let k = 0; k < 18; k++) {
            const x = Math.floor(Math.random() * 950), y = Math.floor(Math.random() * 780);
            s3Str += (k > 0 ? ', ' : '') + `${x}px ${y}px 1px 1px rgba(255,255,255,0.7)`;
        }
        return { s1: s1Str, s2: s2Str, s3: s3Str };
    }, []);

    const recentActivities = useMemo(() => {
        const activities = [];
        regRequests.forEach(req => {
            activities.push({
                id: `reg-${req.id}`,
                name: req.name,
                initials: req.name?.[0] || '?',
                activity: 'Pembuatan Akun (' + (req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Disetujui' : 'Ditolak') + ')',
                time: req.created_at ? new Date(req.created_at).toLocaleString('id-ID') : 'Baru saja',
                status: req.status === 'approved' ? 'b-approved' : req.status === 'rejected' ? 'b-rejected' : 'b-pending',
                statusLabel: req.status === 'approved' ? 'Berhasil' : req.status === 'rejected' ? 'Ditolak' : 'Menunggu',
                timestamp: req.created_at ? new Date(req.created_at).getTime() : Date.now()
            });
        });
        requests.forEach(req => {
            activities.push({
                id: `pwd-${req.id}`,
                name: req.userName || 'User',
                initials: req.userName?.[0] || '?',
                activity: 'Reset Password',
                time: req.created_at ? new Date(req.created_at).toLocaleString('id-ID') : 'Baru saja',
                status: req.status === 'resolved' ? 'b-approved' : 'b-pending',
                statusLabel: req.status === 'resolved' ? 'Berhasil' : 'Menunggu',
                timestamp: req.created_at ? new Date(req.created_at).getTime() : Date.now()
            });
        });
        return activities.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);
    }, [regRequests, requests]);

    if (user?.role !== 'master') {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔒</div>
                <div className="empty-state-title">Akses Ditolak</div>
                <p>Halaman ini hanya untuk Admin Master</p>
            </div>
        );
    }

    const pendingResetCount = requests.filter(r => r.status === 'pending').length;
    const pendingRegCount = regRequests.filter(r => r.status === 'pending').length;
    const activeUsers = users.length; // all non-master users we fetched are active for now

    return (
        <div className="admin-universe">
            <div id="s1" style={{ boxShadow: s1 }}></div>
            <div id="s2" style={{ boxShadow: s2 }}></div>
            <div id="s3" style={{ boxShadow: s3 }}></div>

            <div className="meteor" style={{ top: '6%', left: '78%', animationDuration: '5s', animationDelay: '0s' }}></div>
            <div className="meteor" style={{ top: '20%', left: '62%', animationDuration: '7.5s', animationDelay: '2s' }}></div>
            <div className="meteor" style={{ top: '4%', left: '45%', animationDuration: '4.5s', animationDelay: '5s' }}></div>
            <div className="meteor" style={{ top: '38%', left: '88%', animationDuration: '6s', animationDelay: '1.2s' }}></div>

            <div className="sp-nav">
                <div className="logo-mark">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1.5L2.5 4v4.5C2.5 11.5 5 14 8 15c3-1 5.5-3.5 5.5-6.5V4L8 1.5z" fill="#ffffff" opacity=".95"/>
                        <path d="M5.5 8.5L7 10l3.5-3.5" stroke="var(--purple, #8b5cf6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className="logo-info" style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Admin Master <span style={{ color: 'var(--purple, #8b5cf6)' }}>Panel</span>
                    </h1>
                </div>
                <div className="sp-nav-items" style={{ marginLeft: '2rem' }}>
                    <button className={`sp-nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Ringkasan</button>
                    <button className={`sp-nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>List User ID</button>
                    <button className={`sp-nav-item ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
                        Ganti Password {pendingResetCount > 0 && <span className="badge b-pending" style={{marginLeft: 6}}>{pendingResetCount}</span>}
                    </button>
                    <button className={`sp-nav-item ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
                        Permintaan Akun {pendingRegCount > 0 && <span className="badge b-pending" style={{marginLeft: 6}}>{pendingRegCount}</span>}
                    </button>
                </div>
                <div className="adm-right">
                    {/* AVATAR REMOVED PER USER REQUEST */}
                </div>
            </div>

            <div className="sp-body">
                {/* RINGKASAN SECTION */}
                {tab === 'overview' && (
                    <div className="section active">
                        <div className="sp-page-hdr">
                            <h2>Ringkasan Sistem</h2>
                            <p>Pantau status dan aktivitas user secara keseluruhan.</p>
                        </div>
                        <div className="sp-stats-row">
                            <div className="sp-stat-card">
                                <div className="sp-stat-lbl">Total User Aktif</div>
                                <div className="sp-stat-val">{activeUsers}</div>
                                <div className="sp-stat-note">User terdaftar</div>
                            </div>
                            <div className="sp-stat-card">
                                <div className="sp-stat-lbl">Permintaan Pending</div>
                                <div className="sp-stat-val">{pendingRegCount + pendingResetCount}</div>
                                <div className="sp-stat-note warn">Perlu ditinjau</div>
                            </div>
                            <div className="sp-stat-card">
                                <div className="sp-stat-lbl">Password Requests</div>
                                <div className="sp-stat-val">{pendingResetCount}</div>
                                <div className="sp-stat-note">Menunggu reset</div>
                            </div>
                        </div>
                        <div className="sp-tbl-wrap">
                            <div className="sp-tbl-head">
                                <span className="sp-tbl-title">Aktivitas Terkini</span>
                                <span className="sp-tbl-meta">{recentActivities.length} entri</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>USER</th>
                                        <th>AKTIVITAS</th>
                                        <th>WAKTU</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentActivities.length === 0 ? (
                                        <tr><td colSpan="4">Belum ada aktivitas tercatat</td></tr>
                                    ) : (
                                        recentActivities.map(act => (
                                            <tr key={act.id}>
                                                <td>
                                                    <div className="uid-cell">
                                                        <div className="uid-av" style={{ background: 'var(--purple)', color: '#fff', border: 'none' }}>{act.initials}</div>
                                                        {act.name}
                                                    </div>
                                                </td>
                                                <td>{act.activity}</td>
                                                <td style={{ color: 'rgba(255,255,255,.5)' }}>{act.time}</td>
                                                <td><span className={`sp-badge ${act.status}`}>{act.statusLabel}</span></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* LIST USER ID */}
                {tab === 'users' && (
                    <div className="section active">
                        <div className="sp-page-hdr">
                            <h2>List User ID</h2>
                            <p>Kelola semua akun pengguna yang terdaftar dalam sistem.</p>
                        </div>
                        <div className="sp-tbl-wrap">
                            <div className="sp-tbl-head">
                                <span className="sp-tbl-title">Semua Pengguna</span>
                                <span className="sp-tbl-meta">{users.length} user</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>NO</th>
                                        <th>ROLE / USERNAME</th>
                                        <th>NAMA LENGKAP</th>
                                        <th>STATUS</th>
                                        <th>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr><td colSpan="5">Belum ada pengguna teregistrasi</td></tr>
                                    ) : (
                                        users.map((u, i) => (
                                            <tr key={u.id}>
                                                <td style={{ color: 'rgba(255,255,255,.5)' }}>{i + 1}</td>
                                                <td>
                                                    <div className="uid-code" style={{ marginBottom: 4 }}>{u.username}</div>
                                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{u.role.toUpperCase()}</div>
                                                </td>
                                                <td>
                                                    <div className="uid-cell">
                                                        <div className="uid-av">{u.name?.[0] || '?'}</div>
                                                        {u.name}
                                                    </div>
                                                </td>
                                                <td><span className="sp-badge b-active">Aktif</span></td>
                                                <td>
                                                    <button className="ab ar" onClick={() => confirmDeleteUser(u)}>Hapus</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* GANTI PASSWORD (PASSWORD RESET REQUESTS & MANUAL) */}
                {tab === 'password' && (
                    <div className="section active">
                        <div className="sp-page-hdr">
                            <h2>Ganti Password User</h2>
                            <p>Tinjau permintaan reset password dari user atau eksekusi reset manual.</p>
                        </div>

                        {/* Requests Table */}
                        <div className="sp-tbl-wrap" style={{ marginBottom: '2rem' }}>
                            <div className="sp-tbl-head">
                                <span className="sp-tbl-title">Permintaan Reset Password</span>
                                <span className="sp-tbl-meta">{pendingResetCount} pending</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>USER</th>
                                        <th>WAKTU REQUEST</th>
                                        <th>STATUS</th>
                                        <th>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.length === 0 ? (
                                        <tr><td colSpan="4">Tidak ada permintaan reset tertunda</td></tr>
                                    ) : (
                                        requests.map(req => (
                                            <tr key={req.id}>
                                                <td>
                                                    <div className="uid-cell">
                                                        <div className="uid-av" style={req.status === 'pending' ? { background: 'var(--amber)', color: '#fff' } : {}}>{req.userName?.[0] || '?'}</div>
                                                        {req.userName} ({req.username})
                                                    </div>
                                                </td>
                                                <td style={{ color: 'rgba(255,255,255,.5)' }}>{new Date(req.createdAt).toLocaleString('id-ID')}</td>
                                                <td>
                                                    <span className={`sp-badge ${req.status === 'pending' ? 'b-pending' : 'b-approved'}`}>
                                                        {req.status === 'pending' ? 'Menunggu' : 'Resolved'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {req.status === 'pending' && (
                                                        <button className="ab ap" onClick={() => setResetUid(req.username)}>Proses ID Ini</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Reset Form */}
                        <div className="sp-form-grid">
                            <div className="sp-form-card">
                                <h3>Eksekusi Reset Password</h3>
                                <div className="fg">
                                    <label className="fl">Username (User ID)</label>
                                    <select className="sp-input" value={resetUid} onChange={e => setResetUid(e.target.value)} style={{ appearance: 'auto' }}>
                                        <option value="" style={{ background: '#070511' }}>Pilih User...</option>
                                        {users.map(u => (
                                            <option key={u.username} value={u.username} style={{ background: '#070511' }}>
                                                {u.username} ({u.name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="fg">
                                    <label className="fl">Password Baru</label>
                                    <input className="sp-input" type="password" placeholder="Minimal 8 karakter" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
                                </div>
                                <div className="fg">
                                    <label className="fl">Konfirmasi Password</label>
                                    <input className="sp-input" type="password" placeholder="Ulangi password baru" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem' }}>
                                    <button className="sp-btn-primary" onClick={doReset}>Reset Password</button>
                                    <button className="sp-btn-sec" onClick={clearPwd}>Batal</button>
                                </div>
                            </div>
                            <div className="sp-form-card">
                                <h3>Panduan Keamanan</h3>
                                <div className="guide-item">
                                    <span className="guide-num">01</span>
                                    <span className="guide-text">Isi User ID sesuai dengan tabel permintaan di atas, dan setujui penggantian password.</span>
                                </div>
                                <div className="guide-item">
                                    <span className="guide-num">02</span>
                                    <span className="guide-text">Gunakan minimal 8 karakter. Hindari pola umum seperti 12345678.</span>
                                </div>
                                <div className="guide-item">
                                    <span className="guide-num">03</span>
                                    <span className="guide-text">User akan menggunakan password baru ini untuk login berikutnya.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PERMINTAAN AKUN */}
                {tab === 'requests' && (
                    <div className="section active">
                        <div className="sp-page-hdr">
                            <h2>Permintaan Buat Akun</h2>
                            <p>Tinjau dan putuskan permintaan pembuatan akun dari pengguna baru.</p>
                        </div>
                        <div className="sp-tbl-wrap">
                            <div className="sp-tbl-head">
                                <span className="sp-tbl-title">Daftar Permintaan</span>
                                <span className="sp-badge b-pending">{pendingRegCount} pending</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>NAMA</th>
                                        <th>USERNAME</th>
                                        <th>TANGGAL PENGUMPULAN</th>
                                        <th>STATUS</th>
                                        <th>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {regRequests.length === 0 ? (
                                        <tr><td colSpan="5">Belum ada permintaan registrasi baru</td></tr>
                                    ) : (
                                        regRequests.map(req => (
                                            <tr key={req.id}>
                                                <td>
                                                    <div className="uid-cell">
                                                        <div className="uid-av" style={req.status === 'pending' ? { background: 'var(--amber)', color: '#fff' } : req.status === 'rejected' ? { background: 'var(--danger)', color: '#fff'} : { background: 'var(--success)', color: '#fff' }}>{req.name?.[0] || '?'}</div>
                                                        {req.name}
                                                    </div>
                                                </td>
                                                <td style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>{req.username}</td>
                                                <td style={{ color: 'rgba(255,255,255,.5)' }}>{new Date(req.createdAt).toLocaleString('id-ID')}</td>
                                                <td>
                                                    <span className={`sp-badge ${req.status === 'pending' ? 'b-pending' : req.status === 'approved' ? 'b-approved' : 'b-rejected'}`}>
                                                        {req.status === 'pending' ? 'Menunggu' : req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {req.status === 'pending' ? (
                                                        <>
                                                            <button className="ab ap" onClick={() => approveRegistration(req)}>Setujui</button>
                                                            <button className="ab ar" onClick={() => rejectRegistration(req)}>Tolak</button>
                                                        </>
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Selesai diproses</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
