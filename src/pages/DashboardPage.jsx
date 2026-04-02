import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateSurveyPDF } from '../services/pdfService';
import '../styles/dashboard.css';

function DonutChart({ surveyed, total, label }) {
    const pct = total > 0 ? Math.round((surveyed / total) * 100) : 0;
    const notSurveyed = total - surveyed;
    
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    
    const surveyedDash = (surveyed / (total || 1)) * circumference;
    const notSurveyedDash = circumference - surveyedDash;

    return (
        <div className="donut-wrap">
          <div className="donut-svg-wrap">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius}
                fill="none" stroke="#8b5cf6" strokeWidth="14"
                strokeDasharray={`${circumference} ${circumference}`} opacity="0.25"/>
              <circle cx="50" cy="50" r={radius}
                fill="none" stroke="#4b5080" strokeWidth="14"
                strokeDasharray={`${notSurveyedDash} ${surveyedDash}`} strokeDashoffset="0"
                style={{ transition: 'stroke-dasharray 1s ease' }}/>
              <circle cx="50" cy="50" r={radius}
                fill="none" stroke="#4f8ef7" strokeWidth="14"
                strokeDasharray={`${surveyedDash} ${notSurveyedDash}`}
                strokeDashoffset={-notSurveyedDash}
                style={{ transition: 'stroke-dasharray 1s ease, stroke-dashoffset 1s ease' }}/>
              <circle cx="50" cy="50" r={radius}
                fill="none" stroke="#8b5cf6" strokeWidth="14"
                strokeDasharray={`3 ${circumference - 3}`}
                strokeDashoffset={-(circumference - 0.5)} opacity="0.6"/>
            </svg>
            <div className="donut-center">
              <span className="donut-total">{total}</span>
              <span className="donut-label">{label}</span>
            </div>
          </div>
          
          <div className="legend">
            <div className="legend-item">
              <div className="legend-row">
                <span className="dot" style={{background:'#4f8ef7'}}></span>
                <span className="legend-name">Sudah Disurvey</span>
              </div>
              <div style={{display:'flex', alignItems:'baseline'}}>
                <span className="legend-val" style={{color:'#4f8ef7'}}>{surveyed}</span>
                <span className="legend-pct">{pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${pct}%`, background:'#4f8ef7'}}></div>
              </div>
            </div>

            <div className="legend-item">
              <div className="legend-row">
                <span className="dot" style={{background:'#4b5080'}}></span>
                <span className="legend-name">Belum Disurvey</span>
              </div>
              <div style={{display:'flex', alignItems:'baseline'}}>
                <span className="legend-val" style={{color:'#a0aac0'}}>{notSurveyed}</span>
                <span className="legend-pct">{total > 0 ? 100 - pct : 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${total > 0 ? 100 - pct : 0}%`, background:'#4b5080'}}></div>
              </div>
            </div>

            <div className="legend-item">
              <div className="legend-row">
                <span className="dot" style={{background:'#8b5cf6'}}></span>
                <span className="legend-name">Total Target</span>
              </div>
              <div style={{display:'flex', alignItems:'baseline'}}>
                <span className="legend-val" style={{color:'#a78bfa'}}>{total}</span>
                <span className="legend-pct">100%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:'100%', background:'linear-gradient(90deg,#8b5cf6,#a78bfa)'}}></div>
              </div>
            </div>
          </div>
        </div>
    );
}

function BarChart({ data }) {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div style={{ position: 'relative' }}>
          <div className="bar-scroll-wrap">
            <div className="bar-chart">
              {data.map((d, i) => {
                  const pct = (d.value / maxVal) * 100;
                  return (
                      <div key={i} className="bar-col">
                        <span className="bar-val">{d.value}</span>
                        <div className="bar" style={{height: `${pct}%`, minHeight:'8px'}} title={`${d.label}: ${d.value} karyawan`}></div>
                        <span className="bar-month">{d.label}</span>
                      </div>
                  );
              })}
            </div>
          </div>
          <div className="bar-axis"></div>
        </div>
    );
}

