import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { seedDatabase } from './services/db';
import { startAutoSync, isOnline } from './services/syncService';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages — code-split for smaller initial bundle
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SurveyFormPage = lazy(() => import('./pages/SurveyFormPage'));
const SurveyDetailPage = lazy(() => import('./pages/SurveyDetailPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SurveyPlannerPage = lazy(() => import('./pages/SurveyPlannerPage'));

// Lazy loading fallback
function PageLoader() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
    );
}


function LiveClock() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="live-clock-bar" style={{ flex: 1, marginBottom: 0 }}>
                <div className="live-clock-date">
                    📅 {dayName}, {date} {month} {year}
                </div>
                <div className="live-clock-time">
                    🕐 {hours}:{minutes}:{seconds} WIB
                </div>
            </div>
            <div 
                style={{ 
                    background: 'rgba(139,92,246,0.15)', 
                    color: '#a78bfa', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    padding: '10px 20px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(139,92,246,0.3)',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                ● Terhubung
            </div>
        </div>
    );
}

function AppContent() {
    const { user, loading, logout, loggingOut, updateUsername, updateName } = useAuth();
    const toast = useToast();
    const [online, setOnline] = useState(isOnline());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editName, setEditName] = useState('');

    useEffect(() => {
        seedDatabase();
        startAutoSync();
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const openProfileModal = () => {
        setEditUsername(user?.username || '');
        setEditName(user?.name || '');
        setShowProfileModal(true);
    };

    const handleSaveProfile = async () => {
        try {
            if (editUsername.trim() && editUsername.trim() !== user.username) {
                await updateUsername(editUsername.trim());
            }
            if (editName.trim() && editName.trim() !== user.name) {
                await updateName(editName.trim());
            }
            toast.success('Profil berhasil diperbarui');
            setShowProfileModal(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (loading) {
        return (
            <div className="loading-page">
                <div className="spinner" style={{ width: 40, height: 40 }} />
                <p>Memuat aplikasi...</p>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const menuItems = [
        { to: '/', icon: '📊', label: 'Dashboard', end: true },
        { to: '/survey/new', icon: '➕', label: 'Survey Baru' },
        { to: '/planner', icon: '🗺️', label: 'Survey Planner' },
        { to: '/employees', icon: '👥', label: 'Karyawan' },
        { to: '/history', icon: '🕐', label: 'Riwayat' },
    ];

    if (user?.role === 'master' || user?.role === 'admin') {
        menuItems.splice(4, 0, { to: '/import', icon: '📥', label: 'Import' });
        // Ensure Admin is always last if master
        if (user?.role === 'master') {
            menuItems.push({ to: '/admin', icon: '🛡️', label: 'Admin' });
        }
    }

    return (
        <div className={`app-layout has-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Left Sidebar */}
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="logo-icon">📋</div>
                        {!sidebarCollapsed && <span className="logo-text">DomusHR</span>}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Buka menu' : 'Tutup menu'}
                    >
                        {sidebarCollapsed ? '▶' : '◀'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            title={sidebarCollapsed ? item.label : undefined}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="sidebar-footer">
                    <div className="sidebar-status">
                        <div className={`online-dot ${online ? 'online' : 'offline'}`} />
                        {!sidebarCollapsed && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {online ? 'Online' : 'Offline'}
                            </span>
                        )}
                    </div>
                    <button
                        className="sidebar-nav-item sidebar-user-btn"
                        onClick={openProfileModal}
                        title={sidebarCollapsed ? user?.name : undefined}
                    >
                        <span className="sidebar-icon">👤</span>
                        {!sidebarCollapsed && (
                            <span className="sidebar-label" style={{ fontSize: '0.8rem' }}>
                                {user?.name?.split(' ')[0]}
                            </span>
                        )}
                    </button>
                    <button
                        className="sidebar-nav-item sidebar-logout-btn"
                        onClick={logout}
                        title={sidebarCollapsed ? 'Logout' : undefined}
                    >
                        <span className="sidebar-icon">↩️</span>
                        {!sidebarCollapsed && <span className="sidebar-label">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="app-main">
                <LiveClock />
                <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/survey/new" element={<SurveyFormPage />} />
                    <Route path="/survey/:id" element={<SurveyFormPage />} />
                    <Route path="/detail/:id" element={<SurveyDetailPage />} />
                    <Route path="/planner" element={<SurveyPlannerPage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/import" element={<ImportPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
            </main>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <h3 style={{ marginBottom: 20 }}>👤 Edit Profil</h3>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input className="form-input" type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username baru" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nama Lengkap</label>
                            <input className="form-input" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama lengkap" />
                        </div>
                        <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            🏷️ Role: <strong style={{ color: 'var(--text-secondary)' }}>{user?.role}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)} style={{ flex: 1 }}>Batal</button>
                            <button className="btn btn-primary" onClick={handleSaveProfile} style={{ flex: 1 }}>💾 Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Overlay */}
            {loggingOut && (
                <div className="logout-overlay">
                    <div className="logout-overlay-content">
                        <div className="logout-icon-wrap">
                            <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </div>
                        <div className="logout-spinner-ring"></div>
                        <p className="logout-text">Keluar dari akun...</p>
                        <p className="logout-subtext">Sampai jumpa kembali 👋</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <AppContent />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
