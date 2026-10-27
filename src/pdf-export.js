/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Generator file PDF untuk GEN-RPM AI STUDIO menggunakan jsPDF + AutoTable
 * dengan kontrol margin A4, pagination nomor halaman, dan fallback print preview.
 */

import { generateSafeFileName } from './utils/curriculum-rules.js';

export async function exportToPDF(state, activeSubjectKey = 'mapel1') {
  const docType = state.docType;
  const isRPM = docType === 'rpm';
  const mapelData = state[activeSubjectKey] || state.mapel1;
  const fileName = `${generateSafeFileName(docType, mapelData.mataPelajaran, mapelData.kelas, mapelData.tahunAjaran)}.pdf`;

  const jspdfModule = window.jspdf;
  if (!jspdfModule || !jspdfModule.jsPDF) {
    console.warn('Pustaka jsPDF tidak ditemukan di window. Mengalihkan ke dialog cetak browser (Save as PDF).');
    triggerPrint();
    return { success: true, fallback: true, message: 'Menggunakan dialog cetak browser sebagai fallback PDF.' };
  }

  try {
    const { jsPDF } = jspdfModule;
    const doc = new jsPDF({
      orientation: state.paperOrientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 18;

    // Helper judul
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // Blue
    const titleText = isRPM ? 'RENCANA PEMBELAJARAN MENDALAM (RPM)' : 'MODUL AJAR KURIKULUM MERDEKA';
    doc.text(titleText, pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text((state.sekolah || 'SATUAN PENDIDIKAN').toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 4;

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // Helper text section
    const checkAddPage = (neededSpace = 25) => {
      if (y + neededSpace > pageHeight - margin) {
        doc.addPage();
        y = margin + 5;
      }
    };

    // Tabel Identitas via AutoTable jika tersedia
    const identitasRows = [
      ['Nama Penyusun', state.guruName || '-'],
      ['Satuan Pendidikan', state.sekolah || '-'],
      ['Mata Pelajaran', mapelData.mataPelajaran || '-'],
      ['Kelas / Fase / Sem.', `Kelas ${mapelData.kelas} / Fase ${mapelData.fase} / Sem. ${mapelData.semester}`],
      ['Tahun Ajaran', mapelData.tahunAjaran || '-'],
      ['Materi Pokok', mapelData.materiPokok || '-'],
      ['Alokasi Waktu', mapelData.alokasiWaktu || '-']
    ];

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Komponen Identitas', 'Keterangan']],
        body: identitasRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      // Fallback manual jika plugin autoTable gagal
      doc.setFontSize(9);
      identitasRows.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${lbl}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(val), margin + 45, y);
        y += 5;
      });
      y += 4;
    }

    // Render Konten berdasarkan RPM atau Modul Ajar
    if (isRPM) {
      const rpmData = mapelData.rpm || {};
      
      checkAddPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('I. IDENTIFIKASI & DIMENSI PROFIL LULUSAN (DPL)', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const dplStr = (rpmData.dimensiProfilLulusan || []).join(', ') || 'Belum dipilih';
      const dplLines = doc.splitTextToSize(`• DPL Utama Terpilih (1-3): ${dplStr}`, pageWidth - (margin * 2));
      doc.text(dplLines, margin, y);
      y += (dplLines.length * 4.5) + 3;

      const idSiswaLines = doc.splitTextToSize(`• Identifikasi Peserta Didik: ${rpmData.identifikasiSiswa || '-'}`, pageWidth - (margin * 2));
      doc.text(idSiswaLines, margin, y);
      y += (idSiswaLines.length * 4.5) + 3;

      checkAddPage(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('II. DESAIN PEMBELAJARAN & TUJUAN', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const cpLines = doc.splitTextToSize(`• Capaian Pembelajaran: ${mapelData.capaianPembelajaran || '-'}`, pageWidth - (margin * 2));
      doc.text(cpLines, margin, y);
      y += (cpLines.length * 4.5) + 3;

      doc.setFont('helvetica', 'bold');
      doc.text('• Tujuan Pembelajaran (TP):', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      (mapelData.tujuanPembelajaranList || []).forEach((tp, i) => {
        checkAddPage(15);
        const tpText = `${i + 1}. ${tp.text} [${tp.kko || 'KKO'}]`;
        const lines = doc.splitTextToSize(tpText, pageWidth - margin - 22);
        doc.text(lines, margin + 4, y);
        y += (lines.length * 4.2) + 2;
      });

      // Pilar Pengalaman Belajar
      checkAddPage(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('III. PENGALAMAN BELAJAR (MEMAHAMI – MENGAPLIKASI – MEREFLEKSI)', margin, y);
      y += 6;

      const pb = rpmData.pengalamanBelajar || {};
      const stages = [
        { label: 'A. Memahami (Meaningful Understanding)', data: pb.memahami },
        { label: 'B. Mengaplikasi (Real-world Application)', data: pb.mengaplikasi },
        { label: 'C. Merefleksi (Metacognition & Self-Reflection)', data: pb.merefleksi }
      ];

      stages.forEach(st => {
        if (!st.data) return;
        checkAddPage(25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(37, 99, 235);
        doc.text(`${st.label} - Durasi: ${st.data.durasi || 20} mnt`, margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(`Aktivitas: ${st.data.guru || st.data.tujuan || '-'}`, pageWidth - (margin * 2));
        doc.text(lines, margin + 2, y);
        y += (lines.length * 4) + 3;
      });

    } else {
      // Modul Ajar Kurikulum Merdeka
      checkAddPage(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('I. KOMPONEN INTI & TUJUAN PEMBELAJARAN', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const cpLines = doc.splitTextToSize(`• Capaian Pembelajaran (CP): ${mapelData.capaianPembelajaran || '-'}`, pageWidth - (margin * 2));
      doc.text(cpLines, margin, y);
      y += (cpLines.length * 4.5) + 3;

      const pbLines = doc.splitTextToSize(`• Pemahaman Bermakna: ${mapelData.pemahamanBermakna || '-'}`, pageWidth - (margin * 2));
      doc.text(pbLines, margin, y);
      y += (pbLines.length * 4.5) + 3;

      const ppLines = doc.splitTextToSize(`• Pertanyaan Pemantik: ${mapelData.pertanyaanPemantik || '-'}`, pageWidth - (margin * 2));
      doc.text(ppLines, margin, y);
      y += (ppLines.length * 4.5) + 4;

      doc.setFont('helvetica', 'bold');
      doc.text('• Tujuan Pembelajaran (TP):', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      (mapelData.tujuanPembelajaranList || []).forEach((tp, i) => {
        checkAddPage(15);
        const tpText = `${i + 1}. ${tp.text}`;
        const lines = doc.splitTextToSize(tpText, pageWidth - margin - 22);
        doc.text(lines, margin + 4, y);
        y += (lines.length * 4.2) + 2;
      });

      // Langkah Kegiatan
      checkAddPage(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('II. LANGKAH-LANGKAH KEGIATAN PEMBELAJARAN', margin, y);
      y += 6;

      const kg = mapelData.kegiatan || {};
      const kgSteps = [
        { label: `1. Pendahuluan (${kg.pendahuluan?.durasi || 15} Menit)`, text: kg.pendahuluan?.aktivitasGuru || '-' },
        { label: `2. Kegiatan Inti (${kg.inti?.durasi || 65} Menit)`, text: 'Eksplorasi konsep, diskusi penyelidikan LKPD kelompok, dan presentasi unjuk karya.' },
        { label: `3. Penutup (${kg.penutup?.durasi || 10} Menit)`, text: kg.penutup?.aktivitasGuru || '-' }
      ];

      kgSteps.forEach(st => {
        checkAddPage(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(37, 99, 235);
        doc.text(st.label, margin, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20, 20, 20);
        const lines = doc.splitTextToSize(st.text, pageWidth - (margin * 2));
        doc.text(lines, margin + 4, y);
        y += (lines.length * 4) + 3;
      });
    }

    // Tanda Tangan
    checkAddPage(38);
    y += 5;
    const dateStr = `${state.titimangsaKota || 'Kota'}, ${state.titimangsaTanggal || '2026'}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(dateStr, pageWidth - margin - 10, y, { align: 'right' });
    y += 6;

    const colWidth = (pageWidth - (margin * 2)) / 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Mengetahui,\nKepala Sekolah', margin + (colWidth / 2), y, { align: 'center' });
    doc.text('Guru Mata Pelajaran,', margin + colWidth + (colWidth / 2), y, { align: 'center' });
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.text(state.kepalaSekolahName || 'Kepala Sekolah', margin + (colWidth / 2), y, { align: 'center' });
    doc.text(state.guruName || 'Guru Mata Pelajaran', margin + colWidth + (colWidth / 2), y, { align: 'center' });
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`NIP. ${state.kepalaSekolahNip || '-'}`, margin + (colWidth / 2), y, { align: 'center' });
    doc.text(`NIP. ${state.guruNip || '-'}`, margin + colWidth + (colWidth / 2), y, { align: 'center' });

    // Header & Footer Pagination pada setiap halaman
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`GEN-RPM AI STUDIO | ${titleText}`, margin, 10);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    doc.save(fileName);
    return { success: true, fileName };
  } catch (err) {
    console.error('Error saat membuat PDF:', err);
    triggerPrint();
    return { success: true, fallback: true, error: err };
  }
}

export function triggerPrint() {
  window.print();
}
