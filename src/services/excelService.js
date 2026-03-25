import * as XLSX from 'xlsx';
import api from './api';

// ============ HELPER: SAVE FILE ============

function saveWorkbook(wb, filename) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// ============ TEMPLATES ============

export function downloadEmployeeTemplate() {
    const headers = ['NIK', 'Nama', 'Divisi', 'Jabatan', 'Alamat KTP', 'Alamat Saat Ini'];
    const example = [
        ['EMP021', 'Nama Karyawan', 'IT', 'Programmer', 'Jl. Contoh No. 1, Jakarta', 'Jl. Domisili No. 5, Bekasi'],
        ['EMP022', 'Nama Lain', 'HRD', 'Staff', 'Jl. Contoh No. 2, Bandung', 'Jl. Domisili No. 10, Bandung'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');
    saveWorkbook(wb, 'Template_Data_Karyawan.xlsx');
}

export function downloadSurveyTemplate() {
    const headers = [
        'Nama Karyawan', 'NIK', 'Divisi', 'Jabatan', 'Alamat KTP',
        'Tanggal Survey', 'Jam Survey', 'Surveyor',
        'Latitude', 'Longitude', 'Akurasi GPS',
        'Ringkasan Wawancara', 'Status',
    ];
    const example = [
        ['Andi Wijaya', 'EMP001', 'Produksi', 'Operator', 'Jl. Merdeka No. 10',
            '2026-03-16', '10:30', 'Ahmad Firdaus; Siti Rahmawati',
            '-6.200000', '106.800000', '15',
            'Rumah sesuai data, lingkungan baik', 'saved'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    ws['!cols'] = [
        { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 35 },
        { wch: 14 }, { wch: 10 }, { wch: 30 },
        { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 40 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Survey');
    saveWorkbook(wb, 'Template_Data_Survey.xlsx');
}

// ============ IMPORT ============

export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const sheetName = wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
                resolve(data);
            } catch (err) {
                reject(new Error('Gagal membaca file Excel: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsArrayBuffer(file);
    });
}

export async function importEmployees(rows) {
    const employees = rows.map((row) => ({
        nik: String(row['NIK'] || row['nik'] || '').trim(),
        name: String(row['Nama'] || row['nama'] || row['Name'] || '').trim(),
        department: String(row['Divisi'] || row['divisi'] || row['Department'] || '').trim(),
        position: String(row['Jabatan'] || row['jabatan'] || row['Position'] || '').trim(),
        address: String(row['Alamat KTP'] || row['alamat'] || row['Address'] || '').trim(),
        current_address: String(row['Alamat Saat Ini'] || row['alamat saat ini'] || row['Current Address'] || '').trim(),
    })).filter((e) => e.name && e.nik);

    if (employees.length === 0) throw new Error('Tidak ada data valid ditemukan');

    const result = await api.post('/employees/import', { employees });
    return { added: result.imported, skipped: employees.length - result.imported, total: employees.length };
}

export async function importSurveys(rows, surveyorId, surveyorName) {
    const surveys = rows.map((row) => {
        const dateStr = row['Tanggal Survey'] || row['tanggal'] || '';
        const timeStr = row['Jam Survey'] || row['jam'] || '';
        let survey_date;
        if (dateStr) {
            const d = new Date(dateStr);
            if (timeStr) {
                const [h, m] = String(timeStr).split(':');
                d.setHours(parseInt(h) || 0, parseInt(m) || 0);
            }
            survey_date = d.toISOString();
        } else {
            survey_date = new Date().toISOString();
        }

        return {
            employee_name: String(row['Nama Karyawan'] || row['nama'] || '').trim(),
            employee_nik: String(row['NIK'] || row['nik'] || '').trim(),
            employee_dept: String(row['Divisi'] || row['divisi'] || '').trim(),
            survey_date,
            latitude: parseFloat(row['Latitude'] || row['latitude']) || null,
            longitude: parseFloat(row['Longitude'] || row['longitude']) || null,
            accuracy: parseFloat(row['Akurasi GPS'] || row['akurasi']) || null,
            data: {
                employeePosition: String(row['Jabatan'] || row['jabatan'] || '').trim(),
                interviewSummary: String(row['Ringkasan Wawancara'] || row['ringkasan'] || '').trim(),
            },
            status: String(row['Status'] || row['status'] || 'saved').trim().toLowerCase(),
        };
    }).filter((s) => s.employee_name);

    if (surveys.length === 0) throw new Error('Tidak ada data valid ditemukan');

    let added = 0;
    for (const survey of surveys) {
        await api.post('/surveys', survey);
        added++;
    }

    return { added, total: surveys.length };
}

// ============ EXPORT ============

export async function exportSurveysToExcel() {
    const surveys = await api.get('/surveys');
    const rows = surveys.map((s) => ({
        'Nama Karyawan': s.employee_name || '',
        'NIK': s.employee_nik || '',
        'Divisi': s.employee_dept || '',
        'Jabatan': s.data?.employeePosition || '',
        'Tanggal Survey': s.survey_date ? new Date(s.survey_date).toISOString().slice(0, 10) : '',
        'Surveyor': s.surveyor_name || '',
        'Latitude': s.latitude || '',
        'Longitude': s.longitude || '',
        'Akurasi GPS': s.accuracy ? Math.round(s.accuracy) : '',
        'Ringkasan Wawancara': s.data?.interviewSummary || '',
        'Status': s.status || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Survey');
    saveWorkbook(wb, `Export_Survey_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
