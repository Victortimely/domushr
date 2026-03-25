import { jsPDF } from 'jspdf';

export async function generateSurveyPDF(survey) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN SURVEY KARYAWAN', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: SRV-${String(survey.id).padStart(4, '0')}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Tanggal: ${new Date(survey.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 34, { align: 'center' });

    y = 50;
    doc.setTextColor(30, 41, 59);

    // Section: Identitas
    y = addSection(doc, 'DATA IDENTITAS', y, margin, contentWidth);
    y = addRow(doc, 'Nama Karyawan', survey.employeeName || '-', y, margin);
    y = addRow(doc, 'NIK', survey.employeeNik || '-', y, margin);
    y = addRow(doc, 'Departemen', survey.employeeDept || '-', y, margin);
    y = addRow(doc, 'Jabatan', survey.employeePosition || '-', y, margin);
    y = addRow(doc, 'Surveyor', survey.surveyorName || '-', y, margin);
    y = addRow(doc, 'Tanggal Survey', formatDateTime(survey.createdAt), y, margin);

    y += 5;

    // Section: Lokasi
    y = addSection(doc, 'DATA LOKASI', y, margin, contentWidth);
    y = addRow(doc, 'Latitude', survey.latitude ? String(survey.latitude) : '-', y, margin);
    y = addRow(doc, 'Longitude', survey.longitude ? String(survey.longitude) : '-', y, margin);
    y = addRow(doc, 'Akurasi GPS', survey.accuracy ? `±${Math.round(survey.accuracy)}m` : '-', y, margin);

    if (survey.latitude && survey.longitude) {
        const mapsUrl = `https://www.google.com/maps?q=${survey.latitude},${survey.longitude}`;
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(9);
        doc.text(`Lihat di Google Maps: ${mapsUrl}`, margin, y + 5);
        doc.setTextColor(30, 41, 59);
        y += 12;
    }

    y += 5;

    // Section: Foto
    y = addSection(doc, 'DOKUMENTASI FOTO', y, margin, contentWidth);
    const photoLabels = ['Rumah (Depan)', 'Selfie dengan Karyawan', 'Foto dengan Ketua RT'];
    for (let i = 0; i < 3; i++) {
        const photoKey = `photo${i}`;
        const photoData = survey[photoKey];

        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${photoLabels[i]}`, margin, y);
        y += 5;

        if (photoData) {
            try {
                doc.addImage(photoData, 'JPEG', margin, y, 60, 45);
                y += 50;
            } catch {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.text('[Foto tersimpan - tidak dapat ditampilkan di PDF]', margin, y);
                y += 8;
            }
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text('[Belum ada foto]', margin, y);
            y += 8;
        }
    }

    y += 5;

    // Section: Audio
    if (y > 250) { doc.addPage(); y = 20; }
    y = addSection(doc, 'REKAMAN & CATATAN', y, margin, contentWidth);
    y = addRow(doc, 'Audio', survey.audioBlob ? 'Tersimpan ✓' : 'Tidak ada', y, margin);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Wawancara:', margin, y + 3);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const summaryText = survey.interviewSummary || 'Tidak ada ringkasan';
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(splitSummary, margin, y);
    y += splitSummary.length * 5 + 5;

    // Section: Tanda Tangan
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSection(doc, 'TANDA TANGAN DIGITAL', y, margin, contentWidth);

    if (survey.signature) {
        try {
            doc.addImage(survey.signature, 'PNG', margin, y, 60, 30);
            y += 35;
        } catch {
            doc.text('[Tanda tangan tersimpan]', margin, y);
            y += 8;
        }
    } else {
        doc.setFontSize(9);
        doc.text('[Belum ada tanda tangan]', margin, y);
        y += 8;
    }

    // Footer
    if (y > 260) { doc.addPage(); y = 20; }
    y += 10;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Dibuat otomatis oleh Sistem Survey Karyawan — ${formatDateTime(new Date().toISOString())}`, pageWidth / 2, y, { align: 'center' });
    doc.text(`Status: ${survey.status?.toUpperCase() || 'DRAFT'}`, pageWidth / 2, y + 5, { align: 'center' });

    // Save
    const filename = `Survey_${survey.employeeName?.replace(/\s+/g, '_') || 'Unknown'}_${new Date(survey.createdAt).toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return filename;
}

function addSection(doc, title, y, margin, contentWidth) {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, contentWidth, 10, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin + 4, y + 3);
    return y + 14;
}

function addRow(doc, label, value, y, margin) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label, margin + 4, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), margin + 60, y);
    return y + 7;
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
