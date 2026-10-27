/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDPLSelection,
  parseTotalDurationMinutes,
  validateActivityDurations,
  checkModulAjarCompleteness,
  checkRPMCompleteness,
  sanitizeText,
  generateSafeFileName
} from './curriculum-rules.ts';

test('validateDPLSelection: enforces between 1 and 3 dimensions', () => {
  // Empty should fail
  const emptyRes = validateDPLSelection([]);
  assert.equal(emptyRes.isValid, false);
  assert.match(emptyRes.errors[0], /minimal 1/);

  // 1 to 3 should be valid
  const oneRes = validateDPLSelection(['penalaran_kritis']);
  assert.equal(oneRes.isValid, true);
  assert.equal(oneRes.errors.length, 0);

  const threeRes = validateDPLSelection(['penalaran_kritis', 'kreativitas', 'kolaborasi']);
  assert.equal(threeRes.isValid, true);
  assert.equal(threeRes.errors.length, 0);

  // 4 should fail
  const fourRes = validateDPLSelection(['penalaran_kritis', 'kreativitas', 'kolaborasi', 'kemandirian']);
  assert.equal(fourRes.isValid, false);
  assert.match(fourRes.errors[0], /Maksimal memilih 3 dimensi/);
});

test('parseTotalDurationMinutes: handles different format patterns', () => {
  assert.equal(parseTotalDurationMinutes('2 JP x 45 menit'), 90);
  assert.equal(parseTotalDurationMinutes('3 x 40 menit'), 120);
  assert.equal(parseTotalDurationMinutes('60 menit'), 60);
  assert.equal(parseTotalDurationMinutes('2 x 35'), 70);
  assert.equal(parseTotalDurationMinutes(''), 0);
});

test('validateActivityDurations: checks sum of activities against allocation', () => {
  const activities = [
    { name: 'Pendahuluan', durationMinutes: 15 },
    { name: 'Inti', durationMinutes: 65 },
    { name: 'Penutup', durationMinutes: 10 }
  ];

  const match = validateActivityDurations(90, activities);
  assert.equal(match.isConsistent, true);
  assert.equal(match.totalActivitiesMinutes, 90);

  const overflow = validateActivityDurations(80, activities);
  assert.equal(overflow.isConsistent, false);
  assert.equal(overflow.difference, 10);
});

test('checkModulAjarCompleteness: computes completion score and missing items', () => {
  const incompleteData = {
    guruName: 'Budi Santoso, S.Pd.',
    mataPelajaran: 'Matematika'
  };
  const result = checkModulAjarCompleteness(incompleteData);
  assert.ok(result.scorePercent < 50);
  assert.ok(result.missingRequiredItems.includes('Materi Pokok / Topik'));
  assert.ok(result.missingRequiredItems.includes('Tujuan Pembelajaran (TP)'));

  const completeData = {
    guruName: 'Budi Santoso, S.Pd.',
    kepalaSekolahName: 'Dra. Siti Rahmah, M.Pd.',
    sekolah: 'SMAN 1 Merdeka',
    mataPelajaran: 'Matematika',
    materiPokok: 'Sistem Persamaan Linear Tiga Variabel',
    capaianPembelajaran: 'Peserta didik dapat menyelesaikan SPLTV...',
    tujuanPembelajaran: ['Menemukan model SPLTV', 'Menyelesaikan solusi'],
    pemahamanBermakna: 'Konsep aljabar digunakan dalam optimasi anggaran.',
    pertanyaanPemantik: 'Bagaimana pedagang menghitung harga satuan?',
    kegiatanPembelajaran: {
      pendahuluan: { deskripsi: 'Apersepsi dan doa' },
      inti: { deskripsi: 'Eksplorasi masalah dan LKPD' },
      penutup: { deskripsi: 'Refleksi dan kesimpulan' }
    },
    asesmen: {
      diagnostik: { deskripsi: 'Pretest konsep aljabar' },
      formatif: { deskripsi: 'Rubrik penilaian LKPD kelompok' }
    }
  };

  const completeRes = checkModulAjarCompleteness(completeData);
  assert.equal(completeRes.scorePercent, 100);
  assert.equal(completeRes.missingRequiredItems.length, 0);
});

test('sanitizeText: prevents HTML and script injection', () => {
  const dirty = '<script>alert("hack")</script>&"quote"';
  const clean = sanitizeText(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('&lt;script&gt;'), true);
});

test('generateSafeFileName: produces sanitized clean filenames', () => {
  const fn1 = generateSafeFileName('modul_ajar', 'Matematika / Aljabar!', 'Fase E (Kelas X)', '2026/2027');
  assert.equal(fn1, 'Modul_Ajar_Matematika_Aljabar_Fase_E_Kelas_X_2026-2027');

  const fn2 = generateSafeFileName('rpm', 'IPA & Lingkungan', 'Kelas VII', '2026-2027');
  assert.equal(fn2, 'RPM_IPA_Lingkungan_Kelas_VII_2026-2027');
});
