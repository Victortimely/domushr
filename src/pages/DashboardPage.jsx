import { useState, useEffect, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateSurveyPDF } from '../services/pdfService';
import '../styles/dashboard.css';

// Import our Vector Map GeoJSON
import indonesiaGeoJson from '../assets/indonesia-provinces.json';

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
                      <div key={i} className="bar-col" style={{ height: '100%', justifyContent: 'flex-end' }}>
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
    { id: 1, name: 'Aceh', lat: 4.5, lng: 96.5, count: 5 },
    { id: 2, name: 'Sumatera Utara', lat: 2.0, lng: 99.0, count: 12 },
    { id: 3, name: 'Sumatera Barat', lat: -0.5, lng: 100.5, count: 8 },
    { id: 4, name: 'Riau', lat: 0.5, lng: 101.5, count: 4 },
    { id: 5, name: 'Jambi', lat: -1.5, lng: 103.5, count: 6 },
    { id: 6, name: 'Palembang', lat: -2.95, lng: 104.75, count: 15 },
    { id: 7, name: 'Lampung', lat: -4.5, lng: 105.0, count: 10 },
    { id: 8, name: 'Banten', lat: -6.4, lng: 106.1, count: 8 },
    { id: 9, name: 'DKI Jakarta', lat: -6.2, lng: 106.8, count: 45 },
    { id: 10, name: 'Jawa Barat', lat: -6.9, lng: 107.5, count: 32 },
    { id: 11, name: 'Jawa Tengah', lat: -7.3, lng: 110.0, count: 28 },
    { id: 12, name: 'Jawa Timur', lat: -7.6, lng: 112.5, count: 35 },
    { id: 13, name: 'Bali', lat: -8.3, lng: 115.0, count: 12 },
    { id: 14, name: 'NTB', lat: -8.6, lng: 117.5, count: 4 },
    { id: 15, name: 'NTT', lat: -8.7, lng: 121.0, count: 3 },
    { id: 16, name: 'Kalbar', lat: -0.5, lng: 111.0, count: 7 },
    { id: 17, name: 'Kalteng', lat: -1.5, lng: 113.5, count: 5 },
    { id: 18, name: 'Kalsel', lat: -2.5, lng: 115.5, count: 8 },
    { id: 19, name: 'Kaltim', lat: 0.5, lng: 116.5, count: 11 },
    { id: 20, name: 'Sulsel', lat: -4.0, lng: 120.0, count: 18 },
    { id: 21, name: 'Sulteng', lat: -1.0, lng: 120.5, count: 5 },
    { id: 22, name: 'Sulut', lat: 1.0, lng: 124.5, count: 8 },
    { id: 23, name: 'Maluku', lat: -3.0, lng: 129.5, count: 5 },
    { id: 24, name: 'Papua Barat', lat: -1.5, lng: 132.5, count: 6 },
    { id: 25, name: 'Papua', lat: -4.0, lng: 139.0, count: 15 },
    { id: 26, name: 'Ciracas', lat: -6.35, lng: 106.88, count: 20 },
    { id: 27, name: 'Joglo', lat: -6.19, lng: 106.73, count: 14 },
    { id: 28, name: 'Bekasi', lat: -6.24, lng: 107.0, count: 18 },
    { id: 29, name: 'Tanjung Pandan', lat: -2.75, lng: 107.63, count: 8 },
];

