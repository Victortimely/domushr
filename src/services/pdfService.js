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
    doc.text(`Tanggal: ${new Date(survey.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 34, { align: 'center' });

    y = 50;
    doc.setTextColor(30, 41, 59);

    // Section: Identitas
    y = addSection(doc, 'DATA IDENTITAS', y, margin, contentWidth);
    y = addRow(doc, 'Nama Karyawan', survey.employee_name || '-', y, margin);
    y = addRow(doc, 'NIK', survey.employee_nik || '-', y, margin);
    y = addRow(doc, 'Departemen', survey.employee_dept || '-', y, margin);
    y = addRow(doc, 'Jabatan', survey.data?.employeePosition || '-', y, margin);
    y = addRow(doc, 'Surveyor', survey.surveyor_name || '-', y, margin);
    y = addRow(doc, 'Tanggal Survey', formatDateTime(survey.created_at), y, margin);

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
        const photoData = survey.data?.[photoKey];

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
    y = addRow(doc, 'Audio', survey.data?.audioBlob ? 'Tersimpan ✓' : 'Tidak ada', y, margin);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Wawancara:', margin, y + 3);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const summaryText = survey.data?.interviewSummary || 'Tidak ada ringkasan';
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
    const filename = `Survey_${survey.employee_name?.replace(/\s+/g, '_') || 'Unknown'}_${new Date(survey.created_at).toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return filename;
}

export async function generateSurveyPlannerPDF(trip) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    doc.setFillColor(7, 5, 17); // Admin Universe dark color
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo Icon 📋
    doc.setFillColor(139, 92, 246); // Purple accent
    doc.roundedRect(margin, 12, 10, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('📋', margin + 1.5, 20);

    doc.setTextColor(241, 245, 249);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SURVEY TRIP PLANNER REPORT', margin + 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(167, 139, 250); // Light purple
    doc.text('DOMUS HR SYSTEM — LAPORAN RENCANA PERJALANAN', margin + 15, 27);
    
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`Dicetak pada: ${formatDateTime(new Date().toISOString())}`, pageWidth - margin, 18, { align: 'right' });

    y = 50;

    // SECTION I: RINGKASAN PERJALANAN (MY TRIPS)
    y = addSection(doc, 'I. RINGKASAN PERJALANAN (MY TRIPS)', y, margin, contentWidth);
    y = addRow(doc, 'Nama Trip', trip.name || '-', y, margin);
    y = addRow(doc, 'Tipe Vetting', trip.type === 'luar-kota' ? 'Vetting Luar Kota' : 'Vetting Jabodetabek', y, margin);
    
    const startDateStr = trip.startDate || trip.start_date;
    const endDateStr = trip.endDate || trip.end_date;
    y = addRow(doc, 'Tanggal Mulai', startDateStr ? new Date(startDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', y, margin);
    y = addRow(doc, 'Tanggal Selesai', endDateStr ? new Date(endDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', y, margin);
    
    const totalBudgetLimit = Number(trip.budget?.total || trip.totalBudget || 0);
    y = addRow(doc, 'Plafon Anggaran', 'Rp ' + totalBudgetLimit.toLocaleString('id-ID'), y, margin);
    y += 8;

    // SECTION II: DAFTAR TARGET VETTING (ITINERARY)
    y = addSection(doc, 'II. DAFTAR TARGET VETTING (ITINERARY)', y, margin, contentWidth);
    const itinerary = trip.itinerary || [];
    if (itinerary.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Belum ada target yang ditambahkan.', margin + 4, y);
        y += 10;
    } else {
        // Table Header
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, contentWidth, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100);
        doc.text('HARI', margin + 2, y + 1);
        doc.text('JAM', margin + 12, y + 1);
        doc.text('KARYAWAN (ID)', margin + 25, y + 1);
        doc.text('LOKASI & KOORDINAT', margin + 85, y + 1);
        y += 10;

        itinerary.forEach((item, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(`H-${item.day || 1}`, margin + 2, y);
            doc.text(item.time || '-', margin + 12, y);
            doc.setFont('helvetica', 'bold');
            doc.text(`${item.employeeName || '-'} (${item.employeeId || '-'})`, margin + 25, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const locText = `${item.address || '-'}\nCoord: ${item.coordinates || '-'}`;
            const splitLoc = doc.splitTextToSize(locText, contentWidth - 85);
            doc.text(splitLoc, margin + 85, y);
            y += splitLoc.length * 4 + 4;
            
            doc.setDrawColor(240);
            doc.line(margin, y - 2, pageWidth - margin, y - 2);
            y += 2;
        });
    }

    y += 5;

    // SECTION III: ANGGARAN BIAYA (BUDGET)
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSection(doc, 'III. ANGGARAN BIAYA (BUDGET)', y, margin, contentWidth);
    const budgetItems = (trip.budget?.items || (Array.isArray(trip.budget) ? trip.budget : []));
    
    if (budgetItems.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Belum ada anggaran ditambahkan.', margin + 4, y);
        y += 10;
    } else {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, contentWidth, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('KAT', margin + 5, y + 1);
        doc.text('NAMA PENGELUARAN', margin + 20, y + 1);
        doc.text('JUMLAH (RP)', pageWidth - margin - 5, y + 1, { align: 'right' });
        y += 10;

        let totalSpent = 0;
        budgetItems.forEach(item => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'normal');
            doc.text(item.category || '📦', margin + 5, y);
            doc.text(item.name || '-', margin + 20, y);
            const amt = Number(item.amount || 0);
            totalSpent += amt;
            doc.text(amt.toLocaleString('id-ID'), pageWidth - margin - 5, y, { align: 'right' });
            y += 6;
        });

        y += 4;
        doc.setDrawColor(100);
        doc.line(pageWidth - 80, y, pageWidth - margin, y);
        y += 6;
        
        // Summary Budget
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('TOTAL TERPAKAI', pageWidth - 80, y);
        doc.text('Rp ' + totalSpent.toLocaleString('id-ID'), pageWidth - margin - 5, y, { align: 'right' });
        y += 6;
        
        const remaining = totalBudgetLimit - totalSpent;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(remaining < 0 ? 220 : 30, 41, 59); // Red if minus
        doc.text('SISA ANGGARAN', pageWidth - 80, y);
        doc.text('Rp ' + remaining.toLocaleString('id-ID'), pageWidth - margin - 5, y, { align: 'right' });
        doc.setTextColor(30, 41, 59);
        y += 10;
    }

    // SECTION IV: TIM PELAKSANA (MEMBERS)
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSection(doc, 'IV. TIM PELAKSANA (MEMBERS)', y, margin, contentWidth);
    const members = trip.members || [];
    if (members.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text('Belum ada anggota tim.', margin + 4, y);
        y += 10;
    } else {
        members.forEach((m, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`${idx + 1}. ${m.name || '-'}`, margin + 5, y);
            doc.setFont('helvetica', 'normal');
            doc.text(` — ${m.jabatan || m.position || '-'} (${m.divisi || m.department || '-'})`, margin + 45, y);
            y += 7;
        });
        y += 5;
    }

    // SECTION V: PERLENGKAPAN (PACKING LIST)
    const packing = trip.packing || trip.packingList || {};
    const categories = Object.keys(packing).filter(c => !c.startsWith('_'));
    
    if (categories.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        y = addSection(doc, 'V. DAFTAR PERLENGKAPAN (PACKING LIST)', y, margin, contentWidth);
        
        categories.forEach(cat => {
            if (y > 270) { doc.addPage(); y = 20; }
            const catData = packing[cat];
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(139, 92, 246);
            doc.text(`${catData.icon || '🎒'} ${cat.toUpperCase()}`, margin + 5, y);
            y += 6;
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const itemsText = (catData.items || []).join(', ');
            if (itemsText) {
                const splitItems = doc.splitTextToSize(itemsText, contentWidth - 10);
                doc.text(splitItems, margin + 10, y);
                y += splitItems.length * 4 + 6;
            } else {
                doc.setFont('helvetica', 'italic');
                doc.text('Tidak ada item.', margin + 10, y);
                y += 8;
            }
        });
    }

    // FOOTER
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Dokumen ini dihasilkan secara otomatis oleh Domus HR System.', pageWidth / 2, 285, { align: 'center' });
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - margin, 285, { align: 'right' });
    }

    const filename = `Planner_${trip.name?.replace(/\s+/g, '_') || 'Trip'}.pdf`;
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
