/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modul logika murni untuk validasi kurikulum, alokasi waktu, DPL (Dimensi Profil Lulusan),
 * checklist kelengkapan dokumen Modul Ajar dan RPM, serta sanitasi data.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ActivityDurationItem {
  name: string;
  durationMinutes: number;
}

export interface DocumentCompleteness {
  scorePercent: number;
  completedItems: string[];
  missingRequiredItems: string[];
  recommendations: string[];
}

/**
 * Validasi Dimensi Profil Lulusan (DPL) untuk Rencana Pembelajaran Mendalam (RPM).
 * Aturan kurikulum: Wajib memilih 1 hingga 3 dimensi utama agar pembelajaran fokus dan mendalam.
 */
export function validateDPLSelection(selectedDPLIds: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!selectedDPLIds || selectedDPLIds.length === 0) {
    errors.push('Wajib memilih minimal 1 Dimensi Profil Lulusan (DPL).');
  } else if (selectedDPLIds.length > 3) {
    errors.push(`Maksimal memilih 3 dimensi (saat ini ${selectedDPLIds.length} dipilih). Pembelajaran mendalam memerlukan fokus yang tajam.`);
  } else if (selectedDPLIds.length === 1) {
    warnings.push('Anda memilih 1 dimensi. Disarankan 2 dimensi untuk keseimbangan kompetensi dan karakter.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Parsing alokasi waktu teks (contoh: "2 JP x 45 menit", "3 x 40 menit", "90 menit", "2 x 35")
 * Mengembalikan total durasi dalam satuan menit.
 */
export function parseTotalDurationMinutes(timeAllocationStr: string): number {
  if (!timeAllocationStr) return 0;
  const str = timeAllocationStr.toLowerCase().trim();

  // Pola "X JP x Y menit" atau "X x Y" atau "X JP x Y"
  const jpMatch = str.match(/(\d+)\s*(?:jp)?\s*[x*×]\s*(\d+)/i);
  if (jpMatch) {
    const count = parseInt(jpMatch[1], 10);
    const perJp = parseInt(jpMatch[2], 10);
    return count * perJp;
  }

  // Pola "X menit"
  const minMatch = str.match(/(\d+)\s*(?:menit|mins|min|m)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // Angka polos (asumsikan JP @ 45 menit jika <= 6, atau menit langsung jika > 6)
  const numMatch = str.match(/^(\d+)$/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    return val <= 8 ? val * 45 : val;
  }

  return 90; // Standar default 2 JP x 45 menit
}

/**
 * Validasi konsistensi durasi aktivitas kegiatan pembelajaran terhadap total alokasi waktu
 */
export function validateActivityDurations(
  totalAllocatedMinutes: number,
  activities: ActivityDurationItem[]
): {
  isConsistent: boolean;
  totalActivitiesMinutes: number;
  allocatedMinutes: number;
  difference: number;
  message: string;
} {
  const sumMinutes = activities.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0);
  const diff = sumMinutes - totalAllocatedMinutes;

  let message = 'Durasi aktivitas sesuai dengan alokasi waktu.';
  if (diff > 0) {
    message = `Total durasi aktivitas (${sumMinutes} mnt) melebihi alokasi waktu (${totalAllocatedMinutes} mnt) sebanyak ${diff} menit.`;
  } else if (diff < 0) {
    message = `Total durasi aktivitas (${sumMinutes} mnt) kurang dari alokasi waktu (${totalAllocatedMinutes} mnt) sebanyak ${Math.abs(diff)} menit.`;
  }

  return {
    isConsistent: diff === 0,
    totalActivitiesMinutes: sumMinutes,
    allocatedMinutes: totalAllocatedMinutes,
    difference: diff,
    message
  };
}

/**
 * Evaluasi kelengkapan data Modul Ajar Kurikulum Merdeka
 */
export function checkModulAjarCompleteness(data: Record<string, any>): DocumentCompleteness {
  const completed: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];

  // Required basic metadata
  if (data.guruName?.trim()) completed.push('Nama Guru Penyusun');
  else missing.push('Nama Guru Penyusun');

  if (data.kepalaSekolahName?.trim()) completed.push('Nama Kepala Sekolah');
  else missing.push('Nama Kepala Sekolah');

  if (data.sekolah?.trim()) completed.push('Nama Satuan Pendidikan / Sekolah');
  else missing.push('Nama Satuan Pendidikan / Sekolah');

  if (data.mataPelajaran?.trim()) completed.push('Mata Pelajaran');
  else missing.push('Mata Pelajaran');

  if (data.materiPokok?.trim()) completed.push('Materi Pokok / Topik');
  else missing.push('Materi Pokok / Topik');

  if (data.capaianPembelajaran?.trim()) completed.push('Capaian Pembelajaran (CP)');
  else missing.push('Capaian Pembelajaran (CP)');

  if (Array.isArray(data.tujuanPembelajaran) && data.tujuanPembelajaran.length > 0) {
    completed.push(`Tujuan Pembelajaran (${data.tujuanPembelajaran.length} butir)`);
  } else {
    missing.push('Tujuan Pembelajaran (TP)');
  }

  if (data.pemahamanBermakna?.trim()) completed.push('Pemahaman Bermakna');
  else missing.push('Pemahaman Bermakna');

  if (data.pertanyaanPemantik?.trim()) completed.push('Pertanyaan Pemantik');
  else missing.push('Pertanyaan Pemantik');

  // Kegiatan
  if (data.kegiatanPembelajaran?.pendahuluan?.deskripsi?.trim()) completed.push('Kegiatan Pendahuluan');
  else missing.push('Kegiatan Pendahuluan');

  if (data.kegiatanPembelajaran?.inti?.deskripsi?.trim() || (data.kegiatanPembelajaran?.inti?.langkahLangkah?.length > 0)) {
    completed.push('Kegiatan Inti');
  } else {
    missing.push('Kegiatan Inti');
  }

  if (data.kegiatanPembelajaran?.penutup?.deskripsi?.trim()) completed.push('Kegiatan Penutup');
  else missing.push('Kegiatan Penutup');

  // Asesmen
  if (data.asesmen?.diagnostik?.pertanyaan?.length > 0 || data.asesmen?.diagnostik?.deskripsi?.trim()) {
    completed.push('Asesmen Diagnostik');
  } else {
    recommendations.push('Tambahkan Asesmen Diagnostik (kognitif/non-kognitif) untuk mendeteksi kesiapan siswa.');
  }

  if (data.asesmen?.formatif?.instrumen?.length > 0 || data.asesmen?.formatif?.deskripsi?.trim()) {
    completed.push('Asesmen Formatif');
  } else {
    missing.push('Asesmen Formatif');
  }

  const totalChecked = completed.length + missing.length;
  const score = totalChecked > 0 ? Math.round((completed.length / totalChecked) * 100) : 0;

  return {
    scorePercent: score,
    completedItems: completed,
    missingRequiredItems: missing,
    recommendations
  };
}

/**
 * Evaluasi kelengkapan data Rencana Pembelajaran Mendalam (RPM)
 */
export function checkRPMCompleteness(data: Record<string, any>): DocumentCompleteness {
  const completed: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];

  // Metadata
  if (data.guruName?.trim()) completed.push('Nama Guru');
  else missing.push('Nama Guru');

  if (data.kepalaSekolahName?.trim()) completed.push('Nama Kepala Sekolah');
  else missing.push('Nama Kepala Sekolah');

  if (data.mataPelajaran?.trim()) completed.push('Mata Pelajaran');
  else missing.push('Mata Pelajaran');

  if (data.materiPokok?.trim()) completed.push('Materi Pokok');
  else missing.push('Materi Pokok');

  // DPL
  const dplCount = Array.isArray(data.dimensiProfilLulusan) ? data.dimensiProfilLulusan.length : 0;
  if (dplCount >= 1 && dplCount <= 3) {
    completed.push(`Dimensi Profil Lulusan (${dplCount} dipilih)`);
  } else {
    missing.push('Dimensi Profil Lulusan (Pilih 1–3 Dimensi)');
  }

  // Identifikasi Siswa & Karakteristik Materi
  if (data.identifikasiSiswa?.trim()) completed.push('Identifikasi Peserta Didik');
  else missing.push('Identifikasi Peserta Didik');

  if (data.karakteristikMateri?.trim()) completed.push('Karakteristik Materi Pokok');
  else missing.push('Karakteristik Materi Pokok');

  // Desain Pembelajaran: CP, TP, Lintas Disiplin
  if (data.tujuanPembelajaran?.length > 0) completed.push('Tujuan Pembelajaran Mendalam');
  else missing.push('Tujuan Pembelajaran');

  if (data.lintasDisiplin?.trim()) completed.push('Koneksi Lintas Disiplin / Kontekstual');
  else recommendations.push('Tentukan koneksi lintas disiplin ilmu untuk memperdalam konteks belajar.');

  // Pengalaman Belajar: Memahami, Mengaplikasi, Merefleksi
  const pb = data.pengalamanBelajar || {};
  if (pb.memahami?.deskripsi?.trim() || pb.memahami?.aktivitasGuru?.trim()) {
    completed.push('Tahap Memahami (Meaningful Understanding)');
  } else {
    missing.push('Tahap Pengalaman Belajar: Memahami');
  }

  if (pb.mengaplikasi?.deskripsi?.trim() || pb.mengaplikasi?.aktivitasSiswa?.trim()) {
    completed.push('Tahap Mengaplikasi (Real-world Application)');
  } else {
    missing.push('Tahap Pengalaman Belajar: Mengaplikasi');
  }

  if (pb.merefleksi?.deskripsi?.trim() || pb.merefleksi?.aktivitasSiswa?.trim()) {
    completed.push('Tahap Merefleksi (Metacognition & Reflection)');
  } else {
    missing.push('Tahap Pengalaman Belajar: Merefleksi');
  }

  // Asesmen RPM
  if (data.asesmen?.proses?.rubrik?.length > 0 || data.asesmen?.proses?.deskripsi?.trim()) {
    completed.push('Asesmen Proses (For/As Learning)');
  } else {
    missing.push('Asesmen Proses Pembelajaran');
  }

  const totalChecked = completed.length + missing.length;
  const score = totalChecked > 0 ? Math.round((completed.length / totalChecked) * 100) : 0;

  return {
    scorePercent: score,
    completedItems: completed,
    missingRequiredItems: missing,
    recommendations
  };
}

/**
 * Sanitasi string untuk mencegah XSS saat disisipkan ke DOM atau dokumen
 */
export function sanitizeText(text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format nama file unduhan yang rapi dan aman
 */
export function generateSafeFileName(
  docType: 'modul_ajar' | 'rpm',
  subject: string,
  grade: string,
  academicYear: string
): string {
  const prefix = docType === 'rpm' ? 'RPM' : 'Modul_Ajar';
  const cleanSubject = (subject || 'Mata_Pelajaran').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const cleanGrade = (grade || 'Fase').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanYear = (academicYear || '2026-2027').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${prefix}_${cleanSubject}_${cleanGrade}_${cleanYear}`.replace(/_{2,}/g, '_');
}
