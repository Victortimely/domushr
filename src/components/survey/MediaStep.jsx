import { useState, useRef, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { logAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';

const PHOTO_SLOTS = [
    { key: 'photo0', label: 'Rumah (Depan)', icon: '🏠', desc: 'Foto tampak depan rumah karyawan' },
    { key: 'photo1', label: 'Selfie + Karyawan', icon: '🤳', desc: 'Foto bersama karyawan' },
    { key: 'photo2', label: 'Foto + Ketua RT', icon: '👥', desc: 'Foto bersama Ketua RT setempat' },
];

export default function MediaStep({ data, updateField }) {
    const { user } = useAuth();
    const toast = useToast();
    const [activeCamera, setActiveCamera] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // === CAMERA FUNCTIONS ===
    const openCamera = async (slotKey) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: slotKey === 'photo1' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false,
            });
            streamRef.current = stream;
            setActiveCamera(slotKey);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            toast.error('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
        }
    };

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !activeCamera) return;

        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Add watermark
        const now = new Date();
        const watermark = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
        const coordText = data.latitude
            ? `GPS: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`
            : 'GPS: N/A';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        ctx.font = '14px monospace';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fillText(`📅 ${watermark}`, 10, canvas.height - 30);
        ctx.fillText(`📍 ${coordText}`, 10, canvas.height - 12);

        const photoData = canvas.toDataURL('image/jpeg', 0.85);
        updateField(activeCamera, photoData);
        closeCamera();
        toast.success('Foto berhasil diambil!');
        logAction('PHOTO_CAPTURE', user.id, user.name, { slot: activeCamera });
    }, [activeCamera, data.latitude, data.longitude, updateField, toast, user]);

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setActiveCamera(null);
    };

    // === FILE UPLOAD for photos ===
    const handleFileUpload = (slotKey, file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar (JPG, PNG, WebP)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            // Add watermark to uploaded image too
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const now = new Date();
                const watermark = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
                const coordText = data.latitude
                    ? `GPS: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`
                    : 'GPS: N/A';

                const barHeight = Math.max(40, img.height * 0.05);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
                const fontSize = Math.max(12, Math.floor(barHeight * 0.35));
                ctx.font = `${fontSize}px monospace`;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
                ctx.fillText(`📅 ${watermark}`, 10, canvas.height - barHeight * 0.55);
                ctx.fillText(`📍 ${coordText}  [UPLOADED]`, 10, canvas.height - barHeight * 0.15);

                const photoData = canvas.toDataURL('image/jpeg', 0.85);
                updateField(slotKey, photoData);
                toast.success('Foto berhasil diupload!');
                logAction('PHOTO_UPLOAD', user.id, user.name, { slot: slotKey, filename: file.name });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // === AUDIO FUNCTIONS ===
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    updateField('audioBlob', reader.result);
                };
                updateField('audioDuration', recordingTime);
                stream.getTracks().forEach((t) => t.stop());
                toast.success('Rekaman tersimpan!');
                logAction('AUDIO_RECORD', user.id, user.name, { duration: recordingTime });
            };

            mediaRecorder.start();
            setRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
        } catch (err) {
            toast.error('Tidak dapat mengakses mikrofon');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    // === AUDIO FILE UPLOAD ===
    const handleAudioUpload = (file) => {
        if (!file) return;
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3'];
        if (!file.type.startsWith('audio/') && !validTypes.includes(file.type)) {
            toast.error('File harus berupa audio (MP3, WAV, WebM, OGG, M4A)');
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            updateField('audioBlob', reader.result);
        };
        updateField('audioDuration', 0);
        toast.success(`Audio "${file.name}" berhasil diupload!`);
        logAction('AUDIO_UPLOAD', user.id, user.name, { filename: file.name });
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div>
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                📷 Dokumentasi Media
            </h3>

            {/* Photo Slots */}
            <div style={{ marginBottom: 8 }}>
                <label className="form-label">Foto Dokumentasi <span className="required">*</span></label>
                <div className="form-hint" style={{ marginBottom: 12 }}>
                    📸 Ambil dari kamera langsung atau 📁 upload dari file
                </div>
            </div>

            <div className="photo-grid" style={{ marginBottom: 28 }}>
                {PHOTO_SLOTS.map(({ key, label, icon, desc }) => (
                    <div key={key} className={`photo-slot ${data[key] ? 'captured' : ''}`}>
                        {data[key] ? (
                            <>
                                <img src={data[key]} alt={label} />
                                <button
                                    className="retake-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateField(key, null);
                                    }}
                                    title="Hapus foto"
                                >
                                    ✕
                                </button>
                                <div className="photo-overlay">
                                    <span style={{ fontSize: '0.75rem', color: 'white' }}>{label}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#10b981' }}>✓</span>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 12 }}>
                                <div className="photo-icon">{icon}</div>
                                <div className="photo-label">{label}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>{desc}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={(e) => { e.stopPropagation(); openCamera(key); }}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        📷 Kamera
                                    </button>
                                    <label className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
                                        📁 Upload
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => { handleFileUpload(key, e.target.files[0]); e.target.value = ''; }}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Audio Section */}
            <div style={{ marginBottom: 12 }}>
                <label className="form-label">🎤 Rekaman Wawancara</label>
            </div>

            <div className="audio-recorder">
                <div className="recorder-controls">
                    {!recording ? (
                        <button className="rec-btn" onClick={startRecording} title="Mulai Rekam">
                            ⏺
                        </button>
                    ) : (
                        <button className="rec-btn recording" onClick={stopRecording} title="Stop Rekam">
                            ⏹
                        </button>
                    )}
                    <div style={{ flex: 1 }}>
                        <div className="rec-time">{formatTime(recording ? recordingTime : (data.audioDuration || 0))}</div>
                        <div className="rec-label">
                            {recording ? '🔴 Merekam...' : data.audioBlob ? '✅ Rekaman tersimpan' : 'Tekan untuk mulai merekam'}
                        </div>
                    </div>
                    {/* Upload audio button */}
                    {!recording && (
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                            📁 Upload Audio
                            <input
                                type="file"
                                accept="audio/mpeg,audio/wav,audio/webm,audio/ogg,audio/mp4,audio/x-m4a,audio/*"
                                style={{ display: 'none' }}
                                onChange={(e) => { handleAudioUpload(e.target.files[0]); e.target.value = ''; }}
                            />
                        </label>
                    )}
                </div>

                {data.audioBlob && !recording && (
                    <div style={{ marginTop: 16 }}>
                        <audio controls src={data.audioBlob} style={{ width: '100%' }} />
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { updateField('audioBlob', null); updateField('audioDuration', 0); }}
                            style={{ marginTop: 8 }}
                        >
                            🗑️ Hapus Rekaman
                        </button>
                    </div>
                )}
            </div>

            {/* Camera Modal */}
            {activeCamera && (
                <div className="camera-modal">
                    <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, objectFit: 'cover' }} />
                    <div style={{
                        position: 'absolute', top: 16, left: 16, right: 16,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 20, fontSize: '0.85rem' }}>
                            {PHOTO_SLOTS.find((s) => s.key === activeCamera)?.label}
                        </span>
                    </div>
                    <div className="camera-controls">
                        <button className="close-camera" onClick={closeCamera}>✕</button>
                        <button className="capture-btn" onClick={capturePhoto} id="capture-photo-btn" />
                        <div style={{ width: 44 }} />
                    </div>
                </div>
            )}
        </div>
    );
}
