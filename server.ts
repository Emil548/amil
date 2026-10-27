/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Inisialisasi Google Gemini AI jika API key tersedia di environment
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Gagal menginisialisasi Google GenAI client:', err);
  }
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    aiConfigured: Boolean(aiClient),
    model: 'gemini-2.5-flash',
    version: '1.0.0',
    capabilities: [
      'recommend_topics',
      'generate_tp',
      'generate_activities',
      'generate_diagnostic',
      'generate_formative',
      'generate_modul_full',
      'generate_rpm_full',
      'review_document',
      'revise_section'
    ]
  });
});

// Endpoint generator AI terpadu untuk Modul Ajar dan RPM
app.post('/api/generate', async (req: Request, res: Response) => {
  const { action, payload, customPrompt } = req.body || {};

  if (!action) {
    res.status(400).json({
      success: false,
      error: 'Parameter `action` wajib dikirimkan.'
    });
    return;
  }

  // Jika Gemini API key tidak terkonfigurasi, berikan respon kurikulum berkualitas tinggi dalam mode demo
  if (!aiClient) {
    const demoResponse = getPedagogicalDemoData(action, payload, customPrompt);
    res.json({
      success: true,
      isDemo: true,
      message: 'Berjalan dalam Mode Demo Cerdas Kurikulum (Tanpa GEMINI_API_KEY di server). Semua konten tetap dapat diedit dan diuji.',
      data: demoResponse
    });
    return;
  }

  try {
    const promptConfig = buildGeminiPrompt(action, payload, customPrompt);
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptConfig.userPrompt,
      config: {
        systemInstruction: promptConfig.systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      }
    });

    const text = response.text?.trim() || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      // Fallback jika formatting markdown json terikut
      const cleaned = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      isDemo: false,
      modelUsed: 'gemini-2.5-flash',
      data: parsedData
    });
  } catch (err: any) {
    console.error('Error saat memanggil Gemini API:', err);
    // Graceful fallback to rich curriculum mock rather than breaking user flow
    const demoFallback = getPedagogicalDemoData(action, payload, customPrompt);
    res.json({
      success: true,
      isDemo: true,
      warning: `Gemini API gagal dipanggil (${err.message || 'Network/Quota error'}). Menampilkan rekomendasi kurikulum standar yang dapat diedit.`,
      data: demoFallback
    });
  }
});

/**
 * Membangun prompt kurikulum terstruktur untuk Gemini API
 */
