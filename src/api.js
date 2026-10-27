/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Klien API AI terpadu untuk GEN-RPM AI STUDIO dengan konfigurasi endpoint,
 * pengecekan koneksi, penanganan timeout, dan fallback mode demo eksplisit.
 */

export class AIClient {
  constructor(endpoint = '/api/generate', healthEndpoint = '/api/health') {
    this.endpoint = endpoint;
    this.healthEndpoint = healthEndpoint;
    this.status = 'ready'; // 'ready' | 'checking' | 'connected' | 'demo' | 'error'
    this.lastStatusMessage = 'Siap digunakan';
    this.timeoutMs = 25000;
  }

  setEndpoint(endpoint, healthEndpoint) {
    this.endpoint = endpoint || '/api/generate';
    if (healthEndpoint) this.healthEndpoint = healthEndpoint;
  }

  /**
   * Menguji konektivitas server backend AI
   */
  async testConnection() {
    this.status = 'checking';
    this.lastStatusMessage = 'Menguji koneksi ke server...';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(this.healthEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Server merespons kode status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.aiConfigured) {
        this.status = 'connected';
        this.lastStatusMessage = `Terhubung ke Backend AI (${resData.model || 'Gemini 2.5 Flash'} Aktif)`;
      } else {
        this.status = 'demo';
        this.lastStatusMessage = 'Terhubung ke Backend (Mode Demo Kurikulum Aktif - Tanpa API Key)';
      }
      return { success: true, status: this.status, message: this.lastStatusMessage, details: resData };
    } catch (err) {
      clearTimeout(timer);
      this.status = 'demo';
      const msg = err.name === 'AbortError'
        ? 'Koneksi timeout (>8 detik). Beralih ke Mode Demo Cerdas.'
        : `Backend tidak merespons (${err.message}). Beralih ke Mode Demo Cerdas.`;
      this.lastStatusMessage = msg;
      return { success: false, status: 'demo', message: msg, error: err };
    }
  }

  /**
   * Mengirim permintaan pembuatan/rekomendasi kurikulum ke AI
   */
  async requestAI(action, payload, customPrompt = '', forceDemo = false) {
    if (forceDemo) {
      return {
        success: true,
        isDemo: true,
        message: 'Dihasilkan melalui Mode Demo Kurikulum Cerdas (Simulasi Pedagogis).',
        data: this.getSmartDemoFallback(action, payload, customPrompt)
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ action, payload, customPrompt }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      clearTimeout(timer);
      console.warn(`[AIClient] Request ke ${this.endpoint} gagal, beralih ke fallback demo:`, err);
      return {
        success: true,
        isDemo: true,
        warning: `Backend AI offline (${err.message}). Menampilkan rekomendasi kurikulum standar yang dapat diedit langsung.`,
        data: this.getSmartDemoFallback(action, payload, customPrompt)
      };
    }
  }

  /**
   * Generator data fallback kurikulum lengkap di sisi browser jika server tidak aktif
   */
  getSmartDemoFallback(action, payload, customPrompt = '') {
    const mapel = payload.mataPelajaran || 'Mata Pelajaran';
    const materi = payload.materiPokok || 'Materi Pokok';
    const kelas = payload.kelas || 'X';
    const fase = payload.fase || 'E';

    switch (action) {
      case 'recommend_topics':
        return {
          recommendations: [
            {
              topic: `${materi} dalam Kehidupan Nyata dan Lingkungan Lokal`,
              rationale: `Sangat relevan dengan Fase ${fase} untuk membangun penalaran kritis kontekstual peserta didik.`,
              alokasiWaktuSaran: '2 JP x 45 menit',
              kaitanCP: 'Menelaah hubungan konsep dasar dengan pemecahan masalah di lingkungan sekitar.'
            },
            {
              topic: `Analisis Pemodelan dan Eksplorasi Konsep ${materi}`,
              rationale: 'Mengembangkan kompetensi inkuiri dan kolaborasi kelompok berbasis pembuktian ilmiah.',
              alokasiWaktuSaran: '4 JP x 45 menit',
              kaitanCP: 'Mengidentifikasi prinsip utama dan merumuskan pola hubungan antarvariabel.'
            },
            {
              topic: `Inovasi Solutif dan Aksi Berkelanjutan: ${materi}`,
              rationale: 'Menumbuhkan kreativitas dan kewargaan aktif peserta didik melalui penciptaan produk nyata.',
              alokasiWaktuSaran: '2 JP x 45 menit',
              kaitanCP: 'Merancang gagasan kreatif berbasis potensi lokal untuk mengatasi kendala nyata.'
            }
          ]
        };

      case 'generate_tp':
        return {
          tujuanPembelajaran: [
            {
              tpText: `Melalui investigasi kontekstual, peserta didik mampu menganalisis konsep ${materi} secara kritis dan terstruktur dengan ketepatan minimal 80%.`,
              kko: 'Menganalisis (C4)',
              indikatorKetercapaian: [
                'Mengidentifikasi komponen utama secara runtut',
                'Menjelaskan hubungan sebab-akibat antarbagian materi'
              ],
              buktiBelajar: 'Lembar kerja analisis dan diagram alur pemikiran',
              relevansi: 'Sesuai dengan capaian kompetensi esensial penalaran kritis.'
            },
            {
              tpText: `Secara kolaboratif dalam kelompok, peserta didik mampu merancang solusi inovatif terkait permasalahan ${materi} di lingkungan sekitar.`,
              kko: 'Merancang (C6)',
              indikatorKetercapaian: [
                'Menemukan akar masalah secara objektif',
                'Menyusun purwarupa / rencana aksi yang realistis'
              ],
              buktiBelajar: 'Poster infografis atau proposal mini pemecahan masalah',
              relevansi: 'Menguatkan Profil Pelajar Pancasila dimensi Bergotong Royong & Kreatif.'
            },
            {
              tpText: `Peserta didik mampu merefleksikan peran dirinya dalam menerapkan pemahaman materi ${materi} pada pengambilan keputusan sehari-hari.`,
              kko: 'Merefleksikan (A5)',
              indikatorKetercapaian: [
                'Menuliskan evaluasi diri proses belajar',
                'Merumuskan 2 komitmen perbaikan berkelanjutan'
              ],
              buktiBelajar: 'Jurnal refleksi metakognisi pembelajar',
              relevansi: 'Mendukung pembelajaran bermakna dan berkesadaran tinggi.'
            }
          ]
        };

      case 'generate_activities':
        return {
          totalMenit: 90,
          pendahuluan: {
            durasiMenit: 15,
            aktivitasGuru: 'Menyapa siswa, memimpin doa, mengecek presensi, lalu memantik rasa ingin tahu melalui pertanyaan pemantik kontekstual. Menyampaikan alur dan kriteria keberhasilan pembelajaran.',
            aktivitasSiswa: 'Merespons pertanyaan pemantik secara sukarela, mengemukakan pengalaman awal, dan menyimak tujuan pembelajaran.',
            media: 'Slide presentasi / gambar stimulus nyata'
          },
          inti: {
            durasiMenit: 65,
            langkahLangkah: [
              {
                faseModel: 'Fase 1: Eksplorasi Masalah & Orientasi',
                durasiMenit: 15,
                aktivitasGuru: 'Menyajikan fenomena nyata dan membagi siswa ke dalam kelompok heterogen.',
                aktivitasSiswa: 'Mengamati stimulus, berdiskusi awal, dan merumuskan hipotesis penyelidikan.',
                diferensiasi: 'Bahan bacaan disiapkan dalam bentuk teks ringkas dan infografis visual.',
                asesmenTerkait: 'Observasi antusiasme dan partisipasi awal'
              },
              {
                faseModel: 'Fase 2: Investigasi Mandiri & Kelompok (LKPD)',
                durasiMenit: 30,
                aktivitasGuru: 'Berkeliling membimbing diskusi dan memberikan scaffolding bagi kelompok yang membutuhkan dukungan.',
                aktivitasSiswa: 'Menganalisis data, berkolaborasi menjawab pertanyaan pada LKPD, dan menyepakati solusi kelompok.',
                diferensiasi: 'Tingkat scaffolding disesuaikan: kelompok mandiri mendapat studi kasus lanjutan, kelompok berkembang mendapat panduan konsep bertahap.',
                asesmenTerkait: 'Penilaian proses kerja sama kelompok'
              },
              {
                faseModel: 'Fase 3: Berbagi Hasil & Umpan Balik',
                durasiMenit: 20,
                aktivitasGuru: 'Memandu sesi presentasi silang dan memberikan penguatan konsep.',
                aktivitasSiswa: 'Menyajikan hasil karya kelompok dan saling memberikan apresiasi serta masukan konstruktif.',
                diferensiasi: 'Format sajian fleksibel (mind map, paparan lisan, atau poster digital).',
                asesmenTerkait: 'Rubrik penilaian presentasi dan ketercapaian TP'
              }
            ]
          },
          penutup: {
            durasiMenit: 10,
            aktivitasGuru: 'Memandu penarikan simpulan umum, mengapresiasi kerja keras siswa, dan mengarahkan tindak lanjut.',
            aktivitasSiswa: 'Menuliskan poin refleksi 3-2-1 pada lembar refleksi diri.',
            media: 'Lembar Refleksi Pembelajar'
          }
        };

      case 'generate_diagnostic':
        return {
          nonKognitif: [
            {
              pertanyaan: `Bagaimana suasana perasaan dan kesiapan energimu untuk belajar ${mapel} hari ini?`,
              kategori: 'Kesiapan Emosional',
              pilihan: ['Sangat bersemangat', 'Tenang & siap', 'Agak lelah namun fokus', 'Perlu dorongan semangat']
            },
            {
              pertanyaan: 'Aktivitas belajar apa yang paling membantu pemahamanmu: membaca, melihat diagram/video, atau berdiskusi kelompok?',
              kategori: 'Preferensi Belajar',
              pilihan: ['Melihat visual/video', 'Mendengar penjelasan & diskusi', 'Praktik/mencoba langsung', 'Membaca mandiri']
            },
            {
              pertanyaan: 'Apakah kamu memiliki lingkungan belajar yang mendukung dan bebas bising di rumah?',
              kategori: 'Lingkungan Belajar',
              pilihan: ['Sangat mendukung', 'Cukup memadai', 'Sering terganggu kebisingan', 'Butuh tempat belajar tambahan']
            }
          ],
          kognitif: [
            {
              pertanyaan: `Sebutkan konsep dasar yang paling kamu ingat terkait materi ${materi} dan berikan satu contohnya!`,
              indikator: 'Mengidentifikasi konsep prasyarat esensial',
              kunciJawaban: 'Menyebutkan konsep kunci dengan contoh kontekstual yang relevan.',
              tindakLanjut: 'Jika siswa kesulitan, sediakan infografis ringkasan konsep prasyarat.'
            }
          ]
        };

      case 'generate_formative':
        return {
          instrumen: [
            {
              jenis: 'Lembar Kerja Peserta Didik (LKPD) Inkuiri Kolaboratif',
              petunjuk: 'Diskusikan bersama kelompokmu untuk menganalisis studi kasus materi dan temukan 2 solusi yang paling efektif.',
              kriteriaKeberhasilan: [
                'Ketepatan identifikasi variabel masalah',
                'Kerapian dan kelogisan penalaran solusi',
                'Pembagian peran yang adil dan kolaboratif'
              ],
              rubrik: [
                {
                  aspek: 'Kualitas Analisis & Solusi',
                  baruBerkembang: 'Solusi belum menjawab pokok permasalahan.',
                  layak: 'Solusi cukup relevan dengan penjelasan umum.',
                  cakap: 'Solusi tepat, logis, dan didukung fakta kasus.',
                  mahir: 'Solusi sangat inovatif, komprehensif, dan berdampak nyata.'
                },
                {
                  aspek: 'Kolaborasi & Keaktifan',
                  baruBerkembang: 'Bekerja pasif atau didominasi satu orang.',
                  layak: 'Berbagi tugas namun komunikasi belum merata.',
                  cakap: 'Saling mendengarkan dan berkontribusi aktif.',
                  mahir: 'Membangun sinergi tim dan saling memberdayakan.'
                }
              ],
              umpanBalikGuidance: 'Beri apresiasi atas argumentasi unik siswa dan ajukan pertanyaan pemandu jika ada miskonsepsi.'
            }
          ]
        };

      case 'review_document':
        return {
          skorKelayakan: 93,
          statusKelayakan: 'Sangat Baik & Siap Diterapkan',
          kelebihan: [
            'Tujuan pembelajaran telah memuat KKO yang jelas dan kriteria ketercapaian terukur.',
            'Alur kegiatan mencerminkan pembelajaran berkesadaran, bermakna, dan menggembirakan.',
            'Diferensiasi proses dirancang fleksibel untuk beragam tingkat kesiapan peserta didik.'
          ],
          keselarasanTPAktivitasAsesmen: 'Sangat selaras. Butir asesmen formatif secara langsung mengukur indikator ketercapaian pada aktivitas inti.',
          saranPerbaikan: [
            {
              bagian: 'Alternatif Media Non-Digital',
              rekomendasi: 'Sediakan opsi media cetak jika terjadi kendala listrik atau jaringan internet di ruang kelas.'
            },
            {
              bagian: 'Refleksi Metakognisi Siswa',
              rekomendasi: 'Sertakan pertanyaan pemandu refleksi agar siswa menyadari strategi belajar mana yang paling efektif baginya.'
            }
          ],
          catatanVerifikasi: 'Draf telah dievaluasi dengan prinsip Kurikulum Merdeka. Guru berwenang penuh mengadaptasi sesuai dinamika kelas.'
        };

      case 'revise_section':
        return {
          sectionName: payload.sectionName || 'Bagian Dokumen',
          revisedContent: `[Hasil Revisi Berdasarkan Instruksi: "${customPrompt}"]\nKonten disempurnakan dengan penekanan pada keterlibatan aktif siswa, diferensiasi yang lebih adaptif, dan indikator penilaian yang lebih operasional.`,
          catatanPerubahan: 'Mempertegas kejelasan instruksi, menyelaraskan alokasi waktu, dan memperkuat instrumen umpan balik.'
        };

      default:
        return { message: 'Rekomendasi kurikulum berhasil disiapkan.', data: payload };
    }
  }
}
