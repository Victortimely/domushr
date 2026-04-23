import { useMemo, useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';

const BG_IMAGES = [
    '/backgrounds/bg1.jpg',
    '/backgrounds/bg2.png',
    '/backgrounds/bg3.jpg',
    '/backgrounds/bg4.jpg',
    '/backgrounds/bg5.png',
];

export default function LoginPage() {
    usePageMeta('Login', 'Masuk ke DomusHR — platform survey dan vetting karyawan berbasis web.');
    const { loginWithGithub, loginWithGoogle, loginWithEmail, signUpWithEmail } = useAuth();
    const bgImage = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);
    
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleOAuthLogin = async (provider) => {
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            if (provider === 'github') await loginWithGithub();
            if (provider === 'google') await loginWithGoogle();
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        
        try {
            if (isSignUp) {
                if (!fullName.trim()) throw new Error('Nama Lengkap harus diisi');
                await signUpWithEmail(email, password, fullName);
                setSuccessMsg('Akun berhasil dibuat! Silakan cek email Anda untuk tautan verifikasi sebelum masuk.');
                // Optionally switch back to login mode
                // setIsSignUp(false);
                // setPassword('');
            } else {
                await loginWithEmail(email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-split">
            <div className="login-bg-image" style={{ backgroundImage: `url(${bgImage})` }} />
            <div className="login-bg-overlay" />

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
                        <div className="login-brand-feature"><span>📡</span> GPS Tracking</div>
                        <div className="login-brand-feature"><span>📷</span> Dokumentasi Foto</div>
                        <div className="login-brand-feature"><span>🗺️</span> Peta Sebaran Karyawan</div>
                        <div className="login-brand-feature"><span>📊</span> Laporan Otomatis</div>
                    </div>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="login-form-wrapper">
                    <div className="login-form-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h2>{isSignUp ? 'Buat Akun Baru 👋' : 'Selamat Datang! 👋'}</h2>
                        <p>{isSignUp ? 'Daftar untuk mengakses platform DomusHR.' : 'Masuk untuk melanjutkan ke DomusHR.'}</p>
                    </div>

                    {error && <div className="form-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
                    {successMsg && <div className="form-error" style={{ marginBottom: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981' }}>✅ {successMsg}</div>}

                    <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        {isSignUp && (
                            <div className="form-group">
                                <label className="form-label">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    placeholder="Masukkan nama lengkap" 
                                    required 
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input 
                                type="email" 
                                className="form-control" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="nama@email.com" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Minimal 6 karakter" 
                                required 
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? <span className="spinner" /> : (isSignUp ? 'Daftar Akun' : 'Masuk')}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                        <span style={{ padding: '0 10px', fontSize: '0.85rem' }}>Atau lanjutkan dengan</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                        <button 
                            type="button"
                            onClick={() => handleOAuthLogin('google')} 
                            className="btn btn-block btn-lg" 
                            disabled={loading}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                backgroundColor: 'white', color: '#333', border: '1px solid #ddd'
                            }}
                        >
                            <svg height="24" width="24" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => handleOAuthLogin('github')} 
                            className="btn btn-block btn-lg" 
                            disabled={loading}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                backgroundColor: '#24292e', color: 'white', border: 'none'
                            }}
                        >
                            <svg height="24" width="24" viewBox="0 0 16 16" fill="white">
                                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                            </svg>
                            GitHub
                        </button>
                    </div>
                    
                    <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {isSignUp ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                        <button 
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                        >
                            {isSignUp ? 'Masuk di sini' : 'Daftar sekarang'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
