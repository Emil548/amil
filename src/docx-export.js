/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Generator file Microsoft Word (.docx) untuk GEN-RPM AI STUDIO
 * Menggunakan pustaka docx via window.docx dengan fallback HTML Word Document jika pustaka CDN offline.
 */

import { generateSafeFileName } from './utils/curriculum-rules.js';

export async function exportToDocx(state, activeSubjectKey = 'mapel1') {
  const docType = state.docType; // 'modul_ajar' | 'rpm'
  const isRPM = docType === 'rpm';
  const mapelData = state[activeSubjectKey] || state.mapel1;
  const fileName = `${generateSafeFileName(docType, mapelData.mataPelajaran, mapelData.kelas, mapelData.tahunAjaran)}.docx`;

  // Cek ketersediaan pustaka docx di window
  const docxLib = window.docx;
  if (!docxLib) {
    console.warn('Pustaka docx tidak ditemukan di window. Menggunakan fallback dokumen Word terformat (.doc).');
    return exportAsWordFallback(state, mapelData, isRPM, fileName.replace('.docx', '.doc'));
  }

  try {
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } = docxLib;

    const sections = [];
    const children = [];

    // Header Dokumen
    const docTitle = isRPM
      ? 'RENCANA PEMBELAJARAN MENDALAM (RPM)'
      : 'MODUL AJAR KURIKULUM MERDEKA';
    const subTitle = state.sekolah ? state.sekolah.toUpperCase() : 'SATUAN PENDIDIKAN';

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: docTitle, bold: true, size: 28, font: 'Calibri' }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({ text: subTitle, bold: true, size: 24, font: 'Calibri', color: '2B4C7E' }),
        ]
      })
    );

    // Tabel Identitas
    const createInfoRow = (label, value) => new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })]
        }),
        new TableCell({
          width: { size: 6500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: `: ${value || '-'}`, size: 20 })] })]
        })
      ]
    });

    const infoRows = [
      createInfoRow('Nama Penyusun / Guru', state.guruName),
      createInfoRow('Satuan Pendidikan', state.sekolah),
      createInfoRow('Mata Pelajaran', mapelData.mataPelajaran),
      createInfoRow('Kelas / Fase / Semester', `Kelas ${mapelData.kelas} / Fase ${mapelData.fase} / Semester ${mapelData.semester}`),
      createInfoRow('Tahun Ajaran', mapelData.tahunAjaran),
      createInfoRow('Materi Pokok', mapelData.materiPokok),
      createInfoRow('Alokasi Waktu', mapelData.alokasiWaktu)
    ];

    if (!isRPM) {
      infoRows.push(
        createInfoRow('Model Pembelajaran', mapelData.modelPembelajaran),
        createInfoRow('Target Peserta Didik', (mapelData.targetPesertaDidik || []).join(', '))
      );
    }

    children.push(
      new Table({
        width: { size: 9500, type: WidthType.DXA },
        rows: infoRows,
        margins: { top: 80, bottom: 80, left: 120, right: 120 }
      }),
      new Paragraph({ spacing: { after: 200 }, children: [] })
    );

    // KONTEN SPESIFIK RPM
    if (isRPM) {
      const rpmData = mapelData.rpm || {};
      const dplLabels = {
        keimanan: '1. Keimanan dan ketakwaan terhadap Tuhan YME',
        kewargaan: '2. Kewargaan',
        penalaran_kritis: '3. Penalaran Kritis',
        kreativitas: '4. Kreativitas',
        kolaborasi: '5. Kolaborasi',
        kemandirian: '6. Kemandirian',
        kesehatan: '7. Kesehatan',
        komunikasi: '8. Komunikasi'
      };

      const selectedDPL = (rpmData.dimensiProfilLulusan || [])
        .map(id => dplLabels[id] || id)
        .join(', ');

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: 'I. IDENTIFIKASI PEMBELAJARAN MENDALAM', bold: true, size: 22 })]
        }),
        new Paragraph({ children: [new TextRun({ text: 'A. Dimensi Profil Lulusan (DPL) Utama (1–3 Dimensi): ', bold: true, size: 20 }), new TextRun({ text: selectedDPL || 'Belum dipilih', size: 20 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'B. Identifikasi Peserta Didik: ', bold: true, size: 20 }), new TextRun({ text: rpmData.identifikasiSiswa || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'C. Karakteristik Materi Pokok: ', bold: true, size: 20 }), new TextRun({ text: rpmData.karakteristikMateri || '-', size: 20 })] }),
        
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: 'II. DESAIN PEMBELAJARAN MENDALAM', bold: true, size: 22 })]
        }),
        new Paragraph({ children: [new TextRun({ text: 'A. Capaian Pembelajaran (CP): ', bold: true, size: 20 }), new TextRun({ text: mapelData.capaianPembelajaran || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'B. Tujuan Pembelajaran (TP): ', bold: true, size: 20 })] })
      );

      (mapelData.tujuanPembelajaranList || []).forEach((tp, idx) => {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 40 },
            children: [new TextRun({ text: `${idx + 1}. ${tp.text}`, size: 20 })]
          })
        );
      });

      children.push(
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'C. Koneksi Lintas Disiplin / Kontekstual: ', bold: true, size: 20 }), new TextRun({ text: rpmData.lintasDisiplin || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'D. Praktik Pedagogis & Lingkungan: ', bold: true, size: 20 }), new TextRun({ text: rpmData.praktikPedagogis || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'E. Pemanfaatan Digital & Non-Digital: ', bold: true, size: 20 }), new TextRun({ text: rpmData.pemanfaatanDigital || '-', size: 20 })] }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: 'III. PENGALAMAN BELAJAR (MEMAHAMI – MENGAPLIKASI – MEREFLEKSI)', bold: true, size: 22 })]
        })
      );

      const pb = rpmData.pengalamanBelajar || {};
      const addExperienceStage = (title, stageData) => {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: title, bold: true, size: 21, color: '1D4ED8' })]
          }),
          new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Tujuan: ${stageData.tujuan || '-'}`, size: 20 })] }),
          new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Aktivitas Guru: ${stageData.guru || '-'}`, size: 20 })] }),
          new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Aktivitas Siswa: ${stageData.siswa || '-'}`, size: 20 })] }),
          new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Alokasi Waktu: ${stageData.durasi || '-'} menit`, size: 20 })] })
        );
      };

      if (pb.kegiatanAwal) addExperienceStage('1. Kegiatan Awal (Orientasi Kontekstual & Apersepsi)', pb.kegiatanAwal);
      if (pb.memahami) addExperienceStage('2. Tahap Memahami (Eksplorasi Konsep & Pemahaman Mendalam)', pb.memahami);
      if (pb.mengaplikasi) addExperienceStage('3. Tahap Mengaplikasi (Aplikasi Nyata & Pemecahan Masalah)', pb.mengaplikasi);
      if (pb.merefleksi) addExperienceStage('4. Tahap Merefleksi (Metakognisi & Refleksi Diri)', pb.merefleksi);
      if (pb.kegiatanPenutup) addExperienceStage('5. Kegiatan Penutup (Simpulan & Tindak Lanjut)', pb.kegiatanPenutup);

    } else {
      // KONTEN MODUL AJAR KURIKULUM MERDEKA
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: 'I. INFORMASI UMUM', bold: true, size: 22 })]
        }),
        new Paragraph({ children: [new TextRun({ text: 'A. Kompetensi Awal: ', bold: true, size: 20 }), new TextRun({ text: mapelData.kompetensiAwal || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'B. Profil Pelajar Pancasila: ', bold: true, size: 20 }), new TextRun({ text: (mapelData.profilPelajarPancasila || []).join(', '), size: 20 })] }),
        new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'C. Sarana dan Prasarana: ', bold: true, size: 20 }), new TextRun({ text: mapelData.saranaPrasarana || '-', size: 20 })] }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: 'II. KOMPONEN INTI', bold: true, size: 22 })]
        }),
        new Paragraph({ children: [new TextRun({ text: 'A. Capaian Pembelajaran (CP): ', bold: true, size: 20 }), new TextRun({ text: mapelData.capaianPembelajaran || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'B. Pemahaman Bermakna: ', bold: true, size: 20 }), new TextRun({ text: mapelData.pemahamanBermakna || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'C. Pertanyaan Pemantik: ', bold: true, size: 20 }), new TextRun({ text: mapelData.pertanyaanPemantik || '-', size: 20 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'D. Tujuan Pembelajaran (TP): ', bold: true, size: 20 })] })
      );

      (mapelData.tujuanPembelajaranList || []).forEach((tp, idx) => {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 40 },
            children: [new TextRun({ text: `${idx + 1}. ${tp.text}`, size: 20 })]
          })
        );
      });

      // Kegiatan Pembelajaran
      const kg = mapelData.kegiatan || {};
      children.push(
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: 'E. Langkah-Langkah Pembelajaran', bold: true, size: 21, color: '1D4ED8' })] }),
        new Paragraph({ indent: { left: 240 }, spacing: { before: 40 }, children: [new TextRun({ text: `1. Kegiatan Pendahuluan (${kg.pendahuluan?.durasi || 15} Menit): `, bold: true, size: 20 }), new TextRun({ text: kg.pendahuluan?.aktivitasGuru || '-', size: 20 })] }),
        new Paragraph({ indent: { left: 240 }, spacing: { before: 40 }, children: [new TextRun({ text: `2. Kegiatan Inti (${kg.inti?.durasi || 65} Menit):`, bold: true, size: 20 })] })
      );

      (kg.inti?.langkahLangkah || []).forEach((step, sIdx) => {
        children.push(
          new Paragraph({
            indent: { left: 480 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `• ${step.fase || `Langkah ${sIdx + 1}`} (${step.durasi || 15} mnt): `, bold: true, size: 20 }),
              new TextRun({ text: `${step.guru || ''} Siswa: ${step.siswa || ''}. (Diferensiasi: ${step.diferensiasi || 'Terintegrasi'})`, size: 20 })
            ]
          })
        );
      });

      children.push(
        new Paragraph({ indent: { left: 240 }, spacing: { before: 40 }, children: [new TextRun({ text: `3. Kegiatan Penutup (${kg.penutup?.durasi || 10} Menit): `, bold: true, size: 20 }), new TextRun({ text: kg.penutup?.aktivitasGuru || '-', size: 20 })] })
      );
    }

    // Tanda Tangan Guru & Kepala Sekolah
    const dateStr = `${state.titimangsaKota || 'Kota'}, ${state.titimangsaTanggal || '2026'}`;
    children.push(
      new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: dateStr, size: 20 })] }),
      new Table({
        width: { size: 9500, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4750, type: WidthType.DXA },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mengetahui,\nKepala Sekolah', bold: true, size: 20 })] }),
                  new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: state.kepalaSekolahName || 'Nama Kepala Sekolah', bold: true, underline: {}, size: 20 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${state.kepalaSekolahNip || '-'}`, size: 19 })] })
                ]
              }),
              new TableCell({
                width: { size: 4750, type: WidthType.DXA },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Guru Mata Pelajaran,', bold: true, size: 20 })] }),
                  new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: state.guruName || 'Nama Guru Mata Pelajaran', bold: true, underline: {}, size: 20 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${state.guruNip || '-'}`, size: 19 })] })
                ]
              })
            ]
          })
        ]
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await docxLib.Packer.toBlob(doc);
    downloadBlob(blob, fileName);
    return { success: true, fileName };
  } catch (err) {
    console.error('Error saat membuat file docx:', err);
    return exportAsWordFallback(state, mapelData, isRPM, fileName.replace('.docx', '.doc'));
  }
}

/**
 * Fallback jika CDN docx tidak dapat diakses
 */
function exportAsWordFallback(state, mapelData, isRPM, fileName) {
  const content = document.getElementById('document-preview-content');
  const innerHtml = content ? content.innerHTML : '<h3>Konten Dokumen</h3>';

  const htmlDoc = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${isRPM ? 'RPM' : 'Modul Ajar'}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #111; }
        h1, h2, h3 { color: #1e3a8a; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        th, td { border: 1px solid #999; padding: 6px 10px; font-size: 10.5pt; text-align: left; }
        .text-center { text-align: center; }
      </style>
    </head>
    <body>
      ${innerHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlDoc], { type: 'application/msword' });
  downloadBlob(blob, fileName);
  return { success: true, fallback: true, fileName };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
