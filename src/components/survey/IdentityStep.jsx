import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function IdentityStep({ data, updateField, updateFields }) {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState(data.employee_name || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [newSurveyor, setNewSurveyor] = useState('');

    useEffect(() => {
        api.get('/employees').then(setEmployees);
    }, []);

    // Initialize defaults
    useEffect(() => {
        if (!data.surveyDate) {
            const now = new Date();
            updateFields({
                surveyDate: now.toISOString().slice(0, 10),
                surveyTime: now.toTimeString().slice(0, 5),
                surveyorNames: [user?.name || ''],
            });
        }
    }, []);

    const filteredEmployees = employees.filter((e) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nik.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectEmployee = (emp) => {
        updateFields({
            employee_id: emp.id,
            employee_name: emp.name,
            employee_nik: emp.nik,
            employee_dept: emp.department,
            employeePosition: emp.position,
            employeeAddress: emp.address || '',
            employeeCurrentAddress: emp.current_address || '',
        });
        setSearchTerm(emp.name);
        setShowDropdown(false);
    };

    // Surveyor tags
    const surveyorNames = data.surveyorNames || [user?.name || ''];

    const addSurveyor = () => {
        const name = newSurveyor.trim();
        if (!name) return;
        if (surveyorNames.includes(name)) return;
        const updated = [...surveyorNames, name];
        updateFields({
            surveyorNames: updated,
            surveyor_name: updated.join(', '),
        });
        setNewSurveyor('');
    };

    const removeSurveyor = (idx) => {
        const updated = surveyorNames.filter((_, i) => i !== idx);
        updateFields({
            surveyorNames: updated,
            surveyor_name: updated.join(', '),
        });
    };

    const handleSurveyorKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSurveyor();
        }
    };

    return (
        <div>
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                👤 Data Identitas
            </h3>

            {/* Editable Date / Time / Surveyors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">📅 Tanggal Survey</label>
                    <input
                        className="form-input"
                        type="date"
                        value={data.surveyDate || new Date().toISOString().slice(0, 10)}
                        onChange={(e) => {
                            updateField('surveyDate', e.target.value);
                            const dt = new Date(e.target.value + 'T' + (data.surveyTime || '00:00'));
                            updateField('createdAt', dt.toISOString());
                        }}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">🕐 Jam Survey</label>
                    <input
                        className="form-input"
                        type="time"
                        value={data.surveyTime || new Date().toTimeString().slice(0, 5)}
                        onChange={(e) => {
                            updateField('surveyTime', e.target.value);
                            const dt = new Date((data.surveyDate || new Date().toISOString().slice(0, 10)) + 'T' + e.target.value);
                            updateField('createdAt', dt.toISOString());
                        }}
                    />
                </div>
            </div>

            {/* Multi Surveyor */}
            <div className="form-group">
                <label className="form-label">👤 Nama Surveyor</label>

                {/* Tags */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8,
                    minHeight: surveyorNames.length > 0 ? 'auto' : 0,
                }}>
                    {surveyorNames.map((name, i) => (
                        <span key={i} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 12px', background: 'var(--accent-glow)',
                            border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 20,
                            fontSize: '0.85rem', color: 'var(--accent)',
                        }}>
                            {name}
                            <button
                                onClick={() => removeSurveyor(i)}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--accent)',
                                    cursor: 'pointer', padding: 0, fontSize: '0.8rem', lineHeight: 1,
                                }}
                                title="Hapus surveyor"
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>

                {/* Add Input */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Ketik nama surveyor lalu Enter..."
                        value={newSurveyor}
                        onChange={(e) => setNewSurveyor(e.target.value)}
                        onKeyDown={handleSurveyorKeyDown}
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={addSurveyor} disabled={!newSurveyor.trim()}>
                        ➕
                    </button>
                </div>
                <div className="form-hint">Tekan Enter untuk menambah surveyor. Bisa lebih dari satu orang.</div>
            </div>

            {/* Employee Select */}
            <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">
                    Pilih Karyawan <span className="required">*</span>
                </label>
                <input
                    id="employee-search"
                    className="form-input"
                    type="text"
                    placeholder="Ketik nama atau NIK karyawan..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    autoComplete="off"
                />
                {showDropdown && filteredEmployees.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', maxHeight: 250, overflowY: 'auto',
                        boxShadow: 'var(--shadow-lg)', marginTop: 4,
                    }}>
                        {filteredEmployees.map((emp) => (
                            <div
                                key={emp.id}
                                onMouseDown={() => selectEmployee(emp)}
                                style={{
                                    padding: '10px 16px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--border)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{emp.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {emp.nik} • {emp.department} • {emp.position}
                                    {emp.address && ` • 📍 ${emp.address.slice(0, 40)}...`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="form-hint">Cari berdasarkan nama atau NIK dari database karyawan</div>
            </div>

            {/* Selected Employee Info */}
            {data.employee_name && (
                <div style={{
                    padding: 16, background: 'var(--success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginBottom: 8, fontWeight: 600 }}>
                        ✅ KARYAWAN TERPILIH
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nama</span>
                            <div style={{ fontWeight: 600 }}>{data.employee_name}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIK</span>
                            <div style={{ fontWeight: 600 }}>{data.employee_nik}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Departemen</span>
                            <div style={{ fontWeight: 600 }}>{data.employee_dept}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jabatan</span>
                            <div style={{ fontWeight: 600 }}>{data.employeePosition}</div>
                        </div>
                        {data.employeeAddress && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alamat KTP</span>
                                <div style={{ fontWeight: 600 }}>{data.employeeAddress}</div>
                            </div>
                        )}
                        {data.employeeCurrentAddress && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alamat Saat Ini</span>
                                <div style={{ fontWeight: 600 }}>{data.employeeCurrentAddress}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
