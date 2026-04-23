/**
 * PixelForge — Keyboard Shortcuts
 * Global keyboard shortcut handling for power users.
 */

export class KeyboardShortcuts {
  constructor() {
    this.shortcuts = [];
    this.enabled = true;
    this._handler = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._handler);
  }

  register(key, modifiers, description, callback) {
    this.shortcuts.push({
      key: key.toLowerCase(),
      ctrl: modifiers.includes('ctrl'),
      shift: modifiers.includes('shift'),
      alt: modifiers.includes('alt'),
      description,
      callback
    });
  }

  _onKeyDown(e) {
    if (!this.enabled) return;

    // Ignore if user is typing in an input
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    for (const shortcut of this.shortcuts) {
      if (
        shortcut.key === key &&
        shortcut.ctrl === ctrl &&
        shortcut.shift === shift &&
        shortcut.alt === alt
      ) {
        e.preventDefault();
        shortcut.callback();
        return;
      }
    }
  }

  getShortcutsList() {
    return this.shortcuts.map(s => ({
      keys: this._formatKeys(s),
      description: s.description
    }));
  }

  _formatKeys(shortcut) {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase());
    return parts.join(' + ');
  }

  destroy() {
    document.removeEventListener('keydown', this._handler);
  }
}