function buildGeminiPrompt(action: string, payload: any = {}, customPrompt?: string) {
  const systemInstruction = `Anda adalah Ahli Kurikulum Nasional Indonesia, Pedagog Spesialis Kurikulum Merdeka, dan Pengembang Rencana Pembelajaran Mendalam (RPM).
Prinsip utama:
1. Gunakan Bahasa Indonesia baku yang jelas, inspiratif, kontekstual, dan mudah diterapkan guru di kelas.
2. Jangan pernah mengarang teks resmi CP/ATP jika tidak ada, cukup gunakan referensi yang diberikan atau rekomendasikan formulasi pedagogis yang terukur.
3. Rumusan Tujuan Pembelajaran (TP) harus mencakup Kompetensi (KKO Bloom revisi) dan Konten (materi esensial), serta kriteria keberhasilan yang jelas.
4. Pada RPM (Rencana Pembelajaran Mendalam), terapkan pilar Memahami - Mengaplikasi - Merefleksi, dengan dimensi profil lulusan (DPL) 1-3 dimensi utama.
5. Berikan jawaban dalam JSON terstruktur yang valid tanpa teks pembuka/penutup.`;

  let userPrompt = '';
  switch (action) {
    case 'recommend_topics':
      userPrompt = `Berdasarkan data berikut:
Mata Pelajaran: ${payload.mataPelajaran || 'Umum'}
Jenjang/Kelas/Fase: ${payload.jenjang || 'SMA'} / Kelas ${payload.kelas || 'X'} / Fase ${payload.fase || 'E'}
Semester: ${payload.semester || '1 (Ganjil)'}
Hasilkan 4 rekomendasi materi/topik pembelajaran yang esensial, kontekstual, dan sesuai kurikulum.
Format output JSON:
{
  "recommendations": [
    {
      "topic": "Nama Topik",
      "rationale": "Alasan pedagogis relevansi materi",
      "alokasiWaktuSaran": "2 JP x 45 menit",
      "kaitanCP": "Keterkaitan dengan kompetensi esensial"
    }
  ]
}`;
      break;

    case 'generate_tp':
      userPrompt = `Buatkan 4 alternatif rumusan Tujuan Pembelajaran (TP) terukur untuk:
Mata Pelajaran: ${payload.mataPelajaran}
Materi: ${payload.materiPokok}
Fase/Kelas: Fase ${payload.fase || 'E'} / Kelas ${payload.kelas || 'X'}
Capaian Pembelajaran (CP) yang menjadi acuan: "${payload.capaianPembelajaran || 'Kompetensi esensial materi'}"
Kebutuhan khusus/instruksi: ${customPrompt || 'Terapkan KKO terukur dan kontekstual'}
Format output JSON:
{
  "tujuanPembelajaran": [
    {
      "tpText": "Rumusan tujuan pembelajaran lengkap",
      "kko": "Kata kerja operasional",
      "indikatorKetercapaian": ["Indikator 1", "Indikator 2"],
      "buktiBelajar": "Produk/performa siswa",
      "relevansi": "Alasan hubungan dengan CP"
    }
  ]
}`;
      break;

    case 'generate_activities':
      userPrompt = `Rancang langkah-langkah kegiatan pembelajaran rinci untuk:
Mata Pelajaran: ${payload.mataPelajaran}
Materi: ${payload.materiPokok}
Model Pembelajaran: ${payload.modelPembelajaran || 'Problem Based Learning (PBL)'}
Alokasi Waktu: ${payload.alokasiWaktu || '2 JP x 45 menit'}
Fokus Aktivitas Inti: ${JSON.stringify(payload.fokusAktivitas || ['Diskusi', 'Pemecahan Masalah', 'Presentasi'])}
Tujuan Pembelajaran: ${JSON.stringify(payload.tujuanPembelajaran || [])}
Pastikan durasi menit untuk setiap langkah dijumlahkan tepat sama dengan alokasi waktu!
Format output JSON:
{
  "totalMenit": 90,
  "pendahuluan": {
    "durasiMenit": 15,
    "aktivitasGuru": "Aktivitas pembuka, apersepsi, pertanyaan pemantik",
    "aktivitasSiswa": "Respon siswa, menyimak tujuan",
    "media": "Slide presentasi / video pendek"
  },
  "inti": {
    "durasiMenit": 65,
    "langkahLangkah": [
      {
        "faseModel": "Orientasi siswa pada masalah",
        "durasiMenit": 15,
        "aktivitasGuru": "Memantik kasus nyata di lingkungan sekitar",
        "aktivitasSiswa": "Mengamati dan merumuskan hipotesis",
        "diferensiasi": "Disediakan opsi media teks dan infografis",
        "asesmenTerkait": "Observasi keaktifan"
      },
      {
        "faseModel": "Penyelidikan mandiri dan kelompok",
        "durasiMenit": 30,
        "aktivitasGuru": "Memfasilitasi diskusi dan scaffolding kelompok",
        "aktivitasSiswa": "Bekerja menyelesaikan LKPD kelompok",
        "diferensiasi": "Tingkat bantuan disesuaikan kesiapan belajar",
        "asesmenTerkait": "Penilaian performa diskusi"
      },
      {
        "faseModel": "Pengembangan dan penyajian hasil",
        "durasiMenit": 20,
        "aktivitasGuru": "Memandu sesi presentasi dan umpan balik silang",
        "aktivitasSiswa": "Mempresentasikan solusi kelompok",
        "diferensiasi": "Produk presentasi bebas (poster/slide/demonstrasi)",
        "asesmenTerkait": "Rubrik presentasi"
      }
    ]
  },
  "penutup": {
    "durasiMenit": 10,
    "aktivitasGuru": "Memfasilitasi refleksi bersama, mengonfirmasi kesimpulan, dan tindak lanjut",
    "aktivitasSiswa": "Menuliskan refleksi 'Apa yang kupelajari hari ini'",
    "media": "Sticky notes / lembar refleksi"
  }
}`;
      break;

    case 'generate_diagnostic':
      userPrompt = `Buat instrumen Asesmen Diagnostik Awal untuk materi ${payload.materiPokok} (${payload.mataPelajaran}):
1. Non-kognitif (kesejahteraan emosional, minat belajar, lingkungan belajar) yang ramah, sukarela, tidak menghakimi, dan menjaga privasi.
2. Kognitif (pertanyaan prasyarat, miskonsepsi umum, kunci jawaban, dan panduan tindak lanjut).
Format output JSON:
{
  "nonKognitif": [
    { "pertanyaan": "Teks pertanyaan ramah", "kategori": "Minat/Kesiapan Belajar", "pilihan": ["Opsi A", "Opsi B", "Opsi C"] }
  ],
  "kognitif": [
    {
      "pertanyaan": "Soal pemantik konsep prasyarat",
      "indikator": "Mengidentifikasi konsep dasar",
      "kunciJawaban": "Kunci jawaban singkat",
      "tindakLanjut": "Bila belum paham, beri pendampingan konsep X"
    }
  ]
}`;
      break;

    case 'generate_formative':
      userPrompt = `Rancang Asesmen Formatif untuk materi ${payload.materiPokok} (${payload.mataPelajaran}) berdasarkan opsi: ${JSON.stringify(payload.selectedTypes || ['LKPD', 'Observasi', 'Presentasi'])}.
Sertakan petunjuk guru, kriteria keberhasilan, dan rubrik penilaian (Skala 1-4: Baru Berkembang, Layak, Cakap, Mahir).
Format output JSON:
{
  "instrumen": [
    {
      "jenis": "Nama Jenis (misal: LKPD Kolaboratif)",
      "petunjuk": "Petunjuk pelaksanaan",
      "kriteriaKeberhasilan": ["Kriteria 1", "Kriteria 2"],
      "rubrik": [
        { "aspek": "Aspek yang dinilai", "baruBerkembang": "Deskripsi", "layak": "Deskripsi", "cakap": "Deskripsi", "mahir": "Deskripsi" }
      ],
      "umpanBalikGuidance": "Panduan umpan balik efektif untuk guru"
    }
  ]
}`;
      break;

    case 'review_document':
      userPrompt = `Tinjau dokumen kurikulum berikut secara konstruktif tanpa mengubah isinya:
Tipe Dokumen: ${payload.docType || 'Modul Ajar'}
Mata Pelajaran: ${payload.mataPelajaran}
Materi: ${payload.materiPokok}
Data Dokumen Ringkas: ${JSON.stringify(payload.documentData || {})}
Beri analisis mendalam:
1. Keselarasan TP, Kegiatan, dan Asesmen.
2. Prinsip pembelajaran berkesadaran, bermakna, dan menggembirakan.
3. Efektivitas diferensiasi belajar.
4. Saran perbaikan konkret yang dapat langsung diterapkan guru.
Format output JSON:
{
  "skorKelayakan": 92,
  "statusKelayakan": "Sangat Baik & Siap Terap",
  "kelebihan": ["Poin kelebihan 1", "Poin kelebihan 2"],
  "keselarasanTPAktivitasAsesmen": "Ulasan keselarasan...",
  "saranPerbaikan": [
    { "bagian": "Nama Bagian", "rekomendasi": "Saran konkret" }
  ],
  "catatanVerifikasi": "Dokumen ini adalah draf hasil asisten AI, guru disarankan memvalidasi kembali dengan karakteristik riil siswa di kelas."
}`;
      break;

    case 'revise_section':
      userPrompt = `Revisi bagian '${payload.sectionName}' dari dokumen materi '${payload.materiPokok}' sesuai instruksi pengguna:
Instruksi Pengguna: "${customPrompt}"
Konten Asli: ${JSON.stringify(payload.originalContent)}
Format output JSON:
{
  "sectionName": "${payload.sectionName}",
  "revisedContent": "Konten baru yang sudah direvisi sesuai instruksi dengan tetap mempertahankan konteks kurikulum",
  "catatanPerubahan": "Penjelasan singkat perubahan yang dilakukan"
}`;
      break;

    default:
      userPrompt = `Buatkan rekomendasi kurikulum untuk ${payload.materiPokok || 'Pembelajaran'}: ${customPrompt || ''}. Format JSON.`;
  }

  return { systemInstruction, userPrompt };
}