const initialMapData = [
    { id: 1, name: 'Aceh', top: 18, left: 8, count: 5 },
    { id: 2, name: 'Sumatera Utara', top: 25, left: 12, count: 12 },
    { id: 3, name: 'Sumatera Barat', top: 38, left: 15, count: 8 },
    { id: 4, name: 'Riau', top: 33, left: 18, count: 4 },
    { id: 5, name: 'Jambi', top: 40, left: 22, count: 6 },
    { id: 6, name: 'Sumsel', top: 48, left: 25, count: 15 },
    { id: 7, name: 'Lampung', top: 56, left: 28, count: 10 },
    { id: 8, name: 'Banten', top: 62, left: 27, count: 8 },
    { id: 9, name: 'DKI Jakarta', top: 64, left: 30, count: 45 },
    { id: 10, name: 'Jawa Barat', top: 66, left: 32, count: 32 },
    { id: 11, name: 'Jawa Tengah', top: 68, left: 36, count: 28 },
    { id: 12, name: 'Jawa Timur', top: 70, left: 42, count: 35 },
    { id: 13, name: 'Bali', top: 73, left: 47, count: 12 },
    { id: 14, name: 'NTB', top: 75, left: 51, count: 4 },
    { id: 15, name: 'NTT', top: 79, left: 56, count: 3 },
    { id: 16, name: 'Kalbar', top: 38, left: 38, count: 7 },
    { id: 17, name: 'Kalteng', top: 46, left: 42, count: 5 },
    { id: 18, name: 'Kalsel', top: 52, left: 45, count: 8 },
    { id: 19, name: 'Kaltim', top: 38, left: 48, count: 11 },
    { id: 20, name: 'Sulsel', top: 56, left: 55, count: 18 },
    { id: 21, name: 'Sulteng', top: 44, left: 57, count: 5 },
    { id: 22, name: 'Sulut', top: 33, left: 63, count: 8 },
    { id: 23, name: 'Maluku', top: 55, left: 70, count: 5 },
    { id: 24, name: 'Papua Barat', top: 44, left: 80, count: 6 },
    { id: 25, name: 'Papua', top: 52, left: 90, count: 15 },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [surveys, setSurveys] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mapCounts, setMapCounts] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('indonesiaMapData');
        if (saved) {
            setMapCounts(JSON.parse(saved));
        } else {
            setMapCounts(initialMapData);
        }
        loadData();
    }, []);

    const updateMapCount = (id, newCount) => {
        const updated = mapCounts.map(m => m.id === id ? { ...m, count: newCount } : m);
        setMapCounts(updated);
        localStorage.setItem('indonesiaMapData', JSON.stringify(updated));
    };

    async function loadData() {
        try {
            const allSurveys = await api.get('/surveys');
            const allEmployees = await api.get('/employees');
            setSurveys(allSurveys);
            setEmployees(allEmployees);
        } catch (err) {
            toast.error('Gagal memuat data dashboard');
        }
    }

    const filteredSurveys = useMemo(() => {
        return surveys.filter(s => {
            if (!s.created_at) return false;
            const d = new Date(s.created_at);
            if (startDate && new Date(startDate) > d) return false;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (end < d) return false;
            }
            return true;
        });
    }, [surveys, startDate, endDate]);

    const surveyedEmployeeIds = new Set(filteredSurveys.map(s => s.employee_id).filter(Boolean));
    const autoSurveyed = surveyedEmployeeIds.size;
    const autoTotal = employees.length;
    const notSurveyed = autoTotal - autoSurveyed;

    const unSurveyedEmployees = useMemo(() => {
        const surveyedIds = new Set(filteredSurveys.map(s => s.employee_id).filter(Boolean));
        const surveyedNiks = new Set(filteredSurveys.map(s => s.employee_nik).filter(Boolean));
        return employees.filter(emp => !surveyedIds.has(emp.id) && !surveyedNiks.has(emp.nik));
    }, [employees, filteredSurveys]);

    const monthlyData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        return months.map((label, index) => {
            const count = filteredSurveys.filter(s => {
                if (!s.created_at) return false;
                return new Date(s.created_at).getMonth() === index;
            }).length;
            return { label, value: count };
        });
    }, [filteredSurveys]);

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
            doc.text(`Total survey: ${filteredSurveys.length} | Karyawan: ${employees.length}`, 14, 34);
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
            filteredSurveys.forEach((s, idx) => {
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
        <div className="dashboard-v2">
            {/* Header and Filter */}
            <div className="header" style={{ flexWrap: 'wrap' }}>
                <div className="logo">S</div>
                <div>
                    <h1>Survey Karyawan</h1>
                    <p>Dashboard & Monitoring</p>
                </div>
                <div className="badge-live" style={{ marginLeft: 'auto' }}>● Live</div>
            </div>

            <div className="filter-row">
                <span className="filter-label">Filter Data:</span>
                <input 
                    type="date" 
                    className="filter-input" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Dari Tanggal"
                />
                <span style={{ color: 'var(--text-dim)' }}>—</span>
                <input 
                    type="date" 
                    className="filter-input" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Sampai Tanggal"
                />
                {(startDate || endDate) && (
                    <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        style={{ marginLeft: 'auto', padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'white' }}
                    >
                         Reset Filter
                    </button>
                )}
                <button 
                    className="btn btn-sm btn-primary" 
                    style={{ marginLeft: (startDate || endDate) ? '8px' : 'auto', background: 'var(--purple)', border: 'none' }}
                    onClick={handlePrintAllSummary}
                    title="Print Summary PDF"
                >
                    🖨️ PDF
                </button>
            </div>

            {/* Top Grid: Donut + Bar */}
            <div className="grid">
                {/* Donut Card */}
                <div className="card">
                    <div className="card-title">Status Survey</div>
                    <div className="card-subtitle">Total {autoTotal} target karyawan</div>
                    <DonutChart surveyed={autoSurveyed} total={autoTotal} label="Karyawan" />
                </div>

                {/* Bar Chart Card */}
                <div className="card">
                    <div className="card-title bar-card-title">Survey per Bulan</div>
                    <div className="card-subtitle">Bulan berjalan · rentang terpilih</div>
                    <BarChart data={monthlyData} />
                </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-val" style={{color:'#4f8ef7'}}>{autoSurveyed}</div>
                    <div className="stat-lbl">Sudah Disurvey</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-val" style={{color:'#a0aac0'}}>{notSurveyed}</div>
                    <div className="stat-lbl">Belum Disurvey</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-val" style={{color:'#a78bfa'}}>{autoTotal}</div>
                    <div className="stat-lbl">Target Karyawan</div>
                </div>
            </div>

            {/* Vector Map Section */}
            <div className="grid">
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 className="card-title" style={{ fontSize: '15px', color:'var(--text)', textTransform:'none', margin:0, marginBottom:'16px' }}>📍 Peta Sebaran Karyawan</h2>
                    <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '300px', background: 'url("https://vemaps.com/uploads/img/id-02.png") center/100% 100% no-repeat' }}>
                        {mapCounts.map(marker => (
                            <div key={marker.id} className="map-pin-group" style={{ position: 'absolute', top: `${marker.top}%`, left: `${marker.left}%`, transform: 'translate(-50%, -100%)' }}>
                                <div className="map-pin"></div>
                                <div className="map-pin-pulse"></div>
                                <div className="map-tooltip">
                                    <div className="map-tooltip-title">{marker.name}</div>
                                    <div className="map-tooltip-val">{marker.count} <span>karyawan</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
                    <h2 className="card-title" style={{ fontSize: '15px', color:'var(--text)', textTransform:'none', margin:0, marginBottom:'16px' }}>✏️ Edit Peta Sekitar</h2>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '12px' }}>
                        {mapCounts.map(marker => (
                            <div key={marker.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: 'var(--surface2)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{marker.name}</span>
                                <input 
                                    type="number" 
                                    value={marker.count} 
                                    onChange={(e) => updateMapCount(marker.id, parseInt(e.target.value) || 0)}
                                    style={{ width: '56px', background: 'var(--bg)', border: '1px solid var(--purple)', color: 'var(--accent)', padding: '6px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Unsurveyed Employees List */}
            <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '15px', color:'var(--text)', textTransform:'none' }}>
                    <span>‼️ Belum di Survey</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, marginLeft:'auto' }}>
                        {unSurveyedEmployees.length} karyawan
                    </span>
                </h2>
                <div className="card-subtitle">Karyawan yang belum mengisi survey berdasarkan filter</div>
                
                {unSurveyedEmployees.length === 0 ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎉</div>
                        <div style={{ fontWeight: 600 }}>Semua Sudah Disurvey!</div>
                    </div>
                ) : (
                    <div className="survey-list" style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {unSurveyedEmployees.map((emp) => (
                            <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '10px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: '1rem' }}>‼️</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text)' }}>{emp.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                        <span>🆔 {emp.nik} &nbsp; 🏢 {emp.department || '-'}</span>
                                    </div>
                                </div>
                                <Link to="/survey/new" className="btn" style={{ background: 'var(--purple)', color: '#fff', fontSize: '12px', padding: '6px 14px', borderRadius: '8px', textDecoration: 'none' }}>
                                    📋 Survey
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <Link to="/survey/new" className="btn" style={{ background: 'var(--purple-blue)', color: '#fff', textAlign: 'center', padding: '16px', borderRadius: '14px', fontSize: '15px', textDecoration: 'none' }}>
                    📋 Survey Baru
                </Link>
                <Link to="/history" className="btn" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', textAlign: 'center', padding: '16px', borderRadius: '14px', fontSize: '15px', textDecoration: 'none' }}>
                    🕐 Riwayat Survey
                </Link>
            </div>

            {/* Recent Surveys */}
            <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="card-title" style={{ fontSize: '15px', color:'var(--text)', textTransform:'none', margin:0 }}>📋 Survey Terbaru</h2>
                    <Link to="/history" className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration:'none' }}>Lihat Semua →</Link>
                </div>
                {filteredSurveys.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
                        <div style={{ fontWeight: 600 }}>Belum Ada Survey</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredSurveys.slice(0, 5).map((s) => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <Link to={`/detail/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--surface)', borderRadius: '10px', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: 'var(--purple)' }}>
                                        {s.employeeName?.[0] || '?'}
                                    </div>
                                    <div style={{flex: 1}}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color:'var(--text)' }}>{s.employeeName || 'Unnamed'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                            📅 {new Date(s.createdAt).toLocaleDateString('id-ID')} · 👤 {s.surveyorName}
                                        </div>
                                    </div>
                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, 
                                        background: s.status === 'draft' ? 'var(--warning-bg, rgba(245,158,11,0.2))' : s.status === 'verified' ? 'var(--success-bg, rgba(16,185,129,0.2))' : 'var(--info-bg, rgba(59,130,246,0.2))',
                                        color: s.status === 'draft' ? 'var(--warning, #f59e0b)' : s.status === 'verified' ? 'var(--success, #10b981)' : 'var(--info, #3b82f6)' }}>
                                        {s.status === 'draft' ? '📝 Draft' : s.status === 'verified' ? '✅ Verified' : '💾 Saved'}
                                    </span>
                                </Link>
                                <button
                                    onClick={(e) => { e.preventDefault(); handlePrintSurvey(s); }}
                                    title="Print PDF"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', fontSize: '16px' }}
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
