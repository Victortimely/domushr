import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

export default function VerificationStep({ data, updateField, onSubmit, onSaveDraft, isSaving }) {
    const canvasRef = useRef(null);
    const sigPadRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && !sigPadRef.current) {
            const canvas = canvasRef.current;
            canvas.width = canvas.offsetWidth;
            canvas.height = 200;
            sigPadRef.current = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'rgb(0, 0, 0)',
            });

            // Load existing signature
            if (data.signature) {
                sigPadRef.current.fromDataURL(data.signature);
            }

            sigPadRef.current.addEventListener('endStroke', () => {
                updateField('signature', sigPadRef.current.toDataURL());
            });
        }
    }, []);

    const clearSignature = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
            updateField('signature', null);
        }
    };

    // Validation checklist
    const checks = [
        { label: 'Karyawan dipilih', pass: !!data.employeeName },
        { label: 'Lokasi dicapture/diisi manual', pass: !!data.latitude },
        { label: 'Akurasi GPS memadai / Input manual', pass: data.latitude ? (data.accuracy === 0 || data.accuracy === null || (data.accuracy && data.accuracy < 50)) : false },
        { label: 'Foto rumah (depan)', pass: !!data.photo0 },
        { label: 'Foto selfie + karyawan', pass: !!data.photo1 },
        { label: 'Foto dengan Ketua RT', pass: !!data.photo2 },
        { label: 'Tanda tangan digital', pass: !!data.signature },
    ];

    const allPassed = checks.every((c) => c.pass);
    const passCount = checks.filter((c) => c.pass).length;

    const handleSubmit = () => {
        onSubmit();
    };

    return (
        <div>
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✅ Verifikasi & Tanda Tangan
            </h3>

            {/* Interview Summary */}
            <div className="form-group">
                <label className="form-label">📝 Ringkasan Wawancara</label>
                <textarea
                    id="interview-summary"
                    className="form-textarea"
                    placeholder="Tulis ringkasan hasil wawancara di sini... (cadangan jika audio kurang jelas)"
                    value={data.interviewSummary || ''}
                    onChange={(e) => updateField('interviewSummary', e.target.value)}
                    rows={4}
                />
                <div className="form-hint">Opsional — sebagai cadangan jika rekaman audio kurang jelas</div>
            </div>

            {/* Digital Signature */}
            <div className="form-group">
                <label className="form-label">
                    ✍️ Tanda Tangan Digital <span className="required">*</span>
                </label>
                <div className="form-hint" style={{ marginBottom: 8 }}>
                    Tanda tangan karyawan / Ketua RT langsung di layar
                </div>
                <div className="signature-wrapper">
                    <canvas ref={canvasRef} style={{ width: '100%', height: 200, touchAction: 'none' }} />
                </div>
                <div className="signature-actions">
                    <button className="btn btn-ghost btn-sm" onClick={clearSignature}>
                        🗑️ Hapus Tanda Tangan
                    </button>
                    {data.signature && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ✓ Tanda tangan tersimpan
                        </span>
                    )}
                </div>
            </div>

            {/* Validation Checklist */}
            <div className="form-group">
                <label className="form-label">📋 Checklist Kelengkapan ({passCount}/{checks.length})</label>
                <ul className="checklist">
                    {checks.map((c, i) => (
                        <li key={i} className="checklist-item">
                            <span className={`checklist-icon ${c.pass ? 'pass' : 'fail'}`}>
                                {c.pass ? '✓' : '✕'}
                            </span>
                            <span style={{ color: c.pass ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {c.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Submit Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn btn-secondary btn-lg" onClick={onSaveDraft} disabled={isSaving} style={{ flex: 1 }}>
                    {isSaving ? <span className="spinner" /> : '💾'} Simpan Draft
                </button>
                <button
                    className="btn btn-success btn-lg"
                    onClick={handleSubmit}
                    disabled={!allPassed || isSaving}
                    id="submit-survey-btn"
                    style={{ flex: 1 }}
                >
                    {isSaving ? <span className="spinner" /> : '📤'} Kirim Survey
                </button>
            </div>

            {!allPassed && (
                <div style={{
                    marginTop: 12, padding: 12, background: 'var(--warning-bg)',
                    border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem', color: 'var(--warning)', textAlign: 'center',
                }}>
                    ⚠ Lengkapi semua item checklist sebelum submit
                </div>
            )}
        </div>
    );
}
