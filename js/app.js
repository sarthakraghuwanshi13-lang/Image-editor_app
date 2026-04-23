/**
 * PixelForge — Main Application Controller
 * Initializes all modules and orchestrates the application.
 */

import { CanvasEngine } from './canvas-engine.js';
import { StateManager } from './state-manager.js';
import { UIController } from './ui-controller.js';
import { KeyboardShortcuts } from './keyboard-shortcuts.js';
import { BatchProcessor } from './batch-processor.js';
import { applyFilterStack, applyFilter, generatePreviewThumbnail, PRESET_FILTERS, AI_FILTERS } from './filter-engine.js';

class PixelForgeApp {
  constructor() {
    this.canvas = new CanvasEngine(
      document.getElementById('main-canvas'),
      document.getElementById('overlay-canvas')
    );
    this.state = new StateManager();
    this.ui = new UIController();
    this.keys = new KeyboardShortcuts();
    this.batch = new BatchProcessor();

    this.currentFileName = '';
    this.batchMode = false;
    this.previewThumbnails = {};
    this._sliderDebounceTimer = null;

    this._init();
  }

  _init() {
    // Theme
    this.ui.initTheme();

    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.ui.toggleTheme());

    // Drag & drop on landing
    this.ui.initDragDrop('drop-zone', (files) => this._handleFiles(files));
    this.ui.initDragDrop('editor-drop-zone', (files) => this._handleFiles(files));