export default function DashboardPage() {
    usePageMeta('Dashboard', 'Dashboard monitoring data vetting karyawan — statistik survey, peta sebaran, dan survey terbaru.');
    const { user } = useAuth();
    const toast = useToast();
    const [surveys, setSurveys] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mapCounts, setMapCounts] = useState([]);
    const [newMarker, setNewMarker] = useState({ name: '', lat: 0, lng: 118, count: 0 });
    const [mapZoom, setMapZoom] = useState(1);

    useEffect(() => {
        loadMapData();
        loadData();
    }, []);

    async function loadMapData() {
        try {
            const data = await api.get('/settings/indonesiaMapData');
            if (data && data.value) {
                const parsed = JSON.parse(data.value);
                setMapCounts(parsed);
            } else {
                setMapCounts(initialMapData);
            }
        } catch (err) {
            console.error('Failed to load map data from API, using initial:', err);
            setMapCounts(initialMapData);
        }
    }

    const handleSaveMap = async () => {
        try {
            await api.put('/settings/indonesiaMapData', { value: JSON.stringify(mapCounts) });
            toast.success('Peta sebaran karyawan berhasil disimpan ke database');
        } catch (err) {
            toast.error('Gagal menyimpan peta: ' + err.message);
        }
    };

    const updateMapCount = (id, newCount) => {
        const updated = mapCounts.map(m => m.id === id ? { ...m, count: newCount } : m);
        setMapCounts(updated);
    };

    const handleAddMarker = (e) => {
        e.preventDefault();
        if (!newMarker.name) {
            toast.error('Nama lokasi tidak boleh kosong');
            return;
        }
        const marker = {
            id: Date.now(),
            name: newMarker.name,
            lat: parseFloat(newMarker.lat),
            lng: parseFloat(newMarker.lng),
            count: parseInt(newMarker.count) || 0
        };
        const updated = [...mapCounts, marker];
        setMapCounts(updated);
        setNewMarker({ name: '', lat: 0, lng: 118, count: 0 });
        toast.success(`Titik lokasi ${marker.name} ditambahkan (Klik simpan untuk permanen)`);
    };

    const handleDeleteMarker = (id) => {
        const updated = mapCounts.filter(m => m.id !== id);
        setMapCounts(updated);
        toast.success('Lokasi dihapus (Klik simpan untuk permanen)');
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
                <div>
                    <h1>Dashboard</h1>
                    <p>monitoring data vetting</p>
                </div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div className="card-title bar-card-title" style={{ marginBottom: 0 }}>Survey per Bulan</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)', background: 'var(--purple-light)', padding: '2px 8px', borderRadius: '12px' }}>
                            {new Date().getFullYear()}
                        </div>
                    </div>
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
            <div className="card" style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '24px', padding: '24px' }}>
                <h2 className="card-title" style={{ fontSize: '15px', color:'var(--text)', textTransform:'none', margin:0, marginBottom:'16px' }}>📍 Peta Sebaran Karyawan</h2>
                
                {/* Visual Map Area */}
                <div style={{ position: 'relative', width: '100%', minHeight: '400px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ComposableMap
                        projection="geoMercator"
                        projectionConfig={{
                            scale: 1000,
                            center: [118, -2] // Center roughly on Indonesia
                        }}
                        style={{
                            width: "100%",
                            height: "auto",
                        }}
                    >
                        <ZoomableGroup 
                            zoom={1} 
                            maxZoom={10} 
                            minZoom={1} 
                            onMove={({ zoom }) => setMapZoom(zoom)}
                        >
                            <Geographies geography={indonesiaGeoJson}>
                                {({ geographies }) =>
                                    geographies.map((geo) => (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="#e2e8f0"
                                            stroke="#cbd5e1"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "#bfdbfe", outline: "none" },
                                                pressed: { fill: "#93c5fd", outline: "none" },
                                            }}
                                        />
                                    ))
                                }
                            </Geographies>

                            {mapCounts.map(marker => (
                                <Marker key={marker.id} coordinates={[marker.lng, marker.lat]}>
                                    <g className="map-pin-group" transform={`scale(${1 / mapZoom})`} style={{ cursor: 'pointer' }}>
                                        {/* Pulse Animation (Native SVG) */}
                                        <circle cx={0} cy={0} r={8} fill="rgba(37, 99, 235, 0.4)">
                                            <animate attributeName="r" from="4" to="16" dur="2s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" from="1" to="0" dur="2s" repeatCount="indefinite" />
                                        </circle>
                                        {/* Pin Core */}
                                        <circle cx={0} cy={0} r={4} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />
                                        
                                        {/* Permanent Text Label Below Pin */}
                                        <text
                                            textAnchor="middle"
                                            y={14}
                                            style={{ fontFamily: "Inter", fontSize: "10px", fontWeight: 700, fill: "#1e293b", textShadow: "0px 0px 4px rgba(255,255,255,0.9)" }}
                                        >
                                            {marker.name}
                                        </text>
                                        <text
                                            textAnchor="middle"
                                            y={26}
                                            style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 800, fill: "#2563eb", textShadow: "0px 0px 4px rgba(255,255,255,0.9)" }}
                                        >
                                            {marker.count}
                                        </text>
                                    </g>
                                </Marker>
                            ))}
                        </ZoomableGroup>
                    </ComposableMap>
                    
                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '10px', alignItems: 'flex-end', zIndex: 10, flexWrap: 'wrap', maxWidth: 'calc(100% - 32px)' }}>
                        {/* Total Karyawan Box */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Karyawan</span>
                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>
                                {mapCounts.reduce((sum, m) => sum + (parseInt(m.count) || 0), 0)}
                            </span>
                        </div>
                        {/* Branch Location Boxes */}
                        {['Ciracas', 'Joglo', 'Bekasi', 'Palembang', 'Tanjung Pandan'].map(branch => {
                            const found = mapCounts.find(m => m.name.toLowerCase() === branch.toLowerCase());
                            const count = found ? (parseInt(found.count) || 0) : 0;
                            const colors = { 'Ciracas': '#8b5cf6', 'Joglo': '#10b981', 'Bekasi': '#f59e0b', 'Palembang': '#ef4444', 'Tanjung Pandan': '#06b6d4' };
                            return (
                                <div key={branch} style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${colors[branch]}30`, display: 'flex', flexDirection: 'column', gap: '1px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: '80px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>{branch}</span>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: colors[branch] }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Edit Menu Area — Master Only */}
                {user?.role === 'master' && (
                    <>
                        <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '24px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 className="card-title" style={{ fontSize: '15px', color:'var(--text)', textTransform:'none', margin:0 }}>✏️ Edit & Tambah Lokasi</h2>
                            <button className="btn btn-primary" onClick={handleSaveMap} style={{ background: 'var(--success, #10b981)', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '13px' }}>
                                💾 Simpan Perubahan Peta
                            </button>
                        </div>
                        
                        {/* Data List Editor */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                            {mapCounts.map(marker => (
                                <div key={marker.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{marker.name}</span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Posisi: Lon={marker.lng} Lat={marker.lat}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            type="number" 
                                            value={marker.count} 
                                            onChange={(e) => updateMapCount(marker.id, parseInt(e.target.value) || 0)}
                                            title="Jumlah Karyawan"
                                            style={{ width: '60px', background: 'var(--bg)', border: '1px solid var(--purple)', color: 'var(--text)', padding: '6px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}
                                        />
                                        <button 
                                            onClick={() => handleDeleteMarker(marker.id)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                            title="Hapus Lokasi"
                                        >
                                            ✖
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add New Point Form */}
                        <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>Nama Daerah</label>
                                <input className="form-input" style={{ background: 'var(--bg)', padding: '8px 12px' }} placeholder="Cth: Makassar" value={newMarker.name} onChange={(e) => setNewMarker({...newMarker, name: e.target.value})} />
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>Longitude</label>
                                <input className="form-input" type="number" step="0.1" style={{ background: 'var(--bg)', padding: '8px 12px' }} value={newMarker.lng} onChange={(e) => setNewMarker({...newMarker, lng: e.target.value})} />
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>Latitude</label>
                                <input className="form-input" type="number" step="0.1" style={{ background: 'var(--bg)', padding: '8px 12px' }} value={newMarker.lat} onChange={(e) => setNewMarker({...newMarker, lat: e.target.value})} />
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>Jml. Karyawan</label>
                                <input className="form-input" type="number" style={{ background: 'var(--bg)', padding: '8px 12px' }} value={newMarker.count} onChange={(e) => setNewMarker({...newMarker, count: Number(e.target.value)})} />
                            </div>
                            <button className="btn btn-primary" onClick={handleAddMarker} style={{ padding: '8px 16px', height: '38px', borderRadius: '8px' }}>+ Tambah</button>
                        </div>
                    </>
                )}
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
                                        {s.employee_name?.[0] || '?'}
                                    </div>
                                    <div style={{flex: 1}}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color:'var(--text)' }}>{s.employee_name || 'Unnamed'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                            📅 {new Date(s.created_at).toLocaleDateString('id-ID')} · 👤 {s.surveyor_name}
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
