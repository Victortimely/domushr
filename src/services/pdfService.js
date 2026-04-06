import { jsPDF } from 'jspdf';

// Helper to format Date time
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// Helper to add sections
function addSection(doc, title, y, margin, contentWidth) {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, contentWidth, 10, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin + 4, y + 3);
    return y + 14;
}

// Helper to add rows
function addRow(doc, label, value, y, margin) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label, margin + 4, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value || '-'), margin + 60, y);
    return y + 7;
}

/**
 * GENERATE SURVEY PDF (EXISTING)
 */
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
        doc.text(`Google Maps: ${mapsUrl}`, margin, y + 5);
        doc.setTextColor(30, 41, 59);
        y += 12;
    }

    y += 5;

    // Section: Foto
    y = addSection(doc, 'DOKUMENTASI FOTO', y, margin, contentWidth);
    const photoLabels = ['Rumah (Depan)', 'Selfie Karyawan', 'Foto Ketua RT'];
    for (let i = 0; i < 3; i++) {
        const photoKey = `photo${i}`;
        const photoData = survey.data?.[photoKey];

        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${photoLabels[i]}`, margin, y);
        y += 5;

        if (photoData) {
            try {
                doc.addImage(photoData, 'JPEG', margin, y, 60, 45);
                y += 50;
            } catch {
                doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
                doc.text('[Foto tidak dapat ditampilkan]', margin, y);
                y += 8;
            }
        } else {
            doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
            doc.text('[Belum ada foto]', margin, y);
            y += 8;
        }
    }

    // Audio & Catatan
    if (y > 250) { doc.addPage(); y = 20; }
    y = addSection(doc, 'REKAMAN & CATATAN', y, margin, contentWidth);
    y = addRow(doc, 'Audio Status', survey.data?.audioBlob ? 'Tersimpan' : 'Tidak ada', y, margin);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Wawancara:', margin, y + 3);
    y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const summaryText = survey.data?.interviewSummary || 'Tidak ada ringkasan';
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(splitSummary, margin, y);
    y += splitSummary.length * 5 + 5;

    // Signature
    if (y > 230) { doc.addPage(); y = 20; }
    y = addSection(doc, 'TANDA TANGAN DIGITAL', y, margin, contentWidth);
    if (survey.signature) {
        try { doc.addImage(survey.signature, 'PNG', margin, y, 60, 30); y += 35; } 
        catch { doc.text('[Tanda tangan tersimpan]', margin, y); y += 8; }
    } else {
        doc.setFontSize(9); doc.text('[Belum ada tanda tangan]', margin, y); y += 8;
    }

    // Footer
    const filename = `Survey_${survey.employee_name?.replace(/\s+/g, '_') || 'Unknown'}.pdf`;
    doc.save(filename);
    return filename;
}

/**
 * GENERATE SURVEY PLANNER PDF (NEW/ROBUST)
 */
export async function generateSurveyPlannerPDF(trip) {
    try {
        // We use static import at top for simplicity, but let's make the function async robust
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = 20;

        // Header Background
        doc.setFillColor(7, 5, 17);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Logo Placeholder (Instead of Emoji)
        doc.setFillColor(139, 92, 246);
        doc.roundedRect(margin, 12, 10, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('D-HR', margin + 1, 19);

        // Header Text
        doc.setTextColor(241, 245, 249);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SURVEY TRIP PLANNER REPORT', margin + 15, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(167, 139, 250);
        doc.text('DOMUS HR SYSTEM - LAPORAN RENCANA PERJALANAN', margin + 15, 27);
        
        doc.setFontSize(8);
        doc.setTextColor(200, 200, 200);
        doc.text(`Dicetak pada: ${formatDateTime(new Date().toISOString())}`, pageWidth - margin, 18, { align: 'right' });

        y = 50;

        // SECTION I: RINGKASAN PERJALANAN
        y = addSection(doc, 'I. RINGKASAN PERJALANAN (MY TRIPS)', y, margin, contentWidth);
        y = addRow(doc, 'Nama Trip', trip.name || '-', y, margin);
        y = addRow(doc, 'Tipe Vetting', trip.type === 'luar-kota' ? 'Luar Kota' : 'Dalam Kota', y, margin);
        
        const sd = trip.startDate || trip.start_date;
        const ed = trip.endDate || trip.end_date;
        y = addRow(doc, 'Tanggal Mulai', sd ? new Date(sd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', y, margin);
        y = addRow(doc, 'Tanggal Selesai', ed ? new Date(ed).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', y, margin);
        
        const limit = Number(trip.budget?.total || trip.totalBudget || 0);
        y = addRow(doc, 'Plafon Anggaran', 'Rp ' + limit.toLocaleString('id-ID'), y, margin);
        y += 8;

        // SECTION II: DAFTAR TARGET VETTING
        y = addSection(doc, 'II. DAFTAR TARGET VETTING (ITINERARY)', y, margin, contentWidth);
        const itin = trip.itinerary || [];
        if (itin.length === 0) {
            doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150);
            doc.text('Belum ada target yang ditambahkan.', margin + 4, y);
            y += 10;
        } else {
            // Table Header
            doc.setFillColor(248, 250, 252); doc.rect(margin, y - 4, contentWidth, 8, 'F');
            doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
            doc.text('HARI', margin + 2, y + 1);
            doc.text('JAM', margin + 12, y + 1);
            doc.text('KARYAWAN', margin + 25, y + 1);
            doc.text('LOKASI (KOORDINAT)', margin + 85, y + 1);
            y += 10;

            itin.forEach((item) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
                doc.text(`H-${item.day || 1}`, margin + 2, y);
                doc.text(item.time || '-', margin + 12, y);
                doc.setFont('helvetica', 'bold');
                doc.text(String(item.employeeName || '-'), margin + 25, y);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
                const loc = `${item.address || '-'}\nCoord: ${item.coordinates || '-'}`;
                const splitLoc = doc.splitTextToSize(loc, contentWidth - 85);
                doc.text(splitLoc, margin + 85, y);
                y += splitLoc.length * 4 + 4;
                doc.setDrawColor(240); doc.line(margin, y - 2, pageWidth - margin, y - 2);
                y += 2;
            });
        }
        y += 5;

        // SECTION III: ANGGARAN
        if (y > 230) { doc.addPage(); y = 20; }
        y = addSection(doc, 'III. ANGGARAN BIAYA (BUDGET)', y, margin, contentWidth);
        
        // --- UNIVERSAL DATA PARSER FOR BUDGET ---
        let budgetObj = { total: 0, items: [] };
        try {
            if (typeof trip.budget === 'string') {
                budgetObj = JSON.parse(trip.budget);
            } else if (trip.budget && typeof trip.budget === 'object') {
                budgetObj = trip.budget;
            }
        } catch (e) { console.error('Budget Parse Error:', e); }

        // Fallback for flat array or old structure
        let bItems = [];
        if (Array.isArray(budgetObj.items)) {
            bItems = budgetObj.items;
        } else if (Array.isArray(budgetObj)) {
            bItems = budgetObj;
        } else if (trip.budgetItems && Array.isArray(trip.budgetItems)) {
            bItems = trip.budgetItems;
        }

        // Global Limit Fallback
        const limitValue = Number(budgetObj.total || trip.totalBudget || trip.budget_total || 0);
        
        // Debug Log (Visible in Console F12)
        console.log('PDF BUDGET DEBUG:', { budgetObj, bItems, limitValue });

        if (bItems.length === 0) {
            doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
            doc.text('Belum ada rincian anggaran yang tercatat di sistem.', margin + 4, y);
            y += 10;
        } else {
            doc.setFillColor(248, 250, 252); doc.rect(margin, y - 4, contentWidth, 8, 'F');
            doc.setFontSize(8); doc.setFont('helvetica', 'bold');
            doc.text('ITEM PENGELUARAN', margin + 5, y + 1);
            doc.text('JUMLAH (RP)', pageWidth - margin - 5, y + 1, { align: 'right' });
            y += 10;

            let spent = 0;
            bItems.forEach(item => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'normal');
                const itemName = String(item.name || item.item || item.description || 'Tanpa Nama');
                doc.text(itemName, margin + 5, y);
                const amt = Number(item.amount || item.value || 0); spent += amt;
                doc.text(amt.toLocaleString('id-ID'), pageWidth - margin - 5, y, { align: 'right' });
                y += 6;
            });
            
            y += 4;
            doc.setDrawColor(100); doc.line(pageWidth - 80, y, pageWidth - margin, y);
            y += 6;
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text('TOTAL TERPAKAI', pageWidth - margin - 80, y);
            doc.text('Rp ' + spent.toLocaleString('id-ID'), pageWidth - margin - 5, y, { align: 'right' });
            y += 6;
            
            const rem = limitValue - spent;
            doc.setTextColor(rem < 0 ? 200 : 30, 41, 59);
            doc.text('SISA ANGGARAN', pageWidth - margin - 80, y);
            doc.text('Rp ' + rem.toLocaleString('id-ID'), pageWidth - margin - 5, y, { align: 'right' });
            doc.setTextColor(30, 41, 59);
            y += 10;
        }

        // SECTION IV: STAFF VETTING
        if (y > 230) { doc.addPage(); y = 20; }
        y = addSection(doc, 'IV. DAFTAR STAFF VETTING', y, margin, contentWidth);
        const mbrs = trip.members || [];
        if (mbrs.length === 0) {
            doc.setFont('helvetica', 'italic'); doc.text('Staff vetting belum diset.', margin + 4, y);
            y += 10;
        } else {
            mbrs.forEach((m, idx) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text(`Staff Vetting ${idx + 1}: ${m.name || '-'}`, margin + 5, y);
                doc.setFont('helvetica', 'normal');
                doc.text(` - ${m.jabatan || m.position || m.role || 'Staff Vetting'}`, margin + 65, y);
                y += 7;
            });
            y += 5;
        }

        // FOOTER
        const count = doc.internal.getNumberOfPages();
        for(let i = 1; i <= count; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text('Dokumen otomatis Domus HR System.', pageWidth / 2, 285, { align: 'center' });
            doc.text(`Hal ${i} dari ${count}`, pageWidth - margin, 285, { align: 'right' });
        }

        const fname = `Planner_${trip.name?.replace(/\s+/g, '_') || 'Trip'}.pdf`;
        doc.save(fname);
        return fname;
    } catch (err) {
        console.error('PDF Generate Detail Error:', err);
        throw err;
    }
}
