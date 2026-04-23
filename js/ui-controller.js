/**
 * PixelForge — UI Controller
 * Manages theme toggle, drag-and-drop, panels, toasts, and filter preview rendering.
 */

import { StateManager } from './state-manager.js';
import { PRESET_FILTERS, AI_FILTERS, ADJUSTMENT_FILTERS } from './filter-engine.js';

export class UIController {
  constructor() {
    this.currentTheme = StateManager.loadTheme();
    this.activeTab = 'adjustments';
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // ─── Theme ────────────────────────────────────────────────────

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this._updateThemeIcon();
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    StateManager.saveTheme(this.currentTheme);
    this._updateThemeIcon();
  }

  _updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = this.currentTheme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  // ─── Drag & Drop ──────────────────────────────────────────────

  initDragDrop(dropZoneId, onFilesDropped) {
    const dropZone = document.getElementById(dropZoneId);
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, () => dropZone.classList.add('drag-active'));
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-active'));
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) onFilesDropped(files);
    });
  }

  // ─── View Transitions ────────────────────────────────────────

  showEditor() {
    const landing = document.getElementById('landing-view');
    const editor = document.getElementById('editor-view');
    if (landing) landing.classList.add('hidden');
    if (editor) editor.classList.remove('hidden');
    // Animate in
    setTimeout(() => editor?.classList.add('visible'), 10);
  }

  showLanding() {
    const landing = document.getElementById('landing-view');
    const editor = document.getElementById('editor-view');
    if (editor) {
      editor.classList.remove('visible');
      editor.classList.add('hidden');
    }
    if (landing) landing.classList.remove('hidden');
  }

  // ─── Sidebar Tabs ────────────────────────────────────────────

  initTabs() {
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        this.switchTab(target);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    // Update tab buttons
    document.querySelectorAll('.sidebar-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    // Update panels
    document.querySelectorAll('.sidebar-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === tabName);
    });
  }

  // ─── Adjustment Sliders ──────────────────────────────────────

  renderAdjustmentSliders(onSliderChange) {
    const container = document.getElementById('adjustments-panel');
    if (!container) return;

    container.innerHTML = '';

    for (const filter of ADJUSTMENT_FILTERS) {
      const sliderGroup = document.createElement('div');
      sliderGroup.className = 'slider-group';
      sliderGroup.innerHTML = `
        <div class="slider-header">
          <span class="slider-icon">${filter.icon}</span>
          <span class="slider-label">${filter.label}</span>
          <span class="slider-value" id="val-${filter.name}">${filter.default}</span>
        </div>
        <input type="range" class="pf-slider" id="slider-${filter.name}"
          min="${filter.min}" max="${filter.max}" value="${filter.default}" step="${filter.step}"
          data-filter="${filter.name}">
      `;
      container.appendChild(sliderGroup);

      const slider = sliderGroup.querySelector('.pf-slider');
      const valueDisplay = sliderGroup.querySelector('.slider-value');

      slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
        onSliderChange(filter.name, parseFloat(e.target.value));
      });
    }
  }

  resetAdjustmentSliders() {
    for (const filter of ADJUSTMENT_FILTERS) {
      const slider = document.getElementById(`slider-${filter.name}`);
      const val = document.getElementById(`val-${filter.name}`);
      if (slider) slider.value = filter.default;
      if (val) val.textContent = filter.default;
    }
  }

  // ─── Preset Filter Grid ─────────────────────────────────────

  renderPresetGrid(thumbnailGenerator, favorites, onPresetClick, onFavoriteToggle) {
    const container = document.getElementById('presets-panel');
    if (!container) return;

    container.innerHTML = '';

    for (const preset of PRESET_FILTERS) {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.dataset.filter = preset.name;

      const thumb = thumbnailGenerator ? thumbnailGenerator(preset.name) : '';
      const isFav = favorites.includes(preset.name);

      card.innerHTML = `
        <div class="preset-thumb" ${thumb ? `style="background-image:url(${thumb})"` : ''}>
          <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${preset.name}" title="Toggle favorite">
            ${isFav ? '★' : '☆'}
          </button>
        </div>
        <span class="preset-name">${preset.icon} ${preset.label}</span>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.fav-btn')) return;
        onPresetClick(preset.name);
      });

      const favBtn = card.querySelector('.fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isNowFav = onFavoriteToggle(preset.name);
        favBtn.classList.toggle('active', isNowFav);
        favBtn.textContent = isNowFav ? '★' : '☆';
      });

      container.appendChild(card);
    }
  }

  // ─── AI Filter Grid ──────────────────────────────────────────

  renderAIFilters(thumbnailGenerator, onFilterClick) {
    const container = document.getElementById('ai-panel');
    if (!container) return;

    container.innerHTML = '<div class="ai-section-title">🧠 AI-Powered Filters</div>';

    for (const filter of AI_FILTERS) {
      const card = document.createElement('div');
      card.className = 'preset-card ai-card';
      card.dataset.filter = filter.name;

      const thumb = thumbnailGenerator ? thumbnailGenerator(filter.name) : '';

      let paramHTML = '';
      if (filter.hasParam) {
        paramHTML = `
          <div class="ai-param">
            <input type="range" class="pf-slider pf-slider-small" id="ai-slider-${filter.name}"
              min="${filter.min}" max="${filter.max}" value="${filter.default}" step="${filter.step}">
            <span class="slider-value" id="ai-val-${filter.name}">${filter.default}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="preset-thumb" ${thumb ? `style="background-image:url(${thumb})"` : ''}></div>
        <span class="preset-name">${filter.icon} ${filter.label}</span>
        ${paramHTML}
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.ai-param')) return;
        const paramSlider = card.querySelector('.pf-slider-small');
        const value = paramSlider ? parseFloat(paramSlider.value) : filter.default;
        onFilterClick(filter.name, value);
      });

      if (filter.hasParam) {
        // Attach slider events after adding to DOM
        setTimeout(() => {
          const slider = document.getElementById(`ai-slider-${filter.name}`);
          const valSpan = document.getElementById(`ai-val-${filter.name}`);
          if (slider && valSpan) {
            slider.addEventListener('input', (e) => {
              valSpan.textContent = e.target.value;
            });
            slider.addEventListener('click', (e) => e.stopPropagation());
          }
        }, 0);
      }

      container.appendChild(card);
    }
  }

  // ─── Favorites Panel ─────────────────────────────────────────

  renderFavoritesPanel(favorites, thumbnailGenerator, onPresetClick, onFavoriteToggle) {
    const container = document.getElementById('favorites-panel');
    if (!container) return;

    const allFilters = [...PRESET_FILTERS, ...AI_FILTERS];
    const favFilters = allFilters.filter(f => favorites.includes(f.name));

    if (favFilters.length === 0) {
      container.innerHTML = '<div class="empty-favorites"><span>☆</span><p>No favorites yet.<br>Click the star on any preset to add it here.</p></div>';
      return;
    }

    container.innerHTML = '';
    for (const preset of favFilters) {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.dataset.filter = preset.name;

      const thumb = thumbnailGenerator ? thumbnailGenerator(preset.name) : '';

      card.innerHTML = `
        <div class="preset-thumb" ${thumb ? `style="background-image:url(${thumb})"` : ''}>
          <button class="fav-btn active" data-fav="${preset.name}">★</button>
        </div>
        <span class="preset-name">${preset.icon} ${preset.label}</span>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.fav-btn')) return;
        onPresetClick(preset.name);
      });

      const favBtn = card.querySelector('.fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onFavoriteToggle(preset.name);
        // Re-render favorites panel
        this.renderFavoritesPanel(favorites.filter(f => f !== preset.name), thumbnailGenerator, onPresetClick, onFavoriteToggle);
      });

      container.appendChild(card);
    }
  }

  // ─── Filter Stack Panel ──────────────────────────────────────

  renderFilterStack(filterStack, onRemove) {
    const container = document.getElementById('filter-stack-list');
    if (!container) return;

    if (filterStack.length === 0) {
      container.innerHTML = '<div class="empty-stack">No filters applied yet</div>';
      return;
    }

    container.innerHTML = '';
    const allFilters = [...ADJUSTMENT_FILTERS, ...PRESET_FILTERS, ...AI_FILTERS];

    filterStack.forEach((filter, index) => {
      const meta = allFilters.find(f => f.name === filter.name);
      const item = document.createElement('div');
      item.className = 'stack-item';
      item.innerHTML = `
        <span class="stack-num">${index + 1}</span>
        <span class="stack-name">${meta ? meta.icon : '🔧'} ${meta ? meta.label : filter.name}</span>
        ${filter.params.value !== undefined ? `<span class="stack-value">${filter.params.value}</span>` : ''}
        <button class="stack-remove" data-index="${index}" title="Remove filter">✕</button>
      `;

      const removeBtn = item.querySelector('.stack-remove');
      removeBtn.addEventListener('click', () => onRemove(index));

      container.appendChild(item);
    });
  }

  // ─── History Info ─────────────────────────────────────────────

  updateHistoryUI(historyInfo) {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const counter = document.getElementById('history-counter');

    if (undoBtn) undoBtn.disabled = !historyInfo.canUndo;
    if (redoBtn) redoBtn.disabled = !historyInfo.canRedo;
    if (counter) counter.textContent = `Step ${(historyInfo.index ?? 0) + 1} / ${historyInfo.count}`;
  }

  // ─── Download Panel ──────────────────────────────────────────

  initDownloadPanel(onDownload) {
    const btn = document.getElementById('download-action-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const format = document.getElementById('download-format')?.value || 'png';
        const quality = parseFloat(document.getElementById('download-quality')?.value || 0.92);
        onDownload(format, quality);
      });
    }

    const qualitySlider = document.getElementById('download-quality');
    const qualityLabel = document.getElementById('download-quality-label');
    if (qualitySlider && qualityLabel) {
      qualitySlider.addEventListener('input', () => {
        qualityLabel.textContent = `${Math.round(qualitySlider.value * 100)}%`;
      });
    }

    const formatSelect = document.getElementById('download-format');
    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        const qualityRow = document.getElementById('quality-row');
        if (qualityRow) {
          qualityRow.style.display = formatSelect.value === 'png' ? 'none' : 'flex';
        }
      });
    }
  }

  // ─── Batch Mode UI ───────────────────────────────────────────

  showBatchPanel(show) {
    const panel = document.getElementById('batch-panel');
    if (panel) panel.classList.toggle('active', show);
  }

  renderBatchImages(images) {
    const container = document.getElementById('batch-images-list');
    if (!container) return;

    if (images.length === 0) {
      container.innerHTML = '<div class="empty-stack">Drop or select images for batch processing</div>';
      return;
    }

    container.innerHTML = '';
    images.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = `batch-item status-${img.status}`;
      const statusIcon = img.status === 'done' ? '✓' : img.status === 'error' ? '✗' : img.status === 'processing' ? '⟳' : '○';
      item.innerHTML = `
        <span class="batch-status">${statusIcon}</span>
        <span class="batch-name">${img.name}</span>
        <button class="stack-remove" data-batch-index="${index}">✕</button>
      `;
      container.appendChild(item);
    });
  }

  updateBatchProgress(completed, total) {
    const bar = document.getElementById('batch-progress-bar');
    const text = document.getElementById('batch-progress-text');
    if (bar) bar.style.width = `${(completed / total) * 100}%`;
    if (text) text.textContent = `${completed} / ${total}`;
  }

  // ─── Toast Notifications ─────────────────────────────────────

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ─── Shortcuts Modal ─────────────────────────────────────────

  showShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.add('active');
  }

  hideShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.remove('active');
  }
}
