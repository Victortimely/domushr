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
    const { login } = useAuth();
    const bgImage = useMemo(() => BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)], []);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGithubLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await login(); 
        } catch (err) {
            setError(err.message);
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
                <div className="login-form-wrapper" style={{ textAlign: 'center' }}>
                    <div className="login-form-header">
                        <h2>Selamat Datang! 👋</h2>
                        <p>Masuk menggunakan akun GitHub Anda untuk melanjutkan ke DomusHR.</p>
                    </div>

                    {error && <div className="form-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

                    <button 
                        onClick={handleGithubLogin} 
                        className="btn btn-block btn-lg" 
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            backgroundColor: '#24292e',
                            color: 'white',
                            border: 'none',
                            marginTop: '20px'
                        }}
                    >
                        {loading ? <span className="spinner" /> : (
                            <svg height="24" width="24" viewBox="0 0 16 16" fill="white">
                                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                            </svg>
                        )}
                        Login dengan GitHub
                    </button>
                    
                    <p style={{ marginTop: '30px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Hanya akun GitHub yang sudah terdaftar yang dapat mengakses data secara penuh.
                    </p>
                </div>
            </div>
        </div>
    );
}
