/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * State management dan persistent storage untuk GEN-RPM AI STUDIO
 */

export const STORAGE_KEY = 'GEN_RPM_STUDIO_DATA_V1';

export const INITIAL_STATE = {
  // Pengaturan Dokumen
  docType: 'modul_ajar', // 'modul_ajar' | 'rpm'
  theme: 'modern_pro',   // 'modern_pro' | 'glass' | 'academic' | 'colorful' | 'formal'
  palette: 'ocean_blue', // 'ocean_blue' | 'emerald' | 'lavender' | 'sunset' | 'golden' | 'monochrome'
  darkMode: false,
  docTemplate: 'formal_nasional', // 'formal_nasional' | 'modern_akademik' | 'infografis' | 'minimalis' | 'premium_colorful'
  paperSize: 'a4',
  paperOrientation: 'portrait',

  // Integrasi AI
  aiEndpoint: '/api/generate',
  aiHealthEndpoint: '/api/health',
  aiMode: 'auto', // 'auto' | 'demo'
  aiStatus: 'ready', // 'ready' | 'checking' | 'connected' | 'demo' | 'error'
  aiStatusMessage: 'Siap digunakan',

  // Identitas Lembaga & Guru (Wajib editable & tercetak)
  sekolah: 'SMAN 1 Merdeka Belajar',
  guruName: 'Ahmad Muzakki, S.Pd., Gr.',
  guruNip: '19870514 201201 1 004',
  kepalaSekolahName: 'Dra. Hj. Nurul Hidayati, M.Pd.',
  kepalaSekolahNip: '19750820 199903 2 001',
  titimangsaKota: 'Pasuruan',
  titimangsaTanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),

  // Status Dua Mata Pelajaran
  activeSubjectTab: 'mapel1', // 'mapel1' | 'mapel2'
  enableSubject2: false,
  isInterdisciplinary: false, // Jika mapel 2 aktif: Pembelajaran Lintas Disiplin Terpadu

  // Mata Pelajaran 1 (Utama)
  mapel1: {
    mataPelajaran: 'Ilmu Pengetahuan Alam (IPA / Biologi)',
    jenjang: 'SMA',
    kelas: 'X',
    fase: 'E',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    alokasiWaktu: '2 JP x 45 menit',
    jumlahPertemuan: '1 Pertemuan',
    materiPokok: 'Ekosistem dan Keanekaragaman Hayati',
    kompetensiAwal: 'Peserta didik telah memahami pengelompokan makhluk hidup dan rantai makanan dasar di SMP.',
    karakteristikSiswa: 'Sebagian besar menyukai pembelajaran berbasis gambar, video, dan penyelidikan luar ruangan.',
    saranaPrasarana: 'LCD Proyektor, Smartphone, LKPD Ekosistem, Taman Sekolah, Jaringan Internet.',
    targetPesertaDidik: ['reguler', 'dukungan_belajar', 'kemampuan_tinggi'],
    modelPembelajaran: 'Problem Based Learning (PBL)',
    profilPelajarPancasila: ['beriman', 'bergotong_royong', 'bernalar_kritis', 'kreatif'],
    
    // Referensi CP & ATP resmi (Editable, tidak dikarang)
    capaianPembelajaran: 'Peserta didik mampu mengidentifikasi interaksi antarkomponen ekosistem, menganalisis dampak aktivitas manusia terhadap keanekaragaman hayati, dan merancang solusi pelestarian lingkungan lokal.',
    alurTujuanPembelajaran: '1. Mengidentifikasi komponen biotik & abiotik -> 2. Menganalisis rantai makanan -> 3. Merumuskan solusi krisis ekologi.',

    // Rekomendasi AI & Tujuan Pembelajaran
    rekomendasiTopik: [],
    tujuanPembelajaranList: [
      {
        id: 'tp-1',
        text: 'Melalui investigasi lingkungan taman sekolah, peserta didik dapat menganalisis interaksi komponen biotik dan abiotik dengan tepat.',
        kko: 'Menganalisis (C4)',
        indikator: 'Mengidentifikasi 4 interaksi biotik-abiotik dan menjelaskan dampaknya terhadap kestabilan ekosistem.',
        bukti: 'Laporan observasi mini dan diagram interaksi ekologis.'
      },
      {
        id: 'tp-2',
        text: 'Secara kolaboratif, peserta didik dapat merancang gagasan mitigasi krisis lingkungan lokal berbasis kearifan lokal.',
        kko: 'Merancang (C6)',
        indikator: 'Menyusun poster infografis solusi pelestarian ekosistem yang aplikatif.',
        bukti: 'Karya poster digital/manual dan lembar presentasi kelompok.'
      }
    ],

    // Komponen Inti Modul Ajar
    pemahamanBermakna: 'Keseimbangan ekosistem sangat bergantung pada keharmonisan setiap komponennya; kepunahan satu spesies dapat mengubah tatanan kehidupan secara menyeluruh.',
    pertanyaanPemantik: 'Apa yang akan terjadi pada kehidupan manusia jika populasi lebah atau burung pemangsa di alam punah secara tiba-tiba?',
    
    // Langkah Pembelajaran Rinci
    kegiatan: {
      pendahuluan: {
        durasi: 15,
        aktivitasGuru: 'Membuka dengan salam hangat, memimpin doa, presensi, lalu menayangkan video 2 menit krisis lingkungan lokal. Menyampaikan tujuan belajar dan kriteria sukses.',
        aktivitasSiswa: 'Mengamati video pemantik, merespons pertanyaan awal secara sukarela, dan menyimak tujuan pembelajaran.',
        media: 'Slide interaktif & cuplikan video'
      },
      inti: {
        durasi: 65,
        fokusAktivitas: ['Diskusi Kelompok', 'Eksplorasi Lingkungan', 'Presentasi'],
        langkahLangkah: [
          {
            fase: 'Orientasi pada Masalah',
            durasi: 15,
            guru: 'Menyajikan studi kasus penurunan populasi satwa lokal dan membagi kelas ke dalam kelompok heterogen.',
            siswa: 'Mencermati lembar kasus dan merumuskan pertanyaan penyelidikan.',
            diferensiasi: 'Tersedia lembar kasus format infografis dan teks naratif.',
            asesmen: 'Observasi keaktifan'
          },
          {
            fase: 'Penyelidikan Mandiri & Kelompok',
            durasi: 30,
            guru: 'Memfasilitasi investigasi di taman sekolah dan membimbing kelompok yang memerlukan scaffolding.',
            siswa: 'Mengamati komponen ekosistem langsung, mencatat data di LKPD, dan mendiskusikan solusi kelompok.',
            diferensiasi: 'Bimbingan bertahap disesuaikan dengan kesiapan belajar.',
            asesmen: 'Penilaian proses LKPD'
          },
          {
            fase: 'Penyajian & Refleksi Solusi',
            durasi: 20,
            guru: 'Memandu sesi pameran karya (gallery walk) dan memberikan penguatan konsep.',
            siswa: 'Menyajikan karya solusi dan memberikan umpan balik saling menguatkan (Two Stars and a Wish).',
            diferensiasi: 'Bentuk produk bebas (poster/audio/sketsa peta konsep).',
            asesmen: 'Rubrik presentasi'
          }
        ]
      },
      penutup: {
        durasi: 10,
        aktivitasGuru: 'Memandu simpulan inti, mengapresiasi seluruh kelompok, dan memberi arahan tindak lanjut pertemuan berikutnya.',
        aktivitasSiswa: 'Menuliskan 1 hal baru yang dipahami dan 1 komitmen hijau di lembar refleksi diri.',
        media: 'Lembar Refleksi Diri 3-2-1'
      }
    },

    // Asesmen Diagnostik (Non-kognitif & Kognitif)
    asesmenDiagnostik: {
      nonKognitifEnabled: true,
      nonKognitifChecks: {
        kesiapanEmosi: true,
        minatBelajar: true,
        dukunganRumah: true,
        kebutuhanDukungan: true,
        lingkunganBelajar: true
      },
      nonKognitifPertanyaan: [
        { q: 'Bagaimana perasaan dan tingkat energimu untuk belajar sains hari ini?', cat: 'Kesiapan Emosional' },
        { q: 'Kegiatan apa yang paling membuatmu menikmati belajar: mengamati langsung, berdiskusi, atau membaca modul?', cat: 'Minat Belajar' },
        { q: 'Apakah kamu memiliki tempat belajar yang tenang di rumah?', cat: 'Lingkungan Belajar' }
      ],
      kognitifEnabled: true,
      kognitifPertanyaan: [
        {
          soal: 'Jelaskan perbedaan mendasar antara produsen, konsumen, dan dekomposer dalam suatu ekosistem beserta contohnya!',
          kunci: 'Produsen menghasilkan makanan sendiri (autotrof, contoh tumbuhan), konsumen memakan organisme lain (heterotrof, contoh kelinci), dekomposer mengurai materi organik (contoh jamur dan bakteri).',
          indikator: 'Mengidentifikasi peran trofik',
          tindakLanjut: 'Jika belum tepat, berikan diagram interaksi sederhana.'
        }
      ]
    },

    // Asesmen Formatif (Kuis, LKPD, Diskusi, Presentasi, Observasi)
    asesmenFormatif: {
      kuisSingkat: true,
      lkpd: true,
      diskusiKelompok: true,
      presentasi: true,
      observasi: true,
      rubrikSkala: [
        { aspek: 'Kualitas Analisis Masalah', skor1: 'Belum relevan', skor2: 'Cukup relevan', skor3: 'Analitis dan runtut', skor4: 'Kritis, mendalam, berwawasan luas' },
        { aspek: 'Kemitraan & Kerja Sama', skor1: 'Individualis', skor2: 'Kurang berkontribusi', skor3: 'Aktif berkolaborasi', skor4: 'Menginspirasi dan memfasilitasi rekan' },
        { aspek: 'Kejelasan Komunikasi Hasil', skor1: 'Sulit dipahami', skor2: 'Cukup jelas', skor3: 'Artikulatif dan percaya diri', skor4: 'Sangat persuasif dan disertai data valid' }
      ]
    },

    // RPM Spesifik untuk Mapel 1
    rpm: {
      identifikasiSiswa: 'Berdasarkan asesmen diagnostik, 65% siswa memiliki gaya belajar kinestetik-visual, 20% membutuhkan bimbingan bertahap (scaffolding) pada konsep rantai trofik, dan 15% siap dengan pengayaan proyek ekologi mandiri.',
      karakteristikMateri: 'Materi memadukan konsep teoritis interaksi biosfer dengan realitas kontekstual pencemaran lokal. Menuntut kemampuan berpikir sistemik dan empati ekologis.',
      dimensiProfilLulusan: ['penalaran_kritis', 'kolaborasi'], // Validasi: 1 - 3 dimensi!
      lintasDisiplin: 'Terintegrasi dengan Geografi (pemetaan wilayah konservasi lokal) dan Bahasa Indonesia (penulisan esai advokasi lingkungan).',
      praktikPedagogis: 'Pendekatan kontekstual berbasis inkuiri terbimbing, dialog sokratik, dan pemecahan masalah terpadu.',
      kemitraanPembelajaran: 'Kolaborasi dengan kader Adiwiyata sekolah dan komunitas pecinta alam lingkungan hidup daerah.',
      lingkunganPembelajaran: 'Ruang kelas yang fleksibel untuk formasi kelompok meja bundar, akses langsung ke laboratorium alam/taman sekolah, suasana inklusif.',
      pemanfaatanDigital: 'Aplikasi Google Lens untuk identifikasi flora/fauna, simulasi ekosistem online, alternatif kartu bergambar offline.',
      
      // Pilar Pengalaman Belajar: Memahami, Mengaplikasi, Merefleksi
      pengalamanBelajar: {
        kegiatanAwal: {
          tujuan: 'Membangun kesadaran kontekstual dan mengaitkan pengetahuan prasyarat.',
          guru: 'Menyajikan potret sungai lokal dan memantik diskusi: Apa yang berubah dari 10 tahun lalu?',
          siswa: 'Mengemukakan hipotesis dan menyepakati target kompetensi bersama.',
          durasi: 15
        },
        memahami: {
          tujuan: 'Mengonstruksi pemahaman mendalam tentang transfer energi dan jaring ekologi.',
          guru: 'Memandu dialog eksploratif mengenai dinamika populasi biotik-abiotik.',
          siswa: 'Menganalisis artikel studi kasus ekologi dan memetakan jaring interaksi.',
          durasi: 25,
          bukti: 'Peta konsep interaksi ekologis',
          asesmen: 'Pertanyaan pemahaman sokratik'
        },
        mengaplikasi: {
          tujuan: 'Menerapkan konsep untuk memecahkan persoalan ketidakseimbangan ekosistem nyata.',
          guru: 'Mendampingi kelompok merumuskan rekomendasi aksi pemulihan ekosistem sekolah.',
          siswa: 'Membuat prototipe / proposal aksi penghijauan berbasis tanaman endemik.',
          durasi: 30,
          bukti: 'Proposal aksi hijau mini',
          asesmen: 'Rubrik pemecahan masalah kontekstual'
        },
        merefleksi: {
          tujuan: 'Mengevaluasi strategi berpikir dan menumbuhkan metakognisi pembelajar.',
          guru: 'Memfasilitasi siswa menilai proses belajar, tantangan yang dihadapi, dan pencapaiannya.',
          siswa: 'Menuliskan refleksi diri mengenai perubahan pola pikir terhadap alam.',
          durasi: 10,
          bukti: 'Jurnal refleksi metakognitif',
          asesmen: 'Lembar refleksi diri'
        },
        kegiatanPenutup: {
          tujuan: 'Mengonsolidasi simpulan dan merencanakan komitmen berkelanjutan.',
          guru: 'Mengapresiasi dedikasi belajar dan memberikan umpan balik konstruktif.',
          siswa: 'Menyepakati jadwal pemantauan aksi hijau kelompok.',
          durasi: 10
        }
      }
    }
  },

  // Mata Pelajaran 2 (Opsional, independen atau interdisipliner)
  mapel2: {
    mataPelajaran: 'Bahasa Indonesia',
    jenjang: 'SMA',
    kelas: 'X',
    fase: 'E',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    alokasiWaktu: '2 JP x 45 menit',
    jumlahPertemuan: '1 Pertemuan',
    materiPokok: 'Teks Laporan Hasil Observasi (LHO) Bertema Lingkungan',
    kompetensiAwal: 'Mampu menyusun kalimat fakta dan opini sederhana.',
    karakteristikSiswa: 'Antusias mengekspresikan gagasan melalui media visual dan tulisan santai.',
    saranaPrasarana: 'Perangkat laptop/HP, contoh teks LHO lingkungan, lembar kerja analisis.',
    targetPesertaDidik: ['reguler'],
    modelPembelajaran: 'Project Based Learning (PjBL)',
    profilPelajarPancasila: ['bernalar_kritis', 'mandiri', 'kreatif'],
    capaianPembelajaran: 'Peserta didik mampu mengevaluasi informasi berupa gagasan, pikiran, atau pesan dari teks LHO dan menyajikan laporan observasi secara objektif.',
    alurTujuanPembelajaran: '1. Menelaah struktur LHO -> 2. Menuliskan data observasi faktual -> 3. Menyajikan laporan hasil observasi.',
    tujuanPembelajaranList: [
      {
        id: 'tp2-1',
        text: 'Peserta didik mampu menyusun teks LHO berdasarkan data observasi lingkungan sekolah secara objektif dan sistematis.',
        kko: 'Menyusun (C6)',
        indikator: 'Menyajikan struktur teks lengkap (pernyataan umum, deskripsi bagian, simpulan/manfaat).',
        bukti: 'Draf naskah Teks LHO objektif.'
      }
    ],
    pemahamanBermakna: 'Kekuatan laporan objektif terletak pada kejujuran fakta yang dapat menjadi rujukan ilmiah untuk advokasi pelestarian alam.',
    pertanyaanPemantik: 'Bagaimana sebuah tulisan laporan observasi dapat meyakinkan masyarakat agar peduli terhadap lingkungan?',
    kegiatan: {
      pendahuluan: { durasi: 15, aktivitasGuru: 'Apersepsi mengenai berita hoax vs laporan objektif.', aktivitasSiswa: 'Membedakan fakta dan opini.' },
      inti: { durasi: 65, langkahLangkah: [] },
      penutup: { durasi: 10, aktivitasGuru: 'Refleksi penulisan.', aktivitasSiswa: 'Menyimpulkan kaidah bahasa LHO.' }
    },
    rpm: {
      dimensiProfilLulusan: ['komunikasi', 'penalaran_kritis'],
      identifikasiSiswa: 'Siswa cakap berbicara namun membutuhkan penguatan kaidah tanda baca dan kejelasan kalimat efektif.',
      karakteristikMateri: 'Teks deskriptif-analitis dengan kaidah bahasa keilmuan.',
      lintasDisiplin: 'Terhubung dengan observasi ekosistem IPA.',
      pengalamanBelajar: {
        memahami: { tujuan: 'Memahami kaidah teks LHO', durasi: 25 },
        mengaplikasi: { tujuan: 'Menulis LHO dari data observasi', durasi: 35 },
        merefleksi: { tujuan: 'Menilai objektivitas tulisan sendiri', durasi: 15 }
      }
    }
  },

  // Status Perubahan Belum Disimpan
  isDirty: false,
  lastSavedAt: null
};

// Manajemen penyimpanan lokal
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };
    const parsed = JSON.parse(raw);
    return { ...INITIAL_STATE, ...parsed };
  } catch (err) {
    console.error('Gagal memuat state dari localStorage:', err);
    return { ...INITIAL_STATE };
  }
}

export function saveState(state) {
  try {
    state.lastSavedAt = new Date().toISOString();
    state.isDirty = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Gagal menyimpan state ke localStorage:', err);
    return false;
  }
}

export function exportStateAsJSON(state) {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GEN_RPM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
