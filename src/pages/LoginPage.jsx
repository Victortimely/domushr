import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BG_IMAGES = [
    '/backgrounds/bg1.jpg',
    '/backgrounds/bg2.png',
    '/backgrounds/bg3.jpg',
    '/backgrounds/bg4.jpg',
    '/backgrounds/bg5.png',
];

export default function LoginPage() {
    const { login } = useAuth();
    const bgImage = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [forgotUsername, setForgotUsername] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotError, setForgotError] = useState('');

    // Register state
    const [regName, setRegName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState(false);
    const [regLoading, setRegLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotClick = () => {
        setShowForgot(true);
        setShowConfirm(false);
        setForgotSuccess(false);
        setForgotError('');
        setForgotUsername('');
    };

    const handleConfirmYes = () => {
        setShowConfirm(true);
    };

    const handleSubmitForgot = async () => {
        setForgotError('');
        if (!forgotUsername.trim()) {
            setForgotError('Masukkan username Anda');
            return;
        }
        try {
            await api.requestPasswordReset(forgotUsername.trim());
            setForgotSuccess(true);
        } catch (err) {
            setForgotError(err.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError('');
        if (!regName.trim() || !regUsername.trim() || !regPassword.trim()) {
            setRegError('Semua field wajib diisi');
            return;
        }
        if (regPassword.trim().length < 6) {
            setRegError('Password minimal 6 karakter');
            return;
        }
        setRegLoading(true);
        try {
            await api.register(regName.trim(), regUsername.trim(), regPassword.trim());
            setRegSuccess(true);
        } catch (err) {
            setRegError(err.message);
        } finally {
            setRegLoading(false);
        }
    };

    const switchToLogin = () => {
        setMode('login');
        setRegError('');
        setRegSuccess(false);
        setRegName('');
        setRegUsername('');
        setRegPassword('');
    };

    const switchToRegister = () => {
        setMode('register');
        setError('');
    };

    return (
        <div className="login-page-split">
            {/* Full-screen background image */}
            <div className="login-bg-image" style={{ backgroundImage: `url(${bgImage})` }} />
            <div className="login-bg-overlay" />

            {/* Left Panel - Branding with animated background */}
            <div className="login-brand-panel">
                <div className="login-brand-bg">
                    <div className="login-brand-circle c1" />
                    <div className="login-brand-circle c2" />
                    <div className="login-brand-circle c3" />
                    <div className="login-brand-circle c4" />
                </div>
                <div className="login-brand-content">
                    <div className="login-brand-logo">📋</div>
                    <h1 className="login-brand-title">DomusHR</h1>
                    <p className="login-brand-subtitle">Aplikasi Survey Rumah Karyawan</p>
                    <div className="login-brand-features">
                        <div className="login-brand-feature">
                            <span>📡</span> GPS Tracking
                        </div>
                        <div className="login-brand-feature">
                            <span>📷</span> Dokumentasi Foto
                        </div>
                        <div className="login-brand-feature">
                            <span>✍️</span> Tanda Tangan Digital
                        </div>
                        <div className="login-brand-feature">
                            <span>📊</span> Laporan Otomatis
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="login-form-panel">
                <div className="login-form-wrapper">
                    {mode === 'login' ? (
                        <>
                            <div className="login-form-header">
                                <h2>Selamat Datang! 👋</h2>
                                <p>Masuk ke akun Anda untuk melanjutkan</p>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input
                                        id="login-username"
                                        className="form-input"
                                        type="text"
                                        placeholder="Masukkan username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input
                                        id="login-password"
                                        className="form-input"
                                        type="password"
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>

                                {error && <div className="form-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

                                <button id="login-submit" type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                                    {loading ? <span className="spinner" /> : '🔐'} Masuk
                                </button>
                            </form>

                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <button
                                    className="btn btn-ghost"
                                    onClick={handleForgotClick}
                                    style={{ color: 'var(--accent)', fontSize: '0.85rem' }}
                                    id="forgot-password-btn"
                                >
                                    🔑 Lupa Password?
                                </button>
                            </div>

                            <div className="login-register-link">
                                <span>Tidak punya akun?</span>
                                <button className="btn btn-ghost" onClick={switchToRegister} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                    📝 Daftar
                                </button>
                            </div>


                        </>
                    ) : (
                        <>
                            <div className="login-form-header">
                                <h2>Daftar Akun Baru 📝</h2>
                                <p>Buat akun dan tunggu persetujuan Admin</p>
                            </div>

                            {regSuccess ? (
                                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                    <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
                                    <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Pendaftaran Terkirim!</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                                        Permintaan pendaftaran Anda telah dikirim ke Admin Master. Silakan tunggu persetujuan sebelum login.
                                    </p>
                                    <button className="btn btn-primary" onClick={switchToLogin}>
                                        ← Kembali ke Login
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleRegister}>
                                    <div className="form-group">
                                        <label className="form-label">Nama Lengkap <span className="required">*</span></label>
                                        <input
                                            className="form-input"
                                            type="text"
                                            placeholder="Masukkan nama lengkap"
                                            value={regName}
                                            onChange={(e) => setRegName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Username <span className="required">*</span></label>
                                        <input
                                            className="form-input"
                                            type="text"
                                            placeholder="Pilih username"
                                            value={regUsername}
                                            onChange={(e) => setRegUsername(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Password <span className="required">*</span></label>
                                        <input
                                            className="form-input"
                                            type="password"
                                            placeholder="Minimal 5 karakter"
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {regError && <div className="form-error" style={{ marginBottom: 16 }}>⚠ {regError}</div>}

                                    <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={regLoading}>
                                        {regLoading ? <span className="spinner" /> : '📨'} Kirim Pendaftaran
                                    </button>
                                </form>
                            )}

                            {!regSuccess && (
                                <div className="login-register-link">
                                    <span>Sudah punya akun?</span>
                                    <button className="btn btn-ghost" onClick={switchToLogin} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                        🔐 Masuk
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="modal-overlay" onClick={() => setShowForgot(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        {forgotSuccess ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                                <h3 style={{ marginBottom: 8 }}>Keluhan Terkirim!</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                                    Permintaan reset password Anda telah dikirim ke Admin. Silakan hubungi Admin Vetting untuk proses selanjutnya.
                                </p>
                                <button className="btn btn-primary" onClick={() => setShowForgot(false)}>Tutup</button>
                            </div>
                        ) : !showConfirm ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📨</div>
                                <h3 style={{ marginBottom: 12 }}>Kirimkan Keluhan</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                                    Apakah Anda ingin mengirimkan permintaan reset password ke Admin?
                                </p>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button className="btn btn-primary" onClick={handleConfirmYes} style={{ minWidth: 100 }}>
                                        ✅ Ya
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setShowForgot(false)} style={{ minWidth: 100 }}>
                                        ❌ Tidak
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ marginBottom: 16, textAlign: 'center' }}>🔑 Reset Password</h3>
                                <div className="form-group">
                                    <label className="form-label">Masukkan Username Anda</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Username yang terdaftar"
                                        value={forgotUsername}
                                        onChange={(e) => setForgotUsername(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                {forgotError && <div className="form-error" style={{ marginBottom: 12 }}>⚠ {forgotError}</div>}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={() => setShowForgot(false)} style={{ flex: 1 }}>Batal</button>
                                    <button className="btn btn-primary" onClick={handleSubmitForgot} style={{ flex: 1 }}>📨 Kirim</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
