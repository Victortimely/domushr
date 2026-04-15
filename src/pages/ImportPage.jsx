import { useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    parseExcelFile,
    importEmployees,
    importSurveys,
    downloadEmployeeTemplate,
    downloadSurveyTemplate,
    exportSurveysToExcel,
} from '../services/excelService';

export default function ImportPage() {
    usePageMeta('Import & Export Data', 'Import data karyawan dan survey dari Excel, atau export seluruh data ke file Excel.');
    const { user } = useAuth();
    const toast = useToast();
    const [importType, setImportType] = useState('employees');
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileSelect = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        setFile(selected);
        setResult(null);

        try {
            const data = await parseExcelFile(selected);
            setPreviewData(data);
            toast.info(`${data.length} baris data ditemukan`);
        } catch (err) {
            toast.error(err.message);
            setPreviewData(null);
        }
    };

    const handleImport = async () => {
        if (!previewData || previewData.length === 0) {
            toast.error('Tidak ada data untuk diimport');
            return;
        }

        setImporting(true);
        try {
            let res;
            if (importType === 'employees') {
                res = await importEmployees(previewData);
                toast.success(`✅ ${res.added} karyawan ditambahkan${res.skipped ? `, ${res.skipped} dilewati (NIK sudah ada)` : ''}`);
            } else {
                res = await importSurveys(previewData, user.id, user.name);
                toast.success(`✅ ${res.added} survey berhasil diimport`);
            }
            setResult(res);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreviewData(null);
        setResult(null);
    };

    const previewColumns = previewData && previewData.length > 0 ? Object.keys(previewData[0]) : [];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Import & Export Data</h1>
                <p className="page-subtitle">Import dari Excel atau export data survey</p>
            </div>

            {/* Download Templates */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <h2 className="card-title">📥 Download Template Excel</h2>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Download template terlebih dahulu, isi data, lalu upload untuk import
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={downloadEmployeeTemplate}>
                        📋 Template Data Karyawan
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={downloadSurveyTemplate}>
                        📊 Template Data Survey
                    </button>
                </div>
            </div>

            {/* Import Section */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <h2 className="card-title">📤 Import dari Excel</h2>
                </div>

                {/* Type Selection */}
                <div className="nav-tabs" style={{ marginBottom: 16 }}>
                    <button className={`nav-tab ${importType === 'employees' ? 'active' : ''}`} onClick={() => { setImportType('employees'); handleReset(); }}>
                        👥 Data Karyawan
                    </button>
                    <button className={`nav-tab ${importType === 'surveys' ? 'active' : ''}`} onClick={() => { setImportType('surveys'); handleReset(); }}>
                        📋 Data Survey
                    </button>
                </div>

                {/* File Upload */}
                <div className="form-group">
                    <label className="form-label">Upload File Excel (.xlsx)</label>
                    <div
                        style={{
                            border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
                            padding: 24, textAlign: 'center', cursor: 'pointer',
                            background: 'var(--bg-input)', transition: 'var(--transition)',
                        }}
                        onClick={() => document.getElementById('excel-file-input').click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = 'var(--border)';
                            const f = e.dataTransfer.files[0];
                            if (f) {
                                const fakeEvent = { target: { files: [f] } };
                                handleFileSelect(fakeEvent);
                            }
                        }}
                    >
                        {file ? (
                            <>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
                                <div style={{ fontWeight: 600 }}>{file.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {(file.size / 1024).toFixed(1)} KB • {previewData?.length || 0} baris
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleReset(); }} style={{ marginTop: 8 }}>
                                    ✕ Ganti File
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📁</div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Klik atau drag file ke sini</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Format: .xlsx, .xls</div>
                            </>
                        )}
                    </div>
                    <input
                        id="excel-file-input"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Preview */}
                {previewData && previewData.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">📋 Preview Data ({previewData.length} baris)</label>
                        <div style={{ overflow: 'auto', maxHeight: 300, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>#</th>
                                        {previewColumns.map((col) => <th key={col} style={thStyle}>{col}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            <td style={tdStyle}>{i + 1}</td>
                                            {previewColumns.map((col) => (
                                                <td key={col} style={tdStyle}>{String(row[col] || '').slice(0, 30)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {previewData.length > 10 && (
                                        <tr>
                                            <td colSpan={previewColumns.length + 1} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                ...dan {previewData.length - 10} baris lainnya
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Import Result */}
                {result && (
                    <div style={{
                        marginTop: 16, padding: 16, background: 'var(--success-bg)',
                        border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)',
                    }}>
                        <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>✅ Import Berhasil!</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {result.added} data ditambahkan
                            {result.skipped > 0 && ` • ${result.skipped} dilewati (sudah ada)`}
                        </div>
                    </div>
                )}

                {/* Import Button */}
                {previewData && !result && (
                    <button
                        className="btn btn-primary btn-block btn-lg"
                        onClick={handleImport}
                        disabled={importing}
                        style={{ marginTop: 16 }}
                        id="import-data-btn"
                    >
                        {importing ? <><span className="spinner" /> Mengimport...</> : `📥 Import ${previewData.length} Data ${importType === 'employees' ? 'Karyawan' : 'Survey'}`}
                    </button>
                )}
            </div>

            {/* Export Section */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">📊 Export Data</h2>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Export seluruh data survey ke file Excel
                </p>
                <button className="btn btn-success btn-sm" onClick={() => { exportSurveysToExcel(); toast.success('File Excel didownload'); }}>
                    📊 Export Semua Survey ke Excel
                </button>
            </div>
        </div>
    );
}

const thStyle = {
    padding: '8px 12px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
};

const tdStyle = {
    padding: '6px 12px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
};
