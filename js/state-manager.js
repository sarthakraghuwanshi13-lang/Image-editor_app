/**
 * PixelForge — State Manager
 * Manages undo/redo history, filter stack, and favorites.
 */

const MAX_HISTORY = 50;
const FAVORITES_STORAGE_KEY = 'pixelforge_favorites';
const THEME_STORAGE_KEY = 'pixelforge_theme';

export class StateManager {
  constructor() {
    this.originalImageData = null;
    this.historyStack = [];
    this.historyIndex = -1;
    this.filterStack = [];
    this.favorites = this._loadFavorites();
    this.listeners = {};
  }

  // ─── Event System ──────────────────────────────────────────────

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // ─── Image State ──────────────────────────────────────────────

  setOriginalImage(imageData) {
    this.originalImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    this.historyStack = [];
    this.historyIndex = -1;
    this.filterStack = [];
    this.pushHistory(imageData);
    this.emit('imageLoaded', imageData);
    this.emit('filterStackChanged', this.filterStack);
    this.emit('historyChanged', { canUndo: false, canRedo: false, count: 1 });
  }

  getOriginalImageData() {
    return this.originalImageData ? new ImageData(
      new Uint8ClampedArray(this.originalImageData.data),
      this.originalImageData.width,
      this.originalImageData.height
    ) : null;
  }

  // ─── History (Undo/Redo) ──────────────────────────────────────

  pushHistory(imageData) {
    // Discard any redo states after current index
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

    // Store a copy
    this.historyStack.push(new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    ));

    // Trim oldest if we exceed max
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift();
    }

    this.historyIndex = this.historyStack.length - 1;
    this._emitHistoryChange();
  }

  undo() {
    if (!this.canUndo()) return null;
    this.historyIndex--;

    // Also pop the last filter from the stack
    if (this.filterStack.length > 0) {
      this.filterStack.pop();
      this.emit('filterStackChanged', this.filterStack);
    }

    this._emitHistoryChange();
    return this._getCurrentHistoryState();
  }

  redo() {
    if (!this.canRedo()) return null;
    this.historyIndex++;
    this._emitHistoryChange();
    return this._getCurrentHistoryState();
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.historyStack.length - 1;
  }

  _getCurrentHistoryState() {
    const state = this.historyStack[this.historyIndex];
    if (!state) return null;
    return new ImageData(
      new Uint8ClampedArray(state.data),
      state.width,
      state.height
    );
  }

  _emitHistoryChange() {
    this.emit('historyChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      count: this.historyStack.length,
      index: this.historyIndex
    });
  }

  // ─── Filter Stack ─────────────────────────────────────────────

  addFilter(filterName, params = {}) {
    this.filterStack.push({ name: filterName, params: { ...params }, id: Date.now() });
    this.emit('filterStackChanged', this.filterStack);
  }

  removeFilterAtIndex(index) {
    if (index >= 0 && index < this.filterStack.length) {
      this.filterStack.splice(index, 1);
      this.emit('filterStackChanged', this.filterStack);
    }
  }

  clearFilters() {
    this.filterStack = [];
    this.emit('filterStackChanged', this.filterStack);
  }

  getFilterStack() {
    return [...this.filterStack];
  }

  // ─── Favorites ─────────────────────────────────────────────────

  toggleFavorite(filterName) {
    const idx = this.favorites.indexOf(filterName);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(filterName);
    }
    this._saveFavorites();
    this.emit('favoritesChanged', this.favorites);
    return this.favorites.includes(filterName);
  }

  isFavorite(filterName) {
    return this.favorites.includes(filterName);
  }

  getFavorites() {
    return [...this.favorites];
  }

  _loadFavorites() {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  _saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(this.favorites));
    } catch { /* ignore */ }
  }

  // ─── Theme ─────────────────────────────────────────────────────

  static loadTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  }

  static saveTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch { /* ignore */ }
  }

  // ─── Reset ─────────────────────────────────────────────────────

  reset() {
    this.historyStack = [];
    this.historyIndex = -1;
    this.filterStack = [];
    this.originalImageData = null;
    this.emit('filterStackChanged', this.filterStack);
    this.emit('historyChanged', { canUndo: false, canRedo: false, count: 0 });
  }
}