    // File input
    document.getElementById('file-input')?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this._handleFiles(e.target.files);
    });

    document.getElementById('file-input-editor')?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this._handleFiles(e.target.files);
    });

    // Upload trigger button
    document.getElementById('upload-trigger')?.addEventListener('click', () => {
      document.getElementById('file-input')?.click();
    });

    document.getElementById('new-image-btn')?.addEventListener('click', () => {
      document.getElementById('file-input-editor')?.click();
    });

    // Tabs
    this.ui.initTabs();

    // Adjustment sliders
    this.ui.renderAdjustmentSliders((filterName, value) => {
      this._onAdjustmentChange();
    });

    // Download panel
    this.ui.initDownloadPanel((format, quality) => {
      if (this.canvas.hasImage()) {
        this.canvas.downloadImage(this.currentFileName || 'image', format, quality);
        this.ui.showToast('Image downloaded!', 'success');
      }
    });

    // Undo / Redo buttons
    document.getElementById('undo-btn')?.addEventListener('click', () => this._undo());
    document.getElementById('redo-btn')?.addEventListener('click', () => this._redo());

    // Revert button
    document.getElementById('revert-btn')?.addEventListener('click', () => this._revert());

    // Comparison toggle
    document.getElementById('compare-btn')?.addEventListener('click', () => {
      if (!this.canvas.hasImage()) return;
      const active = this.canvas.toggleComparison();
      document.getElementById('compare-btn')?.classList.toggle('active', active);
    });

    // Batch mode
    document.getElementById('batch-toggle-btn')?.addEventListener('click', () => {
      this.batchMode = !this.batchMode;
      document.getElementById('batch-toggle-btn')?.classList.toggle('active', this.batchMode);
      this.ui.showBatchPanel(this.batchMode);
    });

    document.getElementById('batch-file-input')?.addEventListener('change', (e) => {
      const count = this.batch.addFiles(e.target.files);
      this.ui.showToast(`Added ${count} images to batch`, 'info');
    });

    document.getElementById('batch-add-btn')?.addEventListener('click', () => {
      document.getElementById('batch-file-input')?.click();
    });

    document.getElementById('batch-process-btn')?.addEventListener('click', () => this._runBatch());
    document.getElementById('batch-download-btn')?.addEventListener('click', () => {
      const format = document.getElementById('download-format')?.value || 'png';
      const quality = parseFloat(document.getElementById('download-quality')?.value || 0.92);
      this.batch.downloadAll(format, quality);
    });

    document.getElementById('batch-clear-btn')?.addEventListener('click', () => {
      this.batch.clearAll();
      this.ui.showToast('Batch cleared', 'info');
    });

    // State event listeners
    this.state.on('historyChanged', (info) => this.ui.updateHistoryUI(info));
    this.state.on('filterStackChanged', (stack) => {
      this.ui.renderFilterStack(stack, (index) => this._removeFilterFromStack(index));
    });

    // Batch events
    this.batch.on('imagesChanged', (images) => this.ui.renderBatchImages(images));

    // Keyboard shortcuts
    this._registerShortcuts();

    // Shortcuts help
    document.getElementById('shortcuts-btn')?.addEventListener('click', () => {
      this._renderShortcutsModal();
      this.ui.showShortcutsModal();
    });
    document.getElementById('shortcuts-close')?.addEventListener('click', () => this.ui.hideShortcutsModal());
    document.getElementById('shortcuts-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'shortcuts-modal') this.ui.hideShortcutsModal();
    });

    // Back to landing
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.canvas.clear();
      this.state.reset();
      this.ui.resetAdjustmentSliders();
      this.ui.showLanding();
    });

    // Initialize filter stack display
    this.ui.renderFilterStack([], () => {});
    this.ui.updateHistoryUI({ canUndo: false, canRedo: false, count: 0, index: 0 });
  }

  // ─── File Handling ────────────────────────────────────────────

  async _handleFiles(files) {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      this.ui.showToast('Please select a valid image file', 'error');
      return;
    }

    this.currentFileName = file.name;

    try {
      const imageData = await this.canvas.loadImageFromFile(file);
      this.state.setOriginalImage(imageData);
      this.ui.resetAdjustmentSliders();
      this.ui.showEditor();

      // Generate preview thumbnails
      this._generatePreviews();

      this.ui.showToast(`Loaded: ${file.name}`, 'success');
    } catch (err) {
      this.ui.showToast('Failed to load image', 'error');
      console.error(err);
    }
  }

  // ─── Preview Thumbnails ──────────────────────────────────────

  _generatePreviews() {
    const thumbData = this.canvas.getThumbnailImageData(80);
    if (!thumbData) return;

    this.previewThumbnails = {};

    const allPresets = [...PRESET_FILTERS, ...AI_FILTERS];
    for (const preset of allPresets) {
      const preview = generatePreviewThumbnail(thumbData.imageData, preset.name, thumbData.width, thumbData.height);
      // Convert to data URL
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = thumbData.width;
      tempCanvas.height = thumbData.height;
      tempCanvas.getContext('2d').putImageData(preview, 0, 0);
      this.previewThumbnails[preset.name] = tempCanvas.toDataURL('image/jpeg', 0.6);
    }

    // Render grids with thumbnails
    const thumbGen = (name) => this.previewThumbnails[name] || '';
    const favorites = this.state.getFavorites();

    this.ui.renderPresetGrid(
      thumbGen,
      favorites,
      (name) => this._applyPreset(name),
      (name) => this.state.toggleFavorite(name)
    );

    this.ui.renderAIFilters(
      thumbGen,
      (name, value) => this._applyAIFilter(name, value)
    );

    this.ui.renderFavoritesPanel(
      favorites,
      thumbGen,
      (name) => this._applyPreset(name),
      (name) => {
        const result = this.state.toggleFavorite(name);
        // Re-render favorites
        this.ui.renderFavoritesPanel(
          this.state.getFavorites(),
          thumbGen,
          (n) => this._applyPreset(n),
          (n) => this.state.toggleFavorite(n)
        );
        return result;
      }
    );
  }

  // ─── Filter Application ──────────────────────────────────────

  _onAdjustmentChange() {
    if (!this.canvas.hasImage()) return;

    clearTimeout(this._sliderDebounceTimer);
    this._sliderDebounceTimer = setTimeout(() => {
      this._reapplyAllFilters();
    }, 30);
  }

  _reapplyAllFilters() {
    const original = this.state.getOriginalImageData();
    if (!original) return;

    const { width, height } = this.canvas.getDimensions();

    // Build the full filter list: adjustment sliders + stacked presets
    const adjustmentStack = this._getAdjustmentFilters();
    const fullStack = [...adjustmentStack, ...this.state.getFilterStack()];

    const result = applyFilterStack(original, fullStack, width, height);
    this.canvas.renderImageData(result);
  }

  _getAdjustmentFilters() {
    const adjustments = [];
    const { ADJUSTMENT_FILTERS: ADJUSTMENTS } = require_adjustments();

    for (const filter of ADJUSTMENTS) {
      const slider = document.getElementById(`slider-${filter.name}`);
      if (slider) {
        const val = parseFloat(slider.value);
        if (val !== filter.default) {
          adjustments.push({ name: filter.name, params: { value: val } });
        }
      }
    }
    return adjustments;
  }

  _applyPreset(filterName) {
    if (!this.canvas.hasImage()) return;

    this.state.addFilter(filterName, {});
    this._reapplyAllFilters();

    // Save history
    const currentData = this.canvas.getCurrentImageData();
    if (currentData) this.state.pushHistory(currentData);

    this.ui.showToast(`Applied: ${filterName}`, 'success');
  }

  _applyAIFilter(filterName, value) {
    if (!this.canvas.hasImage()) return;

    this.state.addFilter(filterName, { value });
    this._reapplyAllFilters();

    const currentData = this.canvas.getCurrentImageData();
    if (currentData) this.state.pushHistory(currentData);

    this.ui.showToast(`Applied: ${filterName}`, 'success');
  }

  _removeFilterFromStack(index) {
    this.state.removeFilterAtIndex(index);
    this._reapplyAllFilters();

    const currentData = this.canvas.getCurrentImageData();
    if (currentData) this.state.pushHistory(currentData);
  }

  // ─── Undo / Redo / Revert ────────────────────────────────────

  _undo() {
    const prevState = this.state.undo();
    if (prevState) {
      this.canvas.renderImageData(prevState);
      this.ui.showToast('Undo', 'info');
    }
  }

  _redo() {
    const nextState = this.state.redo();
    if (nextState) {
      this.canvas.renderImageData(nextState);
      this.ui.showToast('Redo', 'info');
    }
  }

  _revert() {
    if (!this.canvas.hasImage()) return;
    this.state.clearFilters();
    this.ui.resetAdjustmentSliders();

    const original = this.state.getOriginalImageData();
    if (original) {
      this.canvas.renderImageData(original);
      this.state.pushHistory(original);
    }

    if (this.canvas.comparisonMode) {
      this.canvas.setComparisonMode(false);
      document.getElementById('compare-btn')?.classList.remove('active');
    }

    this.ui.showToast('All filters removed', 'info');
  }

  // ─── Batch Processing ────────────────────────────────────────

  async _runBatch() {
    if (this.batch.getImageCount() === 0) {
      this.ui.showToast('Add images to batch first', 'warning');
      return;
    }

    const adjustmentStack = this._getAdjustmentFilters();
    const fullStack = [...adjustmentStack, ...this.state.getFilterStack()];

    if (fullStack.length === 0) {
      this.ui.showToast('Apply some filters first, then batch process', 'warning');
      return;
    }

    this.ui.showToast('Batch processing started...', 'info');

    await this.batch.processAll(fullStack, (completed, total) => {
      this.ui.updateBatchProgress(completed, total);
    });

    this.ui.showToast('Batch processing complete!', 'success');
  }

  // ─── Keyboard Shortcuts ──────────────────────────────────────

  _registerShortcuts() {
    this.keys.register('z', ['ctrl'], 'Undo last action', () => this._undo());
    this.keys.register('y', ['ctrl'], 'Redo last action', () => this._redo());
    this.keys.register('z', ['ctrl', 'shift'], 'Redo last action', () => this._redo());
    this.keys.register('s', ['ctrl'], 'Download image', () => {
      if (this.canvas.hasImage()) {
        const format = document.getElementById('download-format')?.value || 'png';
        const quality = parseFloat(document.getElementById('download-quality')?.value || 0.92);
        this.canvas.downloadImage(this.currentFileName || 'image', format, quality);
        this.ui.showToast('Image downloaded!', 'success');
      }
    });
    this.keys.register('o', ['ctrl'], 'Open image file', () => {
      document.getElementById('file-input')?.click();
    });
    this.keys.register(' ', [], 'Toggle before/after comparison', () => {
      if (this.canvas.hasImage()) {
        const active = this.canvas.toggleComparison();
        document.getElementById('compare-btn')?.classList.toggle('active', active);
      }
    });
    this.keys.register('escape', [], 'Revert all filters', () => this._revert());
    this.keys.register('?', ['shift'], 'Show keyboard shortcuts', () => {
      this._renderShortcutsModal();
      this.ui.showShortcutsModal();
    });
  }

  _renderShortcutsModal() {
    const list = document.getElementById('shortcuts-list');
    if (!list) return;

    list.innerHTML = '';
    for (const s of this.keys.getShortcutsList()) {
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      row.innerHTML = `<kbd>${s.keys}</kbd><span>${s.description}</span>`;
      list.appendChild(row);
    }
  }
}

// Helper to avoid circular imports — inline the adjustment constants
function require_adjustments() {
  return {
    ADJUSTMENT_FILTERS: [
      { name: 'brightness',  default: 0 },
      { name: 'contrast',    default: 0 },
      { name: 'saturation',  default: 0 },
      { name: 'vibrance',    default: 0 },
      { name: 'hueRotate',   default: 0 },
      { name: 'temperature', default: 0 },
      { name: 'tint',        default: 0 },
      { name: 'sharpen',     default: 0 },
      { name: 'blur',        default: 0 },
    ]
  };
}

// ─── Bootstrap ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  window.pixelForge = new PixelForgeApp();
});