/**
 * Fallback data pedagogis cerdas untuk mode demo offline atau tanpa API key
 */
function getPedagogicalDemoData(action: string, payload: any = {}, customPrompt?: string): any {
  const mapel = payload.mataPelajaran || 'Ilmu Pengetahuan Alam (IPA)';
  const materi = payload.materiPokok || 'Ekosistem dan Keanekaragaman Hayati';
  const kelas = payload.kelas || 'X';
  const fase = payload.fase || 'E';

  switch (action) {
    case 'recommend_topics':
      return {
        recommendations: [
          {
            topic: `${materi} dalam Konteks Lingkungan Lokal`,
            rationale: `Sangat relevan dengan Fase ${fase} untuk membangun kesadaran pelestarian ekologi sekitar peserta didik.`,
            alokasiWaktuSaran: '2 JP x 45 menit',
            kaitanCP: 'Mengidentifikasi interaksi antarkomponen ekosistem dan dampak perubahan lingkungan.'
          },
          {
            topic: `Pemodelan Dinamika Jaring-Jaring Makanan dan Piramida Ekologi`,
            rationale: 'Mengembangkan penalaran kritis melalui visualisasi transfer energi dan keseimbangan biosfer.',
            alokasiWaktuSaran: '4 JP x 45 menit',
            kaitanCP: 'Menganalisis keterkaitan rantai makanan dengan stabilitas ekologis.'
          },
          {
            topic: `Solusi Berkelanjutan untuk Mitigasi Kerusakan Ekosistem`,
            rationale: 'Menumbuhkan kreativitas dan kewargaan aktif peserta didik melalui aksi nyata ramah lingkungan.',
            alokasiWaktuSaran: '2 JP x 45 menit',
            kaitanCP: 'Merancang gagasan penanganan krisis keanekaragaman hayati secara kolaboratif.'
          }
        ]
      };

    case 'generate_tp':
      return {
        tujuanPembelajaran: [
          {
            tpText: `Melalui pengamatan lingkungan sekitar, peserta didik mampu menganalisis interaksi antar komponen biotik dan abiotik dalam ekosistem dengan tingkat akurasi minimal 80%.`,
            kko: 'Menganalisis (C4)',
            indikatorKetercapaian: [
              'Mengidentifikasi peran produsen, konsumen, dan dekomposer secara tepat',
              'Menjelaskan dampak kepunahan salah satu komponen dalam jaring makanan'
            ],
            buktiBelajar: 'Diagram analisis jaring-jaring makanan dan laporan observasi singkat',
            relevansi: 'Sesuai kompetensi esensial penalaran ilmiah Kurikulum Merdeka'
          },
          {
            tpText: `Secara kolaboratif dalam kelompok, peserta didik mampu merancang solusi berbasis kearifan lokal untuk mengatasi permasalahan pencemaran ekosistem di daerah tempat tinggal.`,
            kko: 'Merancang (C6)',
            indikatorKetercapaian: [
              'Merumuskan masalah lingkungan secara kontekstual',
              'Membuat rancangan aksi mitigasi yang aplikatif dan realistis'
            ],
            buktiBelajar: 'Poster infografis atau proposal mini aksi lingkungan',
            relevansi: 'Menguatkan Profil Pelajar Pancasila (Bergotong Royong & Kreatif)'
          },
          {
            tpText: `Peserta didik mampu merefleksikan peran dan tanggung jawab pribadinya dalam menjaga keseimbangan keanekaragaman hayati dalam kehidupan sehari-hari.`,
            kko: 'Merefleksikan (A5)',
            indikatorKetercapaian: [
              'Menuliskan 3 komitmen pribadi ramah lingkungan',
              'Mengevaluasi kebiasaan konsumsi sehari-hari yang berdampak pada alam'
            ],
            buktiBelajar: 'Jurnal refleksi diri dan lembar komitmen hijau',
            relevansi: 'Menunjang dimensi Beriman & Bertakwa kepada Tuhan YME serta Berakhlak Mulia'
          }
        ]
      };

    case 'generate_activities':
      return {
        totalMenit: 90,
        pendahuluan: {
          durasiMenit: 15,
          aktivitasGuru: 'Menyapa dengan hangat, memimpin doa, mengecek presensi, lalu memantik diskusi dengan video 2 menit tentang fenomena perubahan ekosistem lokal. Menyampaikan tujuan dan kriteria keberhasilan.',
          aktivitasSiswa: 'Mengamati video pemantik, merespons pertanyaan awal secara sukarela, dan menyimak alur pembelajaran hari ini.',
          media: 'Video pendek YouTube/Lokal, papan tulis, proyektor'
        },
        inti: {
          durasiMenit: 65,
          langkahLangkah: [
            {
              faseModel: 'Fase 1: Eksplorasi Masalah Nyata',
              durasiMenit: 15,
              aktivitasGuru: 'Menyajikan studi kasus banjir/kekeringan dan membagi siswa ke dalam kelompok heterogen.',
              aktivitasSiswa: 'Membaca artikel kasus, mengidentifikasi akar masalah, dan mengumpulkan informasi penting.',
              diferensiasi: 'Kelompok visual mendapat infografis grafis, kelompok auditori menyimak rekaman berita.',
              asesmenTerkait: 'Observasi antusiasme dan partisipasi awal'
            },
            {
              faseModel: 'Fase 2: Investigasi dan Pemecahan Masalah (LKPD)',
              durasiMenit: 30,
              aktivitasGuru: 'Berkeliling memfasilitasi diskusi kelompok, memberikan bimbingan bagi kelompok yang membutuhkan dukungan lebih (scaffolding).',
              aktivitasSiswa: 'Berdialog aktif, menyusun rantai makanan yang terganggu, dan merumuskan gagasan pemulihan pada lembar kerja.',
              diferensiasi: 'Bantuan berjenjang: kelompok mandiri merancang proyek lanjutan, kelompok berkembang didampingi panduan konsep dasar.',
              asesmenTerkait: 'Penilaian proses kerja kelompok pada lembar observasi'
            },
            {
              faseModel: 'Fase 3: Berbagi Solusi dan Umpan Balik Silang',
              durasiMenit: 20,
              aktivitasGuru: 'Memoderasi sesi galeri berjalan (gallery walk) atau presentasi singkat perwakilan kelompok.',
              aktivitasSiswa: 'Menempelkan karya solusi di dinding kelas, memberikan 2 bintang dan 1 saran (Two Stars and a Wish) untuk kelompok lain.',
              diferensiasi: 'Bentuk produk bebas: sketsa infografis, narasi teks, atau peta konsep.',
              asesmenTerkait: 'Rubrik penilaian presentasi dan penilaian rekan sejawat'
            }
          ]
        },
        penutup: {
          durasiMenit: 10,
          aktivitasGuru: 'Memandu simpulan umum bersama siswa, mengapresiasi kontribusi seluruh kelompok, dan memberikan umpan balik penguatan.',
          aktivitasSiswa: 'Menuliskan 1 hal paling berkesan dan 1 pertanyaan yang masih tersisa pada sticky notes refleksi.',
          media: 'Sticky notes berwarna atau lembar refleksi 3-2-1'
        }
      };

    case 'generate_diagnostic':
      return {
        nonKognitif: [
          {
            pertanyaan: 'Bagaimana suasana perasaan dan energi belajarmu saat memasuki kelas hari ini?',
            kategori: 'Kesiapan Emosional',
            pilihan: ['Sangat bersemangat', 'Tenang dan siap belajar', 'Sedikit lelah namun ingin mencoba', 'Butuh motivasi tambahan']
          },
          {
            pertanyaan: 'Gaya belajar atau aktivitas apa yang paling membuatmu mudah memahami konsep baru?',
            kategori: 'Preferensi Belajar',
            pilihan: ['Melihat gambar/diagram/video', 'Mendengarkan penjelasan dan berdiskusi', 'Mencoba langsung / eksperimen', 'Membaca mandiri']
          },
          {
            pertanyaan: 'Apakah kamu memiliki tempat dan sarana yang nyaman untuk belajar saat di rumah?',
            kategori: 'Lingkungan Belajar',
            pilihan: ['Ya, sangat mendukung', 'Cukup memadai', 'Kadang terganggu kebisingan', 'Memerlukan sarana tambahan']
          }
        ],
        kognitif: [
          {
            pertanyaan: `Apakah yang membedakan komponen abiotik dan komponen biotik dalam sebuah kolam ikan? Berikan contohnya!`,
            indikator: 'Membedakan komponen hidup dan tak hidup dalam ekosistem',
            kunciJawaban: 'Biotik adalah komponen hidup (contoh: ikan, alga, bakteri pengurai). Abiotik adalah komponen tak hidup (contoh: air, cahaya matahari, oksigen terlarut, batu).',
            tindakLanjut: 'Jika salah, berikan review cepat menggunakan analogi lingkungan sekolah.'
          },
          {
            pertanyaan: `Jika seluruh katak di persawahan diburu hingga habis, apa yang kemungkinan terjadi pada populasi serangga dan padi? Jelaskan alasannya!`,
            indikator: 'Menganalisis keterkaitan rantai makanan',
            kunciJawaban: 'Populasi serangga herbivora melonjak drastis karena predator alaminya (katak) hilang, akibatnya tanaman padi mengalami kerusakan parah karena diserang hama serangga.',
            tindakLanjut: 'Jika bingung, arahkan siswa menggambar diagram alur rantai makanan sederhana.'
          }
        ]
      };

    case 'generate_formative':
      return {
        instrumen: [
          {
            jenis: 'Lembar Kerja Peserta Didik (LKPD) Kolaboratif',
            petunjuk: 'Kerjakan secara berkelompok (4-5 siswa). Bacalah teks kasus ekosistem, lalu jawab 3 pertanyaan kunci pemecahan masalah bersama.',
            kriteriaKeberhasilan: [
              'Ketepatan identifikasi variabel masalah lingkungan',
              'Kesesuaian solusi dengan kondisi sosial masyarakat',
              'Kejelasan argumen dan pembagian tugas yang adil'
            ],
            rubrik: [
              {
                aspek: 'Kualitas Analisis Solusi',
                baruBerkembang: 'Solusi belum rasional dan belum menjawab akar masalah.',
                layak: 'Solusi cukup relevan namun langkah penerapannya belum terperinci.',
                cakap: 'Solusi aplikatif, berbasis data kasus, dan terperinci.',
                mahir: 'Solusi sangat inovatif, komprehensif, serta memperhitungkan dampak jangka panjang.'
              },
              {
                aspek: 'Kolaborasi dan Kerja Sama',
                baruBerkembang: 'Didominasi 1 siswa, anggota lain pasif.',
                layak: 'Beberapa anggota aktif berkontribusi.',
                cakap: 'Seluruh anggota berbagi peran dan saling mendukung.',
                mahir: 'Kepemimpinan bergilir, komunikasi empatik, dan saling melengkapi pemikiran.'
              }
            ],
            umpanBalikGuidance: 'Berikan apresiasi spesifik pada ide unik siswa dan ajukan pertanyaan pancingan jika analisis masih dangkal.'
          },
          {
            jenis: 'Observasi Partisipasi dan Diskusi',
            petunjuk: 'Guru membawa lembar observasi centang berbobot saat memfasilitasi kerja kelompok.',
            kriteriaKeberhasilan: [
              'Aktif mendengarkan pendapat rekan kelompok',
              'Menyampaikan ide dengan bahasa santun dan logis'
            ],
            rubrik: [
              {
                aspek: 'Keterlibatan Diskusi',
                baruBerkembang: 'Jarang berpendapat.',
                layak: 'Menyampaikan pendapat jika diminta.',
                cakap: 'Inisiatif mengemukakan argumen logis.',
                mahir: 'Menjadi fasilitator diskusi yang merangkul pendapat teman.'
              }
            ],
            umpanBalikGuidance: 'Sampaikan umpan balik personal saat jeda perpindahan aktivitas.'
          }
        ]
      };

    case 'review_document':
      return {
        skorKelayakan: 94,
        statusKelayakan: 'Sangat Baik & Siap Terap di Kelas',
        kelebihan: [
          'Tujuan pembelajaran telah memuat kompetensi operasional (KKO) dan konten esensial yang terukur.',
          'Alur kegiatan menunjukkan transisi logis dari apersepsi kontekstual menuju investigasi mandiri.',
          'Diferensiasi proses dan produk dirancang fleksibel menyesuaikan keragaman kesiapan siswa.'
        ],
        keselarasanTPAktivitasAsesmen: 'Sangat harmonis. Asesmen formatif yang dipilih secara langsung menguji indikator ketercapaian pada kegiatan inti.',
        saranPerbaikan: [
          {
            bagian: 'Pemanfaatan Digital / Media Alternatif',
            rekomendasi: 'Sertakan alternatif media non-digital (misal kartu bergambar atau modul cetak) untuk mengantisipasi kendala mati lampu atau koneksi internet sekolah.'
          },
          {
            bagian: 'Refleksi Siswa',
            rekomendasi: 'Tambahkan panduan refleksi metakognisi sederhana agar siswa menyadari cara belajar apa yang paling efektif bagi dirinya.'
          }
        ],
        catatanVerifikasi: 'Draf telah ditelaah dengan standar Kurikulum Merdeka & Pembelajaran Mendalam. Guru berwenang penuh menyesuaikan dengan kondisi nyata kelas.'
      };

    case 'revise_section':
      return {
        sectionName: payload.sectionName || 'Bagian Dokumen',
        revisedContent: `[Hasil Revisi Berdasarkan Instruksi: "${customPrompt || 'Tingkatkan keterlibatan aktif siswa'}"]\n` +
          `Aktivitas telah disesuaikan agar lebih kontekstual, memprioritaskan dialog eksploratif, serta menyediakan panduan diferensiasi yang inklusif untuk seluruh peserta didik.`,
        catatanPerubahan: 'Mempertegas instruksi kerja, menambahkan scaffolding belajar, dan memperjelas bukti pencapaian kompetensi.'
      };

    default:
      return {
        info: 'Rekomendasi kurikulum berhasil disiapkan.',
        materi: materi,
        mataPelajaran: mapel
      };
  }
}

// Inisialisasi Vite middleware untuk pengembangan SPA responsif
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      app.use(express.static(__dirname));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GEN-RPM AI STUDIO server aktif di http://localhost:${PORT}`);
    console.log(`AI Status: ${aiClient ? 'Online (Gemini 2.5 Flash)' : 'Demo Mode (Siap Pakai & Edukatif)'}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
});
