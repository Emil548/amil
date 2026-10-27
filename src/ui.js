/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * UI Controller untuk GEN-RPM AI STUDIO: Wizard, Dual-Subject Panel, Editor, DPL Validator, & Live Preview
 */

import { saveState, exportStateAsJSON } from './state.js';
import { validateDPLSelection, validateActivityDurations, checkModulAjarCompleteness, checkRPMCompleteness, sanitizeText } from './utils/curriculum-rules.js';
import { exportToDocx } from './docx-export.js';
import { exportToPDF, triggerPrint } from './pdf-export.js';

export class UIController {
  constructor(state, aiClient) {
    this.state = state;
    this.ai = aiClient;
    this.currentStep = 'step-identity'; // 'step-identity' | 'step-doctype' | 'step-topics-tp' | 'step-activities-assessment' | 'step-editor' | 'step-preview'
  }

  init() {
    this.applyThemeAndPalette();
    this.bindEvents();
    this.renderActiveStep();
    this.renderSubjectPanels();
    this.updatePreviewDocument();
    this.renderCompletenessBadge();
    this.initLucideIcons();
  }

  initLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn('Lucide createIcons error:', e);
      }
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-blue-600 text-white'
    };
    toast.className = `px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 text-sm transition-all transform duration-300 opacity-0 translate-y-2 ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `<span>${sanitizeText(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  applyThemeAndPalette() {
    const root = document.documentElement;
    root.setAttribute('data-theme', this.state.theme);
    root.setAttribute('data-palette', this.state.palette);
    root.setAttribute('data-doc-template', this.state.docTemplate);
    if (this.state.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  setDirty() {
    this.state.isDirty = true;
    const dirtyEl = document.getElementById('save-status-indicator');
    if (dirtyEl) {
      dirtyEl.innerHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> <span class="text-xs text-amber-600 font-medium">Perubahan belum disimpan</span>`;
    }
    this.updatePreviewDocument();
    this.renderCompletenessBadge();
  }

  setSaved() {
    this.state.isDirty = false;
    const dirtyEl = document.getElementById('save-status-indicator');
    if (dirtyEl) {
      dirtyEl.innerHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span> <span class="text-xs text-slate-500">Tersimpan di browser lokal (${new Date().toLocaleTimeString('id-ID')})</span>`;
    }
  }

  bindEvents() {
    // Navigasi Wizard
    document.querySelectorAll('[data-step-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-step-target');
        this.goToStep(target);
      });
    });

    // Simpan Manual
    const saveBtn = document.getElementById('btn-save-all');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveState(this.state);
        this.setSaved();
        this.showToast('Data berhasil disimpan ke penyimpanan lokal browser.', 'success');
      });
    }

    // Reset Konfirmasi
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin mengatur ulang data ke draf awal? Semua modifikasi yang belum diekspor akan tereset.')) {
          localStorage.removeItem('GEN_RPM_STUDIO_DATA_V1');
          location.reload();
        }
      });
    }

    // Backup & Restore JSON
    const exportJsonBtn = document.getElementById('btn-export-json');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        exportStateAsJSON(this.state);
        this.showToast('File backup JSON berhasil diunduh.', 'success');
      });
    }

    const importJsonInput = document.getElementById('input-import-json');
    if (importJsonInput) {
      importJsonInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (!parsed.mapel1) throw new Error('Format file JSON tidak valid untuk GEN-RPM STUDIO.');
            Object.assign(this.state, parsed);
            saveState(this.state);
            this.showToast('Data kurikulum berhasil diimpor dari file JSON.', 'success');
            this.init();
          } catch (err) {
            alert('Gagal mengimpor file: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Mode Dokumen (Modul Ajar vs RPM)
    document.querySelectorAll('input[name="docType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.state.docType = e.target.value;
        this.setDirty();
        this.renderSubjectPanels();
        this.renderActiveStep();
        this.updatePreviewDocument();
      });
    });

    // Switcher Mapel 1 & Mapel 2
    document.querySelectorAll('[data-subject-tab]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabKey = e.currentTarget.getAttribute('data-subject-tab');
        this.state.activeSubjectTab = tabKey;
        this.renderSubjectPanels();
        this.updatePreviewDocument();
      });
    });

    const toggleMapel2Check = document.getElementById('checkbox-enable-mapel2');
    if (toggleMapel2Check) {
      toggleMapel2Check.addEventListener('change', (e) => {
        this.state.enableSubject2 = e.target.checked;
        const mapel2Tab = document.getElementById('tab-btn-mapel2');
        if (mapel2Tab) {
          if (e.target.checked) {
            mapel2Tab.classList.remove('hidden');
          } else {
            mapel2Tab.classList.add('hidden');
            this.state.activeSubjectTab = 'mapel1';
          }
        }
        this.setDirty();
        this.renderSubjectPanels();
        this.updatePreviewDocument();
      });
    }

    // Ekspor Tombol
    const btnDocx = document.getElementById('btn-download-docx');
    if (btnDocx) {
      btnDocx.addEventListener('click', async () => {
        this.showToast('Menyiapkan dokumen Microsoft Word (.docx)...', 'info');
        await exportToDocx(this.state, this.state.activeSubjectTab);
        this.showToast('File Word berhasil diunduh.', 'success');
      });
    }

    const btnPdf = document.getElementById('btn-download-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', async () => {
        this.showToast('Menyiapkan dokumen PDF...', 'info');
        await exportToPDF(this.state, this.state.activeSubjectTab);
        this.showToast('File PDF berhasil disiapkan.', 'success');
      });
    }

    const btnPrint = document.getElementById('btn-print-doc');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        triggerPrint();
      });
    }

    // Pengaturan AI Modal
    const btnAiSettings = document.getElementById('btn-ai-settings');
    const aiModal = document.getElementById('modal-ai-settings');
    const closeAiModal = document.getElementById('btn-close-ai-modal');
    if (btnAiSettings && aiModal) {
      btnAiSettings.addEventListener('click', () => aiModal.classList.remove('hidden'));
    }
    if (closeAiModal && aiModal) {
      closeAiModal.addEventListener('click', () => aiModal.classList.add('hidden'));
    }

    // Uji Koneksi AI
    const btnTestAi = document.getElementById('btn-test-ai-connection');
    if (btnTestAi) {
      btnTestAi.addEventListener('click', async () => {
        btnTestAi.disabled = true;
        btnTestAi.innerHTML = 'Menguji...';
        const res = await this.ai.testConnection();
        btnTestAi.disabled = false;
        btnTestAi.innerHTML = 'Uji Koneksi';
        this.renderAIStatusBadge();
        this.showToast(res.message, res.success ? 'success' : 'warning');
      });
    }

    // Tinjau dengan AI
    const btnAiReview = document.getElementById('btn-ai-review');
    if (btnAiReview) {
      btnAiReview.addEventListener('click', async () => {
        this.handleAIReview();
      });
    }

    // Bind input umum identitas guru & kepsek
    ['guruName', 'guruNip', 'kepalaSekolahName', 'kepalaSekolahNip', 'sekolah', 'titimangsaKota', 'titimangsaTanggal'].forEach(field => {
      const el = document.getElementById(`input-${field}`);
      if (el) {
        el.value = this.state[field] || '';
        el.addEventListener('input', (e) => {
          this.state[field] = e.target.value;
          this.setDirty();
        });
      }
    });

    // Tema & Palet Switcher
    const selectTheme = document.getElementById('select-ui-theme');
    if (selectTheme) {
      selectTheme.value = this.state.theme;
      selectTheme.addEventListener('change', (e) => {
        this.state.theme = e.target.value;
        this.applyThemeAndPalette();
        this.setDirty();
      });
    }

    const selectPalette = document.getElementById('select-ui-palette');
    if (selectPalette) {
      selectPalette.value = this.state.palette;
      selectPalette.addEventListener('change', (e) => {
        this.state.palette = e.target.value;
        this.applyThemeAndPalette();
        this.setDirty();
      });
    }

    const toggleDark = document.getElementById('toggle-dark-mode');
    if (toggleDark) {
      toggleDark.checked = this.state.darkMode;
      toggleDark.addEventListener('change', (e) => {
        this.state.darkMode = e.target.checked;
        this.applyThemeAndPalette();
        this.setDirty();
      });
    }

    const selectDocTemplate = document.getElementById('select-doc-template');
    if (selectDocTemplate) {
      selectDocTemplate.value = this.state.docTemplate;
      selectDocTemplate.addEventListener('change', (e) => {
        this.state.docTemplate = e.target.value;
        this.applyThemeAndPalette();
        this.updatePreviewDocument();
        this.setDirty();
      });
    }
  }

  goToStep(stepId) {
    this.currentStep = stepId;
    this.renderSubjectPanels();
    this.renderActiveStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderActiveStep() {
    // Perbarui tab wizard
    document.querySelectorAll('.wizard-tab-item').forEach(tab => {
      const target = tab.getAttribute('data-step-target');
      if (target === this.currentStep) {
        tab.className = 'wizard-tab-item flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white shadow-sm';
      } else {
        tab.className = 'wizard-tab-item flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
      }
    });

    // Tampilkan panel aktif
    document.querySelectorAll('.wizard-step-panel').forEach(panel => {
      if (panel.id === this.currentStep) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    this.renderAIStatusBadge();
    this.initLucideIcons();
  }

  renderAIStatusBadge() {
    const badge = document.getElementById('ai-status-badge');
    if (!badge) return;
    if (this.ai.status === 'connected') {
      badge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> <span>AI Online (Gemini)</span>`;
    } else {
      badge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500"></span> <span>Mode Demo Kurikulum</span>`;
    }
  }

  renderSubjectPanels() {
    // Update active tab visual
    const tab1 = document.getElementById('tab-btn-mapel1');
    const tab2 = document.getElementById('tab-btn-mapel2');
    if (tab1 && tab2) {
      if (this.state.activeSubjectTab === 'mapel1') {
        tab1.className = 'px-4 py-2 text-sm font-bold border-b-2 border-blue-600 text-blue-600 dark:text-blue-400';
        tab2.className = 'px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent';
      } else {
        tab2.className = 'px-4 py-2 text-sm font-bold border-b-2 border-blue-600 text-blue-600 dark:text-blue-400';
        tab1.className = 'px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent';
      }
    }

    const curSubjKey = this.state.activeSubjectTab;
    const curSubj = this.state[curSubjKey];
    if (!curSubj) return;

    // Render input fields untuk subjek aktif
    const subjectFormContainer = document.getElementById('subject-dynamic-form-fields');
    if (subjectFormContainer) {
      subjectFormContainer.innerHTML = this.buildSubjectFormHTML(curSubj, curSubjKey);
      this.bindSubjectFormEvents(curSubj, curSubjKey);
    }

    // Render DPL & Asesmen jika RPM
    this.renderDPLSection(curSubj);
    this.renderTPList(curSubj);
    this.renderActivitiesSection(curSubj);
  }

  buildSubjectFormHTML(curSubj, curSubjKey) {
    const isRPM = this.state.docType === 'rpm';
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Mata Pelajaran</label>
          <input type="text" id="input-sub-mapel" value="${sanitizeText(curSubj.mataPelajaran)}" class="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Materi Pokok / Topik</label>
          <div class="flex space-x-2">
            <input type="text" id="input-sub-materi" value="${sanitizeText(curSubj.materiPokok)}" class="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium" />
            <button id="btn-generate-topics-ai" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 whitespace-nowrap">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>Rekomendasi AI</span>
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Kelas & Fase</label>
          <div class="grid grid-cols-2 gap-2">
            <select id="select-sub-kelas" class="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              ${['X', 'XI', 'XII', 'VII', 'VIII', 'IX', 'IV', 'V', 'VI'].map(k => `<option value="${k}" ${curSubj.kelas === k ? 'selected' : ''}>Kelas ${k}</option>`).join('')}
            </select>
            <select id="select-sub-fase" class="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              ${['A', 'B', 'C', 'D', 'E', 'F'].map(f => `<option value="${f}" ${curSubj.fase === f ? 'selected' : ''}>Fase ${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">Alokasi Waktu</label>
          <input type="text" id="input-sub-alokasi" value="${sanitizeText(curSubj.alokasiWaktu)}" placeholder="Contoh: 2 JP x 45 menit" class="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
        </div>
      </div>

      <div class="mt-4">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
          Capaian Pembelajaran (CP) Resmi / Referensi
          <span class="text-xs font-normal text-slate-400">(Wajib diverifikasi, tidak dikarang)</span>
        </label>
        <textarea id="input-sub-cp" rows="3" class="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 leading-relaxed">${sanitizeText(curSubj.capaianPembelajaran)}</textarea>
      </div>

      <div id="ai-topics-recommendations-panel" class="mt-3 hidden p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <!-- Kontainer Rekomendasi Topik AI -->
      </div>
    `;
  }

  bindSubjectFormEvents(curSubj, curSubjKey) {
    const mapelInput = document.getElementById('input-sub-mapel');
    if (mapelInput) {
      mapelInput.addEventListener('input', (e) => {
        curSubj.mataPelajaran = e.target.value;
        this.setDirty();
      });
    }

    const materiInput = document.getElementById('input-sub-materi');
    if (materiInput) {
      materiInput.addEventListener('input', (e) => {
        curSubj.materiPokok = e.target.value;
        this.setDirty();
      });
    }

    const alokasiInput = document.getElementById('input-sub-alokasi');
    if (alokasiInput) {
      alokasiInput.addEventListener('input', (e) => {
        curSubj.alokasiWaktu = e.target.value;
        this.setDirty();
      });
    }

    const cpInput = document.getElementById('input-sub-cp');
    if (cpInput) {
      cpInput.addEventListener('input', (e) => {
        curSubj.capaianPembelajaran = e.target.value;
        this.setDirty();
      });
    }

    // Tombol Rekomendasi Topik AI
    const btnTopicsAI = document.getElementById('btn-generate-topics-ai');
    if (btnTopicsAI) {
      btnTopicsAI.addEventListener('click', async () => {
        btnTopicsAI.disabled = true;
        btnTopicsAI.innerHTML = `<span class="animate-spin mr-1">⌛</span> Menghasilkan...`;
        this.showToast('Menghasilkan rekomendasi topik berbasis Kurikulum...', 'info');

        const res = await this.ai.requestAI('recommend_topics', {
          mataPelajaran: curSubj.mataPelajaran,
          jenjang: curSubj.jenjang,
          kelas: curSubj.kelas,
          fase: curSubj.fase,
          semester: curSubj.semester
        });

        btnTopicsAI.disabled = false;
        btnTopicsAI.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i><span>Rekomendasi AI</span>`;
        this.initLucideIcons();

        if (res.data && res.data.recommendations) {
          this.renderTopicRecommendations(res.data.recommendations, curSubj);
        }
      });
    }
  }

  renderTopicRecommendations(topics, curSubj) {
    const container = document.getElementById('ai-topics-recommendations-panel');
    if (!container) return;
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
          <span>💡 Rekomendasi Topik Kurikulum (AI Suggestion)</span>
        </h4>
        <span class="text-xs text-indigo-600 dark:text-indigo-400">Pilih salah satu untuk diterapkan</span>
      </div>
      <div class="space-y-2">
        ${topics.map((t, idx) => `
          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-900 flex items-start justify-between">
            <div class="flex-1 pr-3">
              <div class="font-semibold text-sm text-slate-800 dark:text-slate-100">${sanitizeText(t.topic)}</div>
              <div class="text-xs text-slate-500 mt-1">${sanitizeText(t.rationale)}</div>
              <div class="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-mono">Alokasi saran: ${sanitizeText(t.alokasiWaktuSaran || '2 JP')}</div>
            </div>
            <button data-apply-topic="${idx}" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold whitespace-nowrap">
              Gunakan Topik
            </button>
          </div>
        `).join('')}
      </div>
    `;

    // Bind tombol gunakan topik
    container.querySelectorAll('[data-apply-topic]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-apply-topic'));
        const chosen = topics[idx];
        if (chosen) {
          curSubj.materiPokok = chosen.topic;
          if (chosen.alokasiWaktuSaran) curSubj.alokasiWaktu = chosen.alokasiWaktuSaran;
          const materiInput = document.getElementById('input-sub-materi');
          if (materiInput) materiInput.value = chosen.topic;
          this.setDirty();
          this.showToast(`Topik "${chosen.topic}" diterapkan.`, 'success');
          container.classList.add('hidden');
        }
      });
    });
  }

  renderDPLSection(curSubj) {
    const isRPM = this.state.docType === 'rpm';
    const dplContainer = document.getElementById('rpm-dpl-container');
    if (!dplContainer) return;

    if (!isRPM) {
      dplContainer.classList.add('hidden');
      return;
    }
    dplContainer.classList.remove('hidden');

    const rpmData = curSubj.rpm || {};
    const selectedDPL = rpmData.dimensiProfilLulusan || [];

    const dplOptions = [
      { id: 'keimanan', label: '1. Keimanan & Ketakwaan thd Tuhan YME' },
      { id: 'kewargaan', label: '2. Kewargaan' },
      { id: 'penalaran_kritis', label: '3. Penalaran Kritis' },
      { id: 'kreativitas', label: '4. Kreativitas' },
      { id: 'kolaborasi', label: '5. Kolaborasi' },
      { id: 'kemandirian', label: '6. Kemandirian' },
      { id: 'kesehatan', label: '7. Kesehatan' },
      { id: 'komunikasi', label: '8. Komunikasi' }
    ];

    const validation = validateDPLSelection(selectedDPL);

    dplContainer.innerHTML = `
      <div class="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
            <span>🎯 Dimensi Profil Lulusan (DPL) — Khusus RPM</span>
          </h4>
          <span class="text-xs px-2 py-0.5 rounded-full ${validation.isValid ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-rose-100 text-rose-800 font-bold'}">
            Terpilih: ${selectedDPL.length} / Maks 3
          </span>
        </div>
        <p class="text-xs text-amber-700 dark:text-amber-400 mb-3">
          Wajib memilih 1–3 dimensi utama agar pembelajaran bermakna dan terfokus.
        </p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          ${dplOptions.map(opt => `
            <label class="flex items-center space-x-2 p-2 rounded border text-xs cursor-pointer ${selectedDPL.includes(opt.id) ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 font-bold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">
              <input type="checkbox" value="${opt.id}" ${selectedDPL.includes(opt.id) ? 'checked' : ''} class="rounded text-amber-600 dpl-checkbox-input" />
              <span>${opt.label}</span>
            </label>
          `).join('')}
        </div>

        ${!validation.isValid ? `
          <div class="mt-2 text-xs text-rose-600 font-semibold flex items-center space-x-1">
            <span>⚠️ ${validation.errors.join(' ')}</span>
          </div>
        ` : ''}
      </div>
    `;

    // Event listener checkbox DPL
    dplContainer.querySelectorAll('.dpl-checkbox-input').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const val = e.target.value;
        let list = [...(curSubj.rpm.dimensiProfilLulusan || [])];
        if (e.target.checked) {
          if (!list.includes(val)) list.push(val);
        } else {
          list = list.filter(x => x !== val);
        }
        curSubj.rpm.dimensiProfilLulusan = list;
        this.setDirty();
        this.renderDPLSection(curSubj);
      });
    });
  }

  renderTPList(curSubj) {
    const container = document.getElementById('tp-list-container');
    if (!container) return;

    const tps = curSubj.tujuanPembelajaranList || [];

    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Daftar Rumusan Tujuan Pembelajaran (TP)</h4>
        <div class="space-x-2">
          <button id="btn-add-tp-manual" class="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-lg">
            + Tambah Manual
          </button>
          <button id="btn-generate-tp-ai" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 inline-flex">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>Rumuskan dengan AI</span>
          </button>
        </div>
      </div>

      <div class="space-y-3">
        ${tps.map((tp, idx) => `
          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative group">
            <div class="flex items-start justify-between">
              <span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">TP ${idx + 1} (${tp.kko || 'KKO'})</span>
              <button data-remove-tp="${idx}" class="text-slate-400 hover:text-rose-600 text-xs font-semibold">Hapus</button>
            </div>
            <textarea data-edit-tp="${idx}" rows="2" class="w-full mt-2 px-2.5 py-1.5 text-sm border rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">${sanitizeText(tp.text)}</textarea>
            <div class="mt-2 text-xs text-slate-500 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><strong>Indikator:</strong> ${sanitizeText(tp.indikator || '-')}</div>
              <div><strong>Bukti Belajar:</strong> ${sanitizeText(tp.bukti || '-')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Bindings
    container.querySelectorAll('[data-edit-tp]').forEach(ta => {
      ta.addEventListener('input', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-edit-tp'));
        if (curSubj.tujuanPembelajaranList[idx]) {
          curSubj.tujuanPembelajaranList[idx].text = e.target.value;
          this.setDirty();
        }
      });
    });

    container.querySelectorAll('[data-remove-tp]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-remove-tp'));
        curSubj.tujuanPembelajaranList.splice(idx, 1);
        this.setDirty();
        this.renderTPList(curSubj);
      });
    });

    const addManualBtn = document.getElementById('btn-add-tp-manual');
    if (addManualBtn) {
      addManualBtn.addEventListener('click', () => {
        curSubj.tujuanPembelajaranList.push({
          id: `tp-${Date.now()}`,
          text: 'Peserta didik mampu...',
          kko: 'Operasional',
          indikator: 'Kriteria ketercapaian',
          bukti: 'Produk/kinerja siswa'
        });
        this.setDirty();
        this.renderTPList(curSubj);
      });
    }

    const genTpBtn = document.getElementById('btn-generate-tp-ai');
    if (genTpBtn) {
      genTpBtn.addEventListener('click', async () => {
        genTpBtn.disabled = true;
        genTpBtn.innerHTML = 'Merumuskan...';
        this.showToast('Merumuskan Tujuan Pembelajaran terukur via AI...', 'info');

        const res = await this.ai.requestAI('generate_tp', {
          mataPelajaran: curSubj.mataPelajaran,
          materiPokok: curSubj.materiPokok,
          fase: curSubj.fase,
          kelas: curSubj.kelas,
          capaianPembelajaran: curSubj.capaianPembelajaran
        });

        genTpBtn.disabled = false;
        genTpBtn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i><span>Rumuskan dengan AI</span>`;
        this.initLucideIcons();

        if (res.data && res.data.tujuanPembelajaran) {
          curSubj.tujuanPembelajaranList = res.data.tujuanPembelajaran.map((item, i) => ({
            id: `tp-ai-${Date.now()}-${i}`,
            text: item.tpText || item.text,
            kko: item.kko || 'Operasional',
            indikator: (item.indikatorKetercapaian || []).join('; '),
            bukti: item.buktiBelajar || '-'
          }));
          this.setDirty();
          this.renderTPList(curSubj);
          this.showToast('Rumusan Tujuan Pembelajaran baru diterapkan.', 'success');
        }
      });
    }
  }

  renderActivitiesSection(curSubj) {
    const container = document.getElementById('activities-assessment-container');
    if (!container) return;

    const isRPM = this.state.docType === 'rpm';
    if (isRPM) {
      const rpmData = curSubj.rpm || {};
      const pb = rpmData.pengalamanBelajar || {};
      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Alur Pengalaman Belajar RPM (Memahami - Mengaplikasi - Merefleksi)</h4>
            <button id="btn-gen-rpm-activities-ai" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>Generate Pengalaman Belajar AI</span>
            </button>
          </div>

          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-xs text-blue-600 uppercase mb-1">1. Tahap Memahami (Meaningful Understanding)</div>
            <textarea id="rpm-input-memahami" rows="3" class="w-full text-sm p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">${sanitizeText(pb.memahami?.guru || pb.memahami?.tujuan || '')}</textarea>
          </div>

          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-xs text-emerald-600 uppercase mb-1">2. Tahap Mengaplikasi (Real-World Application)</div>
            <textarea id="rpm-input-mengaplikasi" rows="3" class="w-full text-sm p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">${sanitizeText(pb.mengaplikasi?.guru || pb.mengaplikasi?.tujuan || '')}</textarea>
          </div>

          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="font-bold text-xs text-purple-600 uppercase mb-1">3. Tahap Merefleksi (Metacognition & Self-Reflection)</div>
            <textarea id="rpm-input-merefleksi" rows="3" class="w-full text-sm p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">${sanitizeText(pb.merefleksi?.guru || pb.merefleksi?.tujuan || '')}</textarea>
          </div>
        </div>
      `;

      // Bind input events
      ['memahami', 'mengaplikasi', 'merefleksi'].forEach(stage => {
        const el = document.getElementById(`rpm-input-${stage}`);
        if (el) {
          el.addEventListener('input', (e) => {
            if (!curSubj.rpm.pengalamanBelajar) curSubj.rpm.pengalamanBelajar = {};
            if (!curSubj.rpm.pengalamanBelajar[stage]) curSubj.rpm.pengalamanBelajar[stage] = { durasi: 20 };
            curSubj.rpm.pengalamanBelajar[stage].guru = e.target.value;
            this.setDirty();
          });
        }
      });

      const genRpmBtn = document.getElementById('btn-gen-rpm-activities-ai');
      if (genRpmBtn) {
        genRpmBtn.addEventListener('click', async () => {
          genRpmBtn.disabled = true;
          this.showToast('Menyusun pengalaman belajar mendalam dengan AI...', 'info');
          const res = await this.ai.requestAI('generate_activities', {
            mataPelajaran: curSubj.mataPelajaran,
            materiPokok: curSubj.materiPokok,
            modelPembelajaran: 'Pembelajaran Mendalam (Deep Learning)',
            alokasiWaktu: curSubj.alokasiWaktu,
            tujuanPembelajaran: curSubj.tujuanPembelajaranList
          });
          genRpmBtn.disabled = false;
          if (res.data) {
            const inti = res.data.inti?.langkahLangkah || [];
            curSubj.rpm.pengalamanBelajar.memahami = { durasi: 25, guru: inti[0]?.aktivitasGuru || 'Eksplorasi konsep terarah' };
            curSubj.rpm.pengalamanBelajar.mengaplikasi = { durasi: 35, guru: inti[1]?.aktivitasGuru || 'Aplikasi pemecahan masalah nyata' };
            curSubj.rpm.pengalamanBelajar.merefleksi = { durasi: 15, guru: res.data.penutup?.aktivitasGuru || 'Refleksi metakognisi pembelajar' };
            this.setDirty();
            this.renderActivitiesSection(curSubj);
            this.showToast('Pengalaman belajar RPM berhasil diperbarui.', 'success');
          }
        });
      }

    } else {
      // Modul Ajar Kurikulum Merdeka
      const kg = curSubj.kegiatan || {};
      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Langkah Kegiatan Pembelajaran (Pendahuluan - Inti - Penutup)</h4>
            <button id="btn-gen-modul-activities-ai" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>Generate Alur Kegiatan AI</span>
            </button>
          </div>

          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-blue-600 uppercase">1. Kegiatan Pendahuluan</span>
              <span class="text-xs text-slate-400">Durasi: ${kg.pendahuluan?.durasi || 15} Menit</span>
            </div>
            <textarea id="modul-input-pendahuluan" rows="2" class="w-full text-sm p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">${sanitizeText(kg.pendahuluan?.aktivitasGuru || '')}</textarea>
          </div>

          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-emerald-600 uppercase">2. Kegiatan Inti</span>
              <span class="text-xs text-slate-400">Durasi: ${kg.inti?.durasi || 65} Menit</span>
            </div>
            <div class="space-y-2 mt-2">
              ${(kg.inti?.langkahLangkah || []).map((step, idx) => `
                <div class="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs">
                  <div class="font-bold text-slate-700 dark:text-slate-200">${step.fase || `Langkah ${idx+1}`} (${step.durasi || 15} mnt)</div>
                  <div class="mt-1 text-slate-600 dark:text-slate-400"><strong>Guru:</strong> ${sanitizeText(step.guru || '')}</div>
                  <div class="mt-1 text-slate-600 dark:text-slate-400"><strong>Siswa:</strong> ${sanitizeText(step.siswa || '')}</div>
                  <div class="mt-1 text-indigo-600 dark:text-indigo-400"><strong>Diferensiasi:</strong> ${sanitizeText(step.diferensiasi || 'Fleksibel')}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-purple-600 uppercase">3. Kegiatan Penutup</span>
              <span class="text-xs text-slate-400">Durasi: ${kg.penutup?.durasi || 10} Menit</span>
            </div>
            <textarea id="modul-input-penutup" rows="2" class="w-full text-sm p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">${sanitizeText(kg.penutup?.aktivitasGuru || '')}</textarea>
          </div>

          <!-- ASESMEN DIAGNOSTIK (AWAL) -->
          <div class="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-bold uppercase text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
                <i data-lucide="stethoscope" class="w-4 h-4 text-emerald-600"></i>
                <span>III. Asesmen Diagnostik / Awal (Non-Kognitif & Kognitif)</span>
              </h5>
              <button id="btn-gen-diagnostic-ai" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                <span>Generate Diagnostik AI</span>
              </button>
            </div>

            <!-- Non Kognitif -->
            <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">A. Diagnostik Non-Kognitif (Ramah, Sukarela, Menjaga Privasi):</span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label class="flex items-center space-x-2">
                  <input type="checkbox" id="chk-diag-emosi" checked class="rounded text-emerald-600" />
                  <span>Kesiapan emosional & kesejahteraan belajar</span>
                </label>
                <label class="flex items-center space-x-2">
                  <input type="checkbox" id="chk-diag-minat" checked class="rounded text-emerald-600" />
                  <span>Minat & preferensi belajar</span>
                </label>
                <label class="flex items-center space-x-2">
                  <input type="checkbox" id="chk-diag-rumah" checked class="rounded text-emerald-600" />
                  <span>Dukungan & aktivitas belajar di rumah</span>
                </label>
                <label class="flex items-center space-x-2">
                  <input type="checkbox" id="chk-diag-kondisi" checked class="rounded text-emerald-600" />
                  <span>Kebutuhan dukungan & kondisi khusus</span>
                </label>
                <label class="flex items-center space-x-2 sm:col-span-2">
                  <input type="checkbox" id="chk-diag-lingkungan" checked class="rounded text-emerald-600" />
                  <span>Lingkungan belajar yang dirasakan siswa</span>
                </label>
              </div>
            </div>

            <!-- Kognitif -->
            <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">B. Diagnostik Kognitif (Konsep Prasyarat & Miskonsepsi):</span>
              <div class="space-y-2 text-xs">
                ${(curSubj.asesmenDiagnostik?.kognitifPertanyaan || []).map((kp, idx) => `
                  <div class="p-2 bg-slate-50 dark:bg-slate-900 rounded border">
                    <p class="font-semibold text-slate-800 dark:text-slate-200">${idx+1}. ${sanitizeText(kp.soal || kp.pertanyaan || '')}</p>
                    <p class="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1"><strong>Kunci:</strong> ${sanitizeText(kp.kunci || kp.kunciJawaban || '')}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5"><strong>Tindak Lanjut:</strong> ${sanitizeText(kp.tindakLanjut || '')}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- ASESMEN FORMATIF -->
          <div class="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-bold uppercase text-blue-900 dark:text-blue-200 flex items-center space-x-1.5">
                <i data-lucide="check-square" class="w-4 h-4 text-blue-600"></i>
                <span>IV. Asesmen Formatif & Rubrik Penilaian</span>
              </h5>
              <button id="btn-gen-formative-ai" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                <span>Generate Formatif AI</span>
              </button>
            </div>

            <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-blue-900">
              <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Pilihan Instrumen Asesmen Formatif:</span>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <label class="flex items-center space-x-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 rounded border">
                  <input type="checkbox" id="chk-form-kuis" checked class="rounded text-blue-600" />
                  <span>Kuis Singkat</span>
                </label>
                <label class="flex items-center space-x-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 rounded border">
                  <input type="checkbox" id="chk-form-lkpd" checked class="rounded text-blue-600" />
                  <span>LKPD Kolaboratif</span>
                </label>
                <label class="flex items-center space-x-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 rounded border">
                  <input type="checkbox" id="chk-form-diskusi" checked class="rounded text-blue-600" />
                  <span>Diskusi Kelompok</span>
                </label>
                <label class="flex items-center space-x-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 rounded border">
                  <input type="checkbox" id="chk-form-presentasi" checked class="rounded text-blue-600" />
                  <span>Presentasi</span>
                </label>
                <label class="flex items-center space-x-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 rounded border col-span-2 sm:col-span-1">
                  <input type="checkbox" id="chk-form-observasi" checked class="rounded text-blue-600" />
                  <span>Observasi Kinerja</span>
                </label>
              </div>
            </div>

            <!-- Rubrik Skala 1 - 4 -->
            <div class="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-blue-900 overflow-x-auto">
              <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Rubrik & Kriteria Keberhasilan (Skala 1 - 4):</span>
              <table class="w-full text-[11px] border-collapse border border-slate-200 dark:border-slate-700">
                <thead>
                  <tr class="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                    <th class="p-1.5 border border-slate-200 dark:border-slate-700 text-left">Aspek Dinilai</th>
                    <th class="p-1.5 border border-slate-200 dark:border-slate-700 text-left">1. Baru Berkembang</th>
                    <th class="p-1.5 border border-slate-200 dark:border-slate-700 text-left">2. Layak</th>
                    <th class="p-1.5 border border-slate-200 dark:border-slate-700 text-left">3. Cakap</th>
                    <th class="p-1.5 border border-slate-200 dark:border-slate-700 text-left">4. Mahir</th>
                  </tr>
                </thead>
                <tbody>
                  ${(curSubj.asesmenFormatif?.rubrikSkala || []).map((r, rIdx) => `
                    <tr>
                      <td class="p-1.5 border border-slate-200 dark:border-slate-700 font-semibold">${sanitizeText(r.aspek)}</td>
                      <td class="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">${sanitizeText(r.skor1)}</td>
                      <td class="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">${sanitizeText(r.skor2)}</td>
                      <td class="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">${sanitizeText(r.skor3)}</td>
                      <td class="p-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-blue-700 dark:text-blue-300">${sanitizeText(r.skor4)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      const penInput = document.getElementById('modul-input-pendahuluan');
      if (penInput) {
        penInput.addEventListener('input', (e) => {
          if (!curSubj.kegiatan) curSubj.kegiatan = {};
          if (!curSubj.kegiatan.pendahuluan) curSubj.kegiatan.pendahuluan = { durasi: 15 };
          curSubj.kegiatan.pendahuluan.aktivitasGuru = e.target.value;
          this.setDirty();
        });
      }

      const pntpInput = document.getElementById('modul-input-penutup');
      if (pntpInput) {
        pntpInput.addEventListener('input', (e) => {
          if (!curSubj.kegiatan.penutup) curSubj.kegiatan.penutup = { durasi: 10 };
          curSubj.kegiatan.penutup.aktivitasGuru = e.target.value;
          this.setDirty();
        });
      }

      const genModulBtn = document.getElementById('btn-gen-modul-activities-ai');
      if (genModulBtn) {
        genModulBtn.addEventListener('click', async () => {
          genModulBtn.disabled = true;
          this.showToast('Menyusun kegiatan pembelajaran rinci dengan AI...', 'info');
          const res = await this.ai.requestAI('generate_activities', {
            mataPelajaran: curSubj.mataPelajaran,
            materiPokok: curSubj.materiPokok,
            modelPembelajaran: curSubj.modelPembelajaran,
            alokasiWaktu: curSubj.alokasiWaktu,
            tujuanPembelajaran: curSubj.tujuanPembelajaranList
          });
          genModulBtn.disabled = false;
          if (res.data) {
            curSubj.kegiatan = {
              pendahuluan: { durasi: res.data.pendahuluan?.durasiMenit || 15, aktivitasGuru: res.data.pendahuluan?.aktivitasGuru || '' },
              inti: {
                durasi: res.data.inti?.durasiMenit || 65,
                langkahLangkah: (res.data.inti?.langkahLangkah || []).map(l => ({
                  fase: l.faseModel,
                  durasi: l.durasiMenit,
                  guru: l.aktivitasGuru,
                  siswa: l.aktivitasSiswa,
                  diferensiasi: l.diferensiasi,
                  asesmen: l.asesmenTerkait
                }))
              },
              penutup: { durasi: res.data.penutup?.durasiMenit || 10, aktivitasGuru: res.data.penutup?.aktivitasGuru || '' }
            };
            this.setDirty();
            this.renderActivitiesSection(curSubj);
            this.showToast('Langkah kegiatan Modul Ajar diperbarui.', 'success');
          }
        });
      }

      // Handler Tombol Generate Diagnostik AI
      const genDiagBtn = document.getElementById('btn-gen-diagnostic-ai');
      if (genDiagBtn) {
        genDiagBtn.addEventListener('click', async () => {
          genDiagBtn.disabled = true;
          this.showToast('Menghasilkan instrumen diagnostik awal via AI...', 'info');
          const res = await this.ai.requestAI('generate_diagnostic', {
            mataPelajaran: curSubj.mataPelajaran,
            materiPokok: curSubj.materiPokok
          });
          genDiagBtn.disabled = false;
          if (res.data) {
            if (res.data.kognitif) {
              curSubj.asesmenDiagnostik.kognitifPertanyaan = res.data.kognitif;
            }
            this.setDirty();
            this.renderActivitiesSection(curSubj);
            this.showToast('Instrumen asesmen diagnostik berhasil diperbarui.', 'success');
          }
        });
      }

      // Handler Tombol Generate Formatif AI
      const genFormBtn = document.getElementById('btn-gen-formative-ai');
      if (genFormBtn) {
        genFormBtn.addEventListener('click', async () => {
          genFormBtn.disabled = true;
          this.showToast('Menyusun asesmen formatif & rubrik via AI...', 'info');
          const res = await this.ai.requestAI('generate_formative', {
            mataPelajaran: curSubj.mataPelajaran,
            materiPokok: curSubj.materiPokok
          });
          genFormBtn.disabled = false;
          if (res.data && res.data.instrumen?.[0]?.rubrik) {
            curSubj.asesmenFormatif.rubrikSkala = res.data.instrumen[0].rubrik.map(r => ({
              aspek: r.aspek,
              skor1: r.baruBerkembang,
              skor2: r.layak,
              skor3: r.cakap,
              skor4: r.mahir
            }));
            this.setDirty();
            this.renderActivitiesSection(curSubj);
            this.showToast('Rubrik formatif berhasil dirumuskan oleh AI.', 'success');
          }
        });
      }
    }
  }

  updatePreviewDocument() {
    const previewContainer = document.getElementById('document-preview-content');
    if (!previewContainer) return;

    const isRPM = this.state.docType === 'rpm';
    const curSubj = this.state[this.state.activeSubjectTab] || this.state.mapel1;
    const dateStr = `${this.state.titimangsaKota || 'Kota'}, ${this.state.titimangsaTanggal || '2026'}`;

    if (isRPM) {
      const rpmData = curSubj.rpm || {};
      const dplLabels = {
        keimanan: 'Keimanan & Ketakwaan',
        kewargaan: 'Kewargaan',
        penalaran_kritis: 'Penalaran Kritis',
        kreativitas: 'Kreativitas',
        kolaborasi: 'Kolaborasi',
        kemandirian: 'Kemandirian',
        kesehatan: 'Kesehatan',
        komunikasi: 'Komunikasi'
      };
      const dplText = (rpmData.dimensiProfilLulusan || []).map(id => dplLabels[id] || id).join(', ') || 'Belum dipilih';
      const pb = rpmData.pengalamanBelajar || {};

      previewContainer.innerHTML = `
        <div class="doc-header mb-6">
          <h2 class="text-xl font-bold text-blue-900 tracking-tight">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>
          <h3 class="text-base font-semibold text-slate-700 uppercase">${sanitizeText(this.state.sekolah)}</h3>
          <p class="text-xs text-slate-500 mt-1">Prinsip: Berkesadaran, Bermakna, & Menggembirakan</p>
        </div>

        <!-- Tabel Identitas -->
        <table class="w-full text-xs border-collapse border border-slate-300 mb-6">
          <tbody>
            <tr><td class="w-1/3 p-2 bg-slate-50 font-bold border border-slate-300">Nama Penyusun / Guru</td><td class="p-2 border border-slate-300 font-medium">${sanitizeText(this.state.guruName)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Satuan Pendidikan</td><td class="p-2 border border-slate-300">${sanitizeText(this.state.sekolah)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Mata Pelajaran</td><td class="p-2 border border-slate-300 font-bold text-blue-800">${sanitizeText(curSubj.mataPelajaran)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Kelas / Fase / Semester</td><td class="p-2 border border-slate-300">Kelas ${sanitizeText(curSubj.kelas)} / Fase ${sanitizeText(curSubj.fase)} / Semester ${sanitizeText(curSubj.semester)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Tahun Ajaran & Alokasi</td><td class="p-2 border border-slate-300">${sanitizeText(curSubj.tahunAjaran)} | ${sanitizeText(curSubj.alokasiWaktu)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Materi Pokok</td><td class="p-2 border border-slate-300 font-bold">${sanitizeText(curSubj.materiPokok)}</td></tr>
          </tbody>
        </table>

        <!-- I. Identifikasi -->
        <div class="mb-5">
          <h4 class="text-sm font-bold text-blue-900 uppercase border-b pb-1 mb-2">I. IDENTIFIKASI PEMBELAJARAN MENDALAM</h4>
          <p class="text-xs mb-1.5"><strong>Dimensi Profil Lulusan (DPL) Utama (1–3 Dimensi):</strong> <span class="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">${sanitizeText(dplText)}</span></p>
          <p class="text-xs mb-1.5"><strong>Identifikasi Peserta Didik:</strong> ${sanitizeText(rpmData.identifikasiSiswa || '-')}</p>
          <p class="text-xs mb-1.5"><strong>Karakteristik Materi:</strong> ${sanitizeText(rpmData.karakteristikMateri || '-')}</p>
        </div>

        <!-- II. Desain Pembelajaran -->
        <div class="mb-5">
          <h4 class="text-sm font-bold text-blue-900 uppercase border-b pb-1 mb-2">II. DESAIN PEMBELAJARAN</h4>
          <p class="text-xs mb-1.5"><strong>Capaian Pembelajaran (CP):</strong> ${sanitizeText(curSubj.capaianPembelajaran || '-')}</p>
          <div class="text-xs mb-1.5">
            <strong>Tujuan Pembelajaran (TP):</strong>
            <ol class="list-decimal list-inside ml-2 mt-1 space-y-1">
              ${(curSubj.tujuanPembelajaranList || []).map(tp => `<li>${sanitizeText(tp.text)} <span class="text-blue-600 font-semibold">[${sanitizeText(tp.kko)}]</span></li>`).join('')}
            </ol>
          </div>
          <p class="text-xs mb-1.5"><strong>Lintas Disiplin / Kontekstual:</strong> ${sanitizeText(rpmData.lintasDisiplin || '-')}</p>
          <p class="text-xs mb-1.5"><strong>Praktik Pedagogis & Lingkungan:</strong> ${sanitizeText(rpmData.praktikPedagogis || '-')}</p>
        </div>

        <!-- III. Pengalaman Belajar -->
        <div class="mb-5">
          <h4 class="text-sm font-bold text-blue-900 uppercase border-b pb-1 mb-2">III. PENGALAMAN BELAJAR (MEMAHAMI – MENGAPLIKASI – MEREFLEKSI)</h4>
          <div class="space-y-2 text-xs">
            <div class="p-2.5 bg-slate-50 border rounded">
              <strong class="text-blue-700">1. Tahap Memahami (${pb.memahami?.durasi || 25} Menit):</strong>
              <p class="mt-1">${sanitizeText(pb.memahami?.guru || pb.memahami?.tujuan || '-')}</p>
            </div>
            <div class="p-2.5 bg-slate-50 border rounded">
              <strong class="text-emerald-700">2. Tahap Mengaplikasi (${pb.mengaplikasi?.durasi || 35} Menit):</strong>
              <p class="mt-1">${sanitizeText(pb.mengaplikasi?.guru || pb.mengaplikasi?.tujuan || '-')}</p>
            </div>
            <div class="p-2.5 bg-slate-50 border rounded">
              <strong class="text-purple-700">3. Tahap Merefleksi (${pb.merefleksi?.durasi || 15} Menit):</strong>
              <p class="mt-1">${sanitizeText(pb.merefleksi?.guru || pb.merefleksi?.tujuan || '-')}</p>
            </div>
          </div>
        </div>

        <!-- Tanda Tangan -->
        <div class="mt-8 pt-4 text-xs">
          <div class="text-right mb-4">${sanitizeText(dateStr)}</div>
          <div class="grid grid-cols-2 gap-8 text-center">
            <div>
              <p class="font-bold">Mengetahui,<br>Kepala Sekolah</p>
              <div class="h-16"></div>
              <p class="font-bold underline">${sanitizeText(this.state.kepalaSekolahName)}</p>
              <p class="text-slate-500">NIP. ${sanitizeText(this.state.kepalaSekolahNip || '-')}</p>
            </div>
            <div>
              <p class="font-bold">Guru Mata Pelajaran,</p>
              <div class="h-16"></div>
              <p class="font-bold underline">${sanitizeText(this.state.guruName)}</p>
              <p class="text-slate-500">NIP. ${sanitizeText(this.state.guruNip || '-')}</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Modul Ajar Kurikulum Merdeka
      const kg = curSubj.kegiatan || {};
      previewContainer.innerHTML = `
        <div class="doc-header mb-6">
          <h2 class="text-xl font-bold text-blue-900 tracking-tight">MODUL AJAR KURIKULUM MERDEKA</h2>
          <h3 class="text-base font-semibold text-slate-700 uppercase">${sanitizeText(this.state.sekolah)}</h3>
          <p class="text-xs text-slate-500 mt-1">Berpusat pada Peserta Didik & Pembelajaran Berdiferensiasi</p>
        </div>

        <!-- Tabel Identitas -->
        <table class="w-full text-xs border-collapse border border-slate-300 mb-6">
          <tbody>
            <tr><td class="w-1/3 p-2 bg-slate-50 font-bold border border-slate-300">Nama Guru Penyusun</td><td class="p-2 border border-slate-300 font-medium">${sanitizeText(this.state.guruName)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Satuan Pendidikan</td><td class="p-2 border border-slate-300">${sanitizeText(this.state.sekolah)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Mata Pelajaran</td><td class="p-2 border border-slate-300 font-bold text-blue-800">${sanitizeText(curSubj.mataPelajaran)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Kelas / Fase / Semester</td><td class="p-2 border border-slate-300">Kelas ${sanitizeText(curSubj.kelas)} / Fase ${sanitizeText(curSubj.fase)} / Semester ${sanitizeText(curSubj.semester)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Materi Pokok</td><td class="p-2 border border-slate-300 font-bold">${sanitizeText(curSubj.materiPokok)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Alokasi Waktu</td><td class="p-2 border border-slate-300">${sanitizeText(curSubj.alokasiWaktu)}</td></tr>
            <tr><td class="p-2 bg-slate-50 font-bold border border-slate-300">Model Pembelajaran</td><td class="p-2 border border-slate-300">${sanitizeText(curSubj.modelPembelajaran || 'Problem Based Learning')}</td></tr>
          </tbody>
        </table>

        <!-- I. Informasi Umum -->
        <div class="mb-5">
          <h4 class="text-sm font-bold text-blue-900 uppercase border-b pb-1 mb-2">I. INFORMASI UMUM</h4>
          <p class="text-xs mb-1"><strong>Kompetensi Awal:</strong> ${sanitizeText(curSubj.kompetensiAwal || '-')}</p>
          <p class="text-xs mb-1"><strong>Profil Pelajar Pancasila:</strong> ${(curSubj.profilPelajarPancasila || []).join(', ')}</p>
          <p class="text-xs mb-1"><strong>Sarana & Prasarana:</strong> ${sanitizeText(curSubj.saranaPrasarana || '-')}</p>
        </div>

        <!-- II. Komponen Inti -->
        <div class="mb-5">
          <h4 class="text-sm font-bold text-blue-900 uppercase border-b pb-1 mb-2">II. KOMPONEN INTI</h4>
          <p class="text-xs mb-1"><strong>Capaian Pembelajaran (CP):</strong> ${sanitizeText(curSubj.capaianPembelajaran || '-')}</p>
          <p class="text-xs mb-1"><strong>Pemahaman Bermakna:</strong> ${sanitizeText(curSubj.pemahamanBermakna || '-')}</p>
          <p class="text-xs mb-1"><strong>Pertanyaan Pemantik:</strong> ${sanitizeText(curSubj.pertanyaanPemantik || '-')}</p>
          <div class="text-xs mb-2">
            <strong>Tujuan Pembelajaran:</strong>
            <ol class="list-decimal list-inside ml-2 mt-1 space-y-1">
              ${(curSubj.tujuanPembelajaranList || []).map(tp => `<li>${sanitizeText(tp.text)}</li>`).join('')}
            </ol>
          </div>
          <div class="text-xs space-y-2 mt-2">
            <strong>Langkah-Langkah Pembelajaran:</strong>
            <p><strong>• Pendahuluan (${kg.pendahuluan?.durasi || 15} Menit):</strong> ${sanitizeText(kg.pendahuluan?.aktivitasGuru || '-')}</p>
            <div>
              <strong>• Kegiatan Inti (${kg.inti?.durasi || 65} Menit):</strong>
              <div class="ml-2 mt-1 space-y-1">
                ${(kg.inti?.langkahLangkah || []).map((s, idx) => `<p><em>${s.fase || `Fase ${idx+1}`} (${s.durasi || 15} mnt):</em> ${sanitizeText(s.guru || '')} (Diferensiasi: ${sanitizeText(s.diferensiasi || 'Terintegrasi')})</p>`).join('')}
              </div>
            </div>
            <p><strong>• Penutup (${kg.penutup?.durasi || 10} Menit):</strong> ${sanitizeText(kg.penutup?.aktivitasGuru || '-')}</p>
          </div>
        </div>

        <!-- Tanda Tangan -->
        <div class="mt-8 pt-4 text-xs">
          <div class="text-right mb-4">${sanitizeText(dateStr)}</div>
          <div class="grid grid-cols-2 gap-8 text-center">
            <div>
              <p class="font-bold">Mengetahui,<br>Kepala Sekolah</p>
              <div class="h-16"></div>
              <p class="font-bold underline">${sanitizeText(this.state.kepalaSekolahName)}</p>
              <p class="text-slate-500">NIP. ${sanitizeText(this.state.kepalaSekolahNip || '-')}</p>
            </div>
            <div>
              <p class="font-bold">Guru Mata Pelajaran,</p>
              <div class="h-16"></div>
              <p class="font-bold underline">${sanitizeText(this.state.guruName)}</p>
              <p class="text-slate-500">NIP. ${sanitizeText(this.state.guruNip || '-')}</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  renderCompletenessBadge() {
    const badge = document.getElementById('document-completeness-status');
    if (!badge) return;

    const curSubj = this.state[this.state.activeSubjectTab] || this.state.mapel1;
    const isRPM = this.state.docType === 'rpm';
    const comp = isRPM ? checkRPMCompleteness({ ...this.state, ...curSubj }) : checkModulAjarCompleteness({ ...this.state, ...curSubj });

    badge.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full" style="width: ${comp.scorePercent}%"></div>
        </div>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">${comp.scorePercent}% Lengkap</span>
      </div>
    `;
  }

  async handleAIReview() {
    this.showToast('Menjalankan peninjauan dokumen mandiri via AI...', 'info');
    const curSubj = this.state[this.state.activeSubjectTab] || this.state.mapel1;
    const res = await this.ai.requestAI('review_document', {
      docType: this.state.docType === 'rpm' ? 'Rencana Pembelajaran Mendalam' : 'Modul Ajar Kurikulum Merdeka',
      mataPelajaran: curSubj.mataPelajaran,
      materiPokok: curSubj.materiPokok,
      documentData: curSubj
    });

    if (res.data) {
      const modal = document.getElementById('modal-ai-review-result');
      const content = document.getElementById('ai-review-content');
      if (modal && content) {
        const d = res.data;
        content.innerHTML = `
          <div class="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 mb-4">
            <div class="text-xs font-bold uppercase text-blue-800 dark:text-blue-300">Skor Kelayakan Pedagogis</div>
            <div class="text-2xl font-black text-blue-900 dark:text-blue-100">${d.skorKelayakan || 90} / 100</div>
            <div class="text-xs text-blue-700 dark:text-blue-300 font-semibold mt-1">${sanitizeText(d.statusKelayakan || 'Baik')}</div>
          </div>

          <div class="mb-3">
            <h5 class="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 mb-1">Kelebihan Dokumen:</h5>
            <ul class="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
              ${(d.kelebihan || []).map(k => `<li>${sanitizeText(k)}</li>`).join('')}
            </ul>
          </div>

          <div class="mb-3">
            <h5 class="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 mb-1">Rekomendasi Peningkatan:</h5>
            <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              ${(d.saranPerbaikan || []).map(s => `
                <div class="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded">
                  <strong>${sanitizeText(s.bagian)}:</strong> ${sanitizeText(s.rekomendasi)}
                </div>
              `).join('')}
            </div>
          </div>

          <p class="text-xs text-slate-400 italic mt-4">${sanitizeText(d.catatanVerifikasi || '')}</p>
        `;
        modal.classList.remove('hidden');
      }
    }
  }
}
