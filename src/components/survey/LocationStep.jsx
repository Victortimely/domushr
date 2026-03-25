import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { logAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';

/**
 * Parse geographic coordinate string in DMS format.
 * Supports formats like:
 *   6°12'53.8"S 106°50'46.5"E
 *   6°12'53.8"S, 106°50'46.5"E
 *   -6.2149444, 106.8462500  (decimal fallback)
 */
function parseGeoCoordinate(input) {
    if (!input || !input.trim()) return null;
    const str = input.trim();

    // Try DMS format: e.g. 6°12'53.8"S 106°50'46.5"E
    const dmsRegex = /(\d+)[°]\s*(\d+)[′']\s*([\d.]+)[″"]\s*([NSns])\s*[,\s]+\s*(\d+)[°]\s*(\d+)[′']\s*([\d.]+)[″"]\s*([EWew])/;
    const dmsMatch = str.match(dmsRegex);
    if (dmsMatch) {
        const latDeg = parseFloat(dmsMatch[1]);
        const latMin = parseFloat(dmsMatch[2]);
        const latSec = parseFloat(dmsMatch[3]);
        const latDir = dmsMatch[4].toUpperCase();
        const lngDeg = parseFloat(dmsMatch[5]);
        const lngMin = parseFloat(dmsMatch[6]);
        const lngSec = parseFloat(dmsMatch[7]);
        const lngDir = dmsMatch[8].toUpperCase();

        let lat = latDeg + latMin / 60 + latSec / 3600;
        let lng = lngDeg + lngMin / 60 + lngSec / 3600;

        if (latDir === 'S') lat = -lat;
        if (lngDir === 'W') lng = -lng;

        return { lat, lng };
    }

    // Try decimal format fallback: -6.2149444, 106.8462500
    const decimalRegex = /^([+-]?[\d.]+)\s*[,\s]\s*([+-]?[\d.]+)$/;
    const decMatch = str.match(decimalRegex);
    if (decMatch) {
        const lat = parseFloat(decMatch[1]);
        const lng = parseFloat(decMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }

    return null;
}

/**
 * Convert decimal lat/lng to DMS string
 */
function toDMS(lat, lng) {
    function convert(dd, isLng) {
        const dir = isLng ? (dd >= 0 ? 'E' : 'W') : (dd >= 0 ? 'N' : 'S');
        const abs = Math.abs(dd);
        const deg = Math.floor(abs);
        const minFloat = (abs - deg) * 60;
        const min = Math.floor(minFloat);
        const sec = ((minFloat - min) * 60).toFixed(1);
        return `${deg}°${min}'${sec}"${dir}`;
    }
    return `${convert(lat, false)} ${convert(lng, true)}`;
}

export default function LocationStep({ data, updateField, updateFields }) {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [manualCoord, setManualCoord] = useState(
        data.latitude && data.longitude ? toDMS(data.latitude, data.longitude) : ''
    );

    const captureGPS = () => {
        if (!navigator.geolocation) {
            toast.error('GPS tidak tersedia di browser ini');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;

                if (accuracy > 100) {
                    toast.error(`Akurasi GPS terlalu rendah (±${Math.round(accuracy)}m). Coba di area terbuka.`);
                } else {
                    toast.success(`Lokasi captured! Akurasi: ±${Math.round(accuracy)}m`);
                }

                updateFields({ latitude, longitude, accuracy });
                setManualCoord(toDMS(latitude, longitude));

                await logAction('GPS_CAPTURE', user.id, user.name, { latitude, longitude, accuracy });
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                switch (err.code) {
                    case 1: toast.error('Izin GPS ditolak. Aktifkan izin lokasi.'); break;
                    case 2: toast.error('Lokasi tidak tersedia'); break;
                    case 3: toast.error('Timeout - coba lagi'); break;
                    default: toast.error('Gagal mendapatkan lokasi');
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const applyManualCoords = () => {
        const parsed = parseGeoCoordinate(manualCoord);
        if (!parsed) {
            toast.error('Format koordinat tidak valid. Gunakan format: 6°12\'53.8"S 106°50\'46.5"E');
            return;
        }
        const { lat, lng } = parsed;
        if (lat < -90 || lat > 90) {
            toast.error('Latitude harus antara -90 dan 90');
            return;
        }
        if (lng < -180 || lng > 180) {
            toast.error('Longitude harus antara -180 dan 180');
            return;
        }
        updateFields({ latitude: lat, longitude: lng, accuracy: 0 });
        setManualCoord(toDMS(lat, lng));
        toast.success('Koordinat berhasil diterapkan!');
    };

    const mapSrc = data.latitude && data.longitude
        ? `https://maps.google.com/maps?q=${data.latitude},${data.longitude}&z=16&output=embed`
        : `https://maps.google.com/maps?q=-6.2,106.8&z=12&output=embed`;

    return (
        <div>
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                📍 Data Lokasi
            </h3>

            {/* GPS Capture Button */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <button
                    className="btn btn-primary btn-lg"
                    onClick={captureGPS}
                    disabled={loading}
                    id="capture-gps-btn"
                    style={{ minWidth: 200 }}
                >
                    {loading ? (
                        <><span className="spinner" /> Mencari lokasi...</>
                    ) : (
                        <>📡 Capture Lokasi GPS</>
                    )}
                </button>
            </div>

            {/* Manual Coordinate Input — Single Field, Geographic Format */}
            <div style={{
                padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                marginBottom: 20, border: '1px solid var(--border)',
            }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    📝 Input Koordinat Manual
                </div>
                <div className="form-group" style={{ margin: 0, marginBottom: 12 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Koordinat Geografis</label>
                    <input
                        className="form-input"
                        type="text"
                        placeholder={`Contoh: 6°12'53.8"S 106°50'46.5"E`}
                        value={manualCoord}
                        onChange={(e) => setManualCoord(e.target.value)}
                        id="manual-coord-input"
                        style={{ fontFamily: "'Inter', monospace" }}
                    />
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={applyManualCoords}
                    style={{ width: '100%' }}
                    id="apply-manual-coords-btn"
                >
                    📌 Terapkan Koordinat
                </button>
                <div className="form-hint" style={{ marginTop: 8 }}>
                    {'💡 Format: '}
                    <code style={{ fontSize: '0.78rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                        {"6°12'53.8\"S 106°50'46.5\"E"}
                    </code>
                    {' — atau format desimal '}
                    <code style={{ fontSize: '0.78rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                        -6.214944, 106.846250
                    </code>
                </div>
            </div>

            {/* GPS Info Display */}
            {data.latitude && (
                <div className="gps-display" style={{ marginBottom: 20 }}>
                    <div style={{ flex: 1 }}>
                        <div className="gps-coords">
                            {toDMS(data.latitude, data.longitude)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                        </div>
                        <div className={`gps-accuracy ${data.accuracy === 0 ? 'good' : data.accuracy < 20 ? 'good' : data.accuracy < 50 ? 'medium' : 'poor'}`}>
                            {data.accuracy === 0 ? (
                                '📝 Input Manual — Koordinat ditetapkan manual ✓'
                            ) : (
                                <>📡 Akurasi: ±{Math.round(data.accuracy)}m
                                    {data.accuracy < 20 ? ' — Sangat Baik ✓' : data.accuracy < 50 ? ' — Cukup Baik' : ' — Kurang Akurat ⚠'}</>
                            )}
                        </div>
                    </div>
                    <a
                        href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                    >
                        🗺️ Maps
                    </a>
                </div>
            )}

            {/* Google Maps Embed */}
            <div className="map-container" style={{ height: 300, marginBottom: 16, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <iframe
                    title="Google Maps"
                    src={mapSrc}
                    style={{ width: '100%', height: '100%', border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>

            <div className="form-hint" style={{ textAlign: 'center' }}>
                💡 Gunakan tombol GPS untuk auto-detect, atau isi koordinat manual di atas
            </div>

            {data.accuracy && data.accuracy > 50 && (
                <div style={{
                    marginTop: 12, padding: 12, background: 'var(--warning-bg)',
                    border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem', color: 'var(--warning)',
                }}>
                    ⚠ Akurasi GPS rendah. Untuk hasil terbaik, pastikan GPS aktif dan Anda berada di area terbuka.
                </div>
            )}
        </div>
    );
}
