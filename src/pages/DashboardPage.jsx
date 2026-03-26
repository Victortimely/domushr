import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateSurveyPDF } from '../services/pdfService';

function DonutChart({ surveyed, total, label }) {
    const pct = total > 0 ? Math.round((surveyed / total) * 100) : 0;
    const notSurveyed = total - surveyed;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const surveyedDash = (surveyed / (total || 1)) * circumference;
    const notSurveyedDash = circumference - surveyedDash;

    return (
        <div className="donut-chart-wrapper">
            <svg viewBox="0 0 200 200" className="donut-svg">
                <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="24" />
                <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke="url(#donutGradient)"
                    strokeWidth="24"
                    strokeDasharray={`${surveyedDash} ${notSurveyedDash}`}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
                <defs>
                    <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                </defs>
                <text x="100" y="92" textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800">{pct}%</text>
                <text x="100" y="116" textAnchor="middle" fill="var(--text-muted)" fontSize="12" fontWeight="500">{label}</text>
            </svg>
            <div className="donut-legend">
                <div className="donut-legend-item">
                    <span className="donut-dot" style={{ background: 'var(--accent)' }} />
                    <span>Sudah Survey</span>
                    <strong>{surveyed}</strong>
                </div>
                <div className="donut-legend-item">
                    <span className="donut-dot" style={{ background: 'var(--text-muted)' }} />
                    <span>Belum Survey</span>
                    <strong>{notSurveyed}</strong>
                </div>
                <div className="donut-legend-item">
                    <span className="donut-dot" style={{ background: 'var(--purple)' }} />
                    <span>Total Target</span>
                    <strong>{total}</strong>
                </div>
            </div>
        </div>
    );
}

