import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { generateSurveyPDF } from '../services/pdfService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SurveyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [survey, setSurvey] = useState(null);

    const isPrivileged = user?.role === 'master' || user?.role === 'admin';

    useEffect(() => {
        if (id) {
            api.get(`/surveys/${id}`).then(setSurvey).catch(() => {});
        }
    }, [id]);

    if (!survey) {
        return (
            <div className="loading-page">
                <div className="spinner" style={{ width: 32, height: 32 }} />
                <p>Memuat data...</p>
            </div>
        );
    }

    const handleDelete = async () => {
        if (window.confirm('Hapus survey ini? Tindakan ini tidak bisa dibatalkan.')) {
            await api.delete(`/surveys/${survey.id}`);
            toast.success('Survey dihapus');
            navigate('/history');
        }
    };

    const handleExportPDF = async () => {
        try {
            const filename = await generateSurveyPDF(survey);
            toast.success(`PDF disimpan: ${filename}`);
        } catch (err) {
            toast.error('Gagal membuat PDF');
        }
    };

    const handleVerify = async () => {
        await api.put(`/surveys/${survey.id}`, { status: 'verified' });
        setSurvey((s) => ({ ...s, status: 'verified' }));
        toast.success('Survey terverifikasi!');
    };

    const mapsLink = survey.latitude && survey.longitude
        ? `https://www.google.com/maps?q=${survey.latitude},${survey.longitude}`
        : null;

    const mapEmbedSrc = survey.latitude && survey.longitude
        ? `https://maps.google.com/maps?q=${survey.latitude},${survey.longitude}&z=16&output=embed`
        : null;

    const photoLabels = ['Rumah (Depan)', 'Selfie + Karyawan', 'Foto + Ketua RT'];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>←</button>
                <div style={{ flex: 1 }}>
                    <h1 className="page-title" style={{ fontSize: '1.3rem' }}>{survey.employee_name}</h1>
                    <p className="page-subtitle">SRV-{String(survey.id).padStart(4, '0')}</p>
                </div>
                <span className={`badge badge-${survey.status === 'draft' ? 'draft' : survey.status === 'verified' ? 'verified' : 'saved'}`}>
                    {survey.status === 'draft' ? '📝 Draft' : survey.status === 'verified' ? '✅ Verified' : '💾 Saved'}
                </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <Link to={`/survey/${survey.id}`} className="btn btn-primary btn-sm">
                    ✏️ {survey.status === 'draft' ? 'Lanjutkan' : 'Edit'}
                </Link>
                {survey.status === 'saved' && isPrivileged && (
                    <button className="btn btn-success btn-sm" onClick={handleVerify}>✅ Verifikasi</button>
                )}
                {isPrivileged && (
                    <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}>📄 Export PDF</button>
                )}
                {mapsLink && (
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        🗺️ Google Maps
                    </a>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Hapus</button>
            </div>

            {/* Identity */}
            <div className="card detail-section">
                <div className="detail-section-title">📋 Data Identitas</div>
                <div className="detail-row"><span className="detail-label">Nama Karyawan</span><span className="detail-value">{survey.employee_name || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">NIK</span><span className="detail-value">{survey.employee_nik || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">Departemen</span><span className="detail-value">{survey.employee_dept || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">Jabatan</span><span className="detail-value">{survey.data?.employeePosition || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">Alamat KTP</span><span className="detail-value">{survey.data?.employeeAddress || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">Alamat Saat Ini</span><span className="detail-value">{survey.data?.employeeCurrentAddress || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">Surveyor</span><span className="detail-value">{survey.surveyor_name || '-'}</span></div>
                <div className="detail-row"><span className="detail-label">Tanggal</span><span className="detail-value">{new Date(survey.created_at).toLocaleString('id-ID')}</span></div>
            </div>

            {/* Location */}
            <div className="card detail-section">
                <div className="detail-section-title">📍 Data Lokasi</div>
                {survey.latitude && survey.longitude ? (
                    <>
                        <div className="gps-display" style={{ marginBottom: 12 }}>
                            <div>
                                <div className="gps-coords">{survey.latitude.toFixed(6)}, {survey.longitude.toFixed(6)}</div>
                                <div className={`gps-accuracy ${survey.accuracy === 0 ? 'good' : survey.accuracy < 20 ? 'good' : survey.accuracy < 50 ? 'medium' : 'poor'}`}>
                                    {survey.accuracy === 0 ? (
                                        '📝 Input Manual'
                                    ) : (
                                        <>📡 Akurasi: ±{Math.round(survey.accuracy || 0)}m</>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="map-container" style={{ height: 250, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <iframe
                                title="Google Maps"
                                src={mapEmbedSrc}
                                style={{ width: '100%', height: '100%', border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </>
                ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Lokasi belum dicatat</p>
                )}
            </div>

            {/* Photos */}
            <div className="card detail-section">
                <div className="detail-section-title">📷 Dokumentasi Foto</div>
                <div className="photo-grid">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className={`photo-slot ${survey[`photo${i}`] ? 'captured' : ''}`}>
                            {survey.data?.[`photo${i}`] ? (
                                <img src={survey.data[`photo${i}`]} alt={photoLabels[i]} />
                            ) : (
                                <>
                                    <div className="photo-icon">📷</div>
                                    <div className="photo-label">{photoLabels[i]}</div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Audio & Notes */}
            <div className="card detail-section">
                <div className="detail-section-title">🎤 Rekaman & Catatan</div>
                {survey.data?.audioBlob ? (
                    <div style={{ marginBottom: 12 }}>
                        <audio controls src={survey.data.audioBlob} style={{ width: '100%' }} />
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Tidak ada rekaman audio</p>
                )}
                <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ringkasan Wawancara:</strong>
                    <p style={{ marginTop: 4, fontSize: '0.9rem' }}>{survey.data?.interviewSummary || 'Tidak ada ringkasan'}</p>
                </div>
            </div>

            {/* Signature */}
            <div className="card detail-section">
                <div className="detail-section-title">✍️ Tanda Tangan Digital</div>
                {survey.signature ? (
                    <div style={{ background: 'white', borderRadius: 'var(--radius-sm)', padding: 12, display: 'inline-block' }}>
                        <img src={survey.signature} alt="Digital Signature" style={{ maxWidth: 300, maxHeight: 150 }} />
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Belum ada tanda tangan</p>
                )}
            </div>
        </div>
    );
}
