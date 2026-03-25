import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [regRequests, setRegRequests] = useState([]);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [tab, setTab] = useState('requests');
    const [deleteTarget, setDeleteTarget] = useState(null);

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

    const openResetModal = (u) => {
        setSelectedUser(u);
        setNewPassword('');
        setShowResetModal(true);
    };

    const handleReset = async () => {
        if (!newPassword.trim()) {
            toast.error('Password baru wajib diisi');
            return;
        }
        if (newPassword.trim().length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }
        try {
            // Find pending request for this user
            const pendingReq = requests.find(r => r.user_id === selectedUser.id && r.status === 'pending');
            if (pendingReq) {
                await api.post(`/admin/password-resets/${pendingReq.id}/approve`, { newPassword: newPassword.trim() });
            }
            toast.success(`Password untuk "${selectedUser.name}" berhasil direset`);
            setShowResetModal(false);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const confirmDeleteUser = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/admin/users/${deleteTarget.id}`);
            toast.success(`Akun "${deleteTarget.name}" berhasil dihapus`);
            setDeleteTarget(null);
            loadData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const approveRegistration = async (req) => {
        try {
            await api.post(`/admin/registrations/${req.id}/approve`);
            toast.success(`Akun "${req.name}" berhasil disetujui sebagai Surveyor`);
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

    const pendingResetCount = requests.filter(r => r.status === 'pending').length;
    const pendingRegCount = regRequests.filter(r => r.status === 'pending').length;

    if (user?.role !== 'master') {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔒</div>
                <div className="empty-state-title">Akses Ditolak</div>
                <p>Halaman ini hanya untuk Admin Master</p>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🛡️ Panel Admin Master</h1>
                <p className="page-subtitle">Kelola akun pengguna, reset password & permintaan registrasi</p>
            </div>

            {/* Tabs */}
            <div className="nav-tabs" style={{ marginBottom: 20 }}>
                <button className={`nav-tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
                    📨 Reset Password {pendingResetCount > 0 && <span className="badge badge-draft" style={{ marginLeft: 6 }}>{pendingResetCount}</span>}
                </button>
                <button className={`nav-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
                    👥 List User
                </button>
                <button className={`nav-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
                    📝 Permintaan Register {pendingRegCount > 0 && <span className="badge badge-draft" style={{ marginLeft: 6 }}>{pendingRegCount}</span>}
                </button>
            </div>

            {/* Tab: Password Reset Requests */}
            {tab === 'requests' && (
                <div>
                    {requests.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <div className="empty-state-title">Tidak Ada Permintaan</div>
                            <p>Belum ada permintaan reset password</p>
                        </div>
                    ) : (
                        <div className="survey-list">
                            {requests.map(req => (
                                <div key={req.id} className="survey-item" style={{ cursor: 'default' }}>
                                    <div className="survey-item-avatar" style={{
                                        background: req.status === 'pending' ? 'var(--gradient-3)' : 'var(--gradient-2)'
                                    }}>
                                        {req.status === 'pending' ? '⏳' : '✅'}
                                    </div>
                                    <div className="survey-item-info">
                                        <div className="survey-item-name">{req.userName}</div>
                                        <div className="survey-item-meta">
                                            <span>👤 {req.username}</span>
                                            <span>📅 {new Date(req.createdAt).toLocaleDateString('id-ID')}</span>
                                            <span>🕐 {new Date(req.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                        <span className={`badge ${req.status === 'pending' ? 'badge-draft' : 'badge-verified'}`}>
                                            {req.status === 'pending' ? '⏳ Pending' : '✅ Resolved'}
                                        </span>
                                        {req.status === 'pending' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => {
                                                    const u = users.find(u => u.id === req.userId);
                                                    if (u) openResetModal(u);
                                                    else toast.error('User tidak ditemukan');
                                                }}
                                            >
                                                🔑 Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: All Users */}
            {tab === 'users' && (
                <div className="survey-list">
                    {users.map(u => (
                        <div key={u.id} className="survey-item" style={{ cursor: 'default' }}>
                            <div className="survey-item-avatar" style={{ background: 'var(--gradient-1)' }}>
                                {u.name?.[0] || '?'}
                            </div>
                            <div className="survey-item-info">
                                <div className="survey-item-name">{u.name}</div>
                                <div className="survey-item-meta">
                                    <span>👤 {u.username}</span>
                                    <span>🏷️ {u.role}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openResetModal(u)}>
                                    🔑 Reset Password
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setDeleteTarget(u)}
                                    title="Hapus Akun"
                                    style={{ color: 'var(--danger)' }}
                                    id={`delete-user-${u.id}`}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Registration Requests */}
            {tab === 'register' && (
                <div>
                    {regRequests.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <div className="empty-state-title">Tidak Ada Permintaan</div>
                            <p>Belum ada permintaan registrasi baru</p>
                        </div>
                    ) : (
                        <div className="survey-list">
                            {regRequests.map(req => (
                                <div key={req.id} className="survey-item" style={{ cursor: 'default' }}>
                                    <div className="survey-item-avatar" style={{
                                        background: req.status === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : req.status === 'approved' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    }}>
                                        {req.status === 'pending' ? '⏳' : req.status === 'approved' ? '✅' : '❌'}
                                    </div>
                                    <div className="survey-item-info">
                                        <div className="survey-item-name">{req.name}</div>
                                        <div className="survey-item-meta">
                                            <span>👤 {req.username}</span>
                                            <span>📅 {new Date(req.createdAt).toLocaleDateString('id-ID')}</span>
                                            <span>🕐 {new Date(req.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                        {req.status === 'pending' ? (
                                            <>
                                                <button className="btn btn-success btn-sm" onClick={() => approveRegistration(req)}>
                                                    ✅ Setujui
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => rejectRegistration(req)}>
                                                    ❌ Tolak
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`badge ${req.status === 'approved' ? 'badge-verified' : 'badge-draft'}`} style={req.status === 'rejected' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : {}}>
                                                {req.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <h3 style={{ marginBottom: 16 }}>🔑 Reset Password</h3>
                        <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>User:</div>
                            <div style={{ fontWeight: 600 }}>{selectedUser.name} ({selectedUser.username})</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password Baru <span className="required">*</span></label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Masukkan password baru (min. 5 karakter)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setShowResetModal(false)} style={{ flex: 1 }}>Batal</button>
                            <button className="btn btn-primary" onClick={handleReset} style={{ flex: 1 }}>✅ Reset Password</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
                            <h3 style={{ marginBottom: 8 }}>Hapus Akun User?</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>
                                Apakah Anda yakin ingin menghapus akun:
                            </p>
                            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                                <div style={{ fontWeight: 700 }}>{deleteTarget.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Username: {deleteTarget.username}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role: {deleteTarget.role}</div>
                            </div>
                            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: 20 }}>
                                ⚠ Tindakan ini tidak bisa dibatalkan!
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>Batal</button>
                                <button className="btn btn-danger" onClick={confirmDeleteUser} style={{ flex: 1 }} id="confirm-delete-user-btn">
                                    🗑️ Ya, Hapus Akun
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