function BarChart({ data }) {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bar-chart-container">
            <div className="bar-chart">
                {data.map((d, i) => (
                    <div key={i} className="bar-item">
                        <div className="bar-value">{d.value}</div>
                        <div className="bar-fill-wrapper">
                            <div
                                className="bar-fill"
                                style={{
                                    height: `${(d.value / maxVal) * 100}%`,
                                    background: `linear-gradient(180deg, #3b82f6, #8b5cf6)`,
                                    transition: 'height 0.6s ease'
                                }}
                            />
                        </div>
                        <div className="bar-label">{d.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [surveys, setSurveys] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState({ total: 0, draft: 0, saved: 0, verified: 0 });
    const [unSurveyedEmployees, setUnSurveyedEmployees] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const allSurveys = await api.get('/surveys');
            const allEmployees = await api.get('/employees');
            setSurveys(allSurveys);
            setEmployees(allEmployees);

            setStats({
                total: allSurveys.length,
                draft: allSurveys.filter((s) => s.status === 'draft').length,
                saved: allSurveys.filter((s) => s.status === 'saved' || s.status === 'synced').length,
                verified: allSurveys.filter((s) => s.status === 'verified').length,
            });

            // Calculate unsurveyed employees
            const surveyedIds = new Set(allSurveys.map(s => s.employee_id).filter(Boolean));
            const surveyedNiks = new Set(allSurveys.map(s => s.employee_nik).filter(Boolean));
            const unsurveyed = allEmployees.filter(emp => !surveyedIds.has(emp.id) && !surveyedNiks.has(emp.nik));
            setUnSurveyedEmployees(unsurveyed);
        } catch (err) {
            toast.error('Gagal memuat data dashboard');
        }
    }

    const availableYears = useMemo(() => {
        const years = new Set(surveys.filter(s => s.created_at).map(s => new Date(s.created_at).getFullYear()));
        years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [surveys]);

    const monthlyData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return months.map((label, index) => {
            const count = surveys.filter(s => {
                if (!s.created_at) return false;
                const d = new Date(s.created_at);
                return d.getFullYear() === selectedYear && d.getMonth() === index;
            }).length;
            return { label, value: count, year: selectedYear, month: index };
        });
    }, [surveys, selectedYear]);

    // Calculate donut values strictly dynamically (no overrides)
    const surveyedEmployeeIds = new Set(surveys.map(s => s.employee_id).filter(Boolean));
    const autoSurveyed = surveyedEmployeeIds.size;
    const autoTotal = employees.length;

    const handlePrintSurvey = async (survey) => {
        try {
            await generateSurveyPDF(survey);
            toast.success('PDF berhasil didownload');
        } catch (err) {
            toast.error('Gagal membuat PDF: ' + err.message);
        }
    };

    const handlePrintAllSummary = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('Laporan Ringkasan Survey Karyawan', 14, 20);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Tanggal cetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 28);
            doc.text(`Total survey: ${surveys.length} | Karyawan: ${employees.length}`, 14, 34);
            doc.line(14, 37, 196, 37);

            let y = 44;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            ['No', 'Nama Karyawan', 'NIK', 'Divisi', 'Tanggal', 'Surveyor', 'Status'].forEach((h, i) => {
                const x = [14, 24, 74, 100, 126, 146, 180][i];
                doc.text(h, x, y);
            });
            doc.line(14, y + 2, 196, y + 2);
            y += 6;

            doc.setFont('helvetica', 'normal');
            surveys.forEach((s, idx) => {
                if (y > 275) {
                    doc.addPage();
                    y = 20;
                }
                const row = [
                    String(idx + 1),
                    (s.employeeName || '-').slice(0, 25),
                    (s.employeeNik || '-').slice(0, 12),
                    (s.employeeDept || '-').slice(0, 12),
                    s.surveyDate || (s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '-'),
                    (Array.isArray(s.surveyorNames) ? s.surveyorNames.join(', ') : s.surveyorName || '-').slice(0, 18),
                    s.status || '-',
                ];
                row.forEach((val, i) => {
                    const x = [14, 24, 74, 100, 126, 146, 180][i];
                    doc.text(val, x, y);
                });
                y += 5;
            });

            doc.save(`Laporan_Survey_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('PDF ringkasan berhasil didownload');
        } catch (err) {
            toast.error('Gagal membuat PDF: ' + err.message);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Selamat datang, {user?.name} 👋</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handlePrintAllSummary} title="Print PDF Ringkasan">
                    🖨️ Print PDF
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">📊</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Survey</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">📝</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.draft}</div>
                        <div className="stat-label">Draft</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.saved}</div>
                        <div className="stat-label">Tersimpan</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🔒</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.verified}</div>
                        <div className="stat-label">Terverifikasi</div>
                    </div>
                </div>
            </div>

            {/* Donut Chart */}
            <div className="card chart-card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2 className="card-title">🍩 Status Survey Karyawan</h2>
                </div>
                <DonutChart surveyed={autoSurveyed} total={autoTotal} label="Tersurvey" />
            </div>

            {/* Bar Chart */}
            <div className="card chart-card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2 className="card-title">📊 Survey per Bulan</h2>
                    <select
                        className="form-input"
                        style={{ width: 'auto', padding: '4px 8px', minHeight: '32px', marginBottom: 0 }}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>Tahun {y}</option>
                        ))}
                    </select>
                </div>
                <BarChart data={monthlyData} />
            </div>

            {/* Unsurveyed Employees List — replaces map section */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="unsurveyed-icon">‼️</span> Belum di Survey
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                        {unSurveyedEmployees.length} karyawan
                    </span>
                </div>
                {unSurveyedEmployees.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px 0' }}>
                        <div className="empty-state-icon">🎉</div>
                        <div className="empty-state-title">Semua Sudah Disurvey!</div>
                        <p>Tidak ada karyawan yang belum disurvey</p>
                    </div>
                ) : (
                    <div className="survey-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {unSurveyedEmployees.map((emp) => (
                            <div key={emp.id} className="survey-item unsurveyed-item" style={{ cursor: 'default' }}>
                                <div className="survey-item-avatar" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                    <span style={{ fontSize: '0.9rem' }}>‼️</span>
                                </div>
                                <div className="survey-item-info">
                                    <div className="survey-item-name">{emp.name}</div>
                                    <div className="survey-item-meta">
                                        <span>🆔 {emp.nik}</span>
                                        <span>🏢 {emp.department || '-'}</span>
                                        <span>💼 {emp.position || '-'}</span>
                                    </div>
                                </div>
                                <Link
                                    to="/survey/new"
                                    className="btn btn-primary btn-sm"
                                    style={{ flexShrink: 0 }}
                                >
                                    📋 Survey
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <Link to="/survey/new" className="btn btn-primary btn-lg btn-block" id="new-survey-btn">
                    📋 Survey Baru
                </Link>
                <Link to="/history" className="btn btn-secondary btn-lg btn-block" id="history-btn">
                    🕐 Riwayat Survey
                </Link>
            </div>

            {/* Recent Surveys */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">📋 Survey Terbaru</h2>
                    <Link to="/history" className="btn btn-ghost btn-sm">Lihat Semua →</Link>
                </div>
                {surveys.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <div className="empty-state-title">Belum Ada Survey</div>
                        <p>Mulai survey pertama Anda</p>
                    </div>
                ) : (
                    <div className="survey-list">
                        {surveys.slice(0, 5).map((s) => (
                            <div key={s.id} className="survey-item" style={{ cursor: 'default' }}>
                                <Link to={`/detail/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                    <div className="survey-item-avatar">
                                        {s.employeeName?.[0] || '?'}
                                    </div>
                                    <div className="survey-item-info">
                                        <div className="survey-item-name">{s.employeeName || 'Unnamed'}</div>
                                        <div className="survey-item-meta">
                                            <span>📅 {new Date(s.createdAt).toLocaleDateString('id-ID')}</span>
                                            <span>👤 {s.surveyorName}</span>
                                        </div>
                                    </div>
                                    <span className={`badge badge-${s.status === 'draft' ? 'draft' : s.status === 'verified' ? 'verified' : 'saved'}`}>
                                        {s.status === 'draft' ? '📝 Draft' : s.status === 'verified' ? '✅ Verified' : '💾 Saved'}
                                    </span>
                                </Link>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handlePrintSurvey(s)}
                                    title="Print PDF"
                                    style={{ flexShrink: 0 }}
                                >
                                    🖨️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
