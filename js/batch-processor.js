/**
 * PixelForge — Batch Processor
 * Multi-image batch processing with progress tracking.
 */

import { applyFilterStack } from './filter-engine.js';

export class BatchProcessor {
  constructor() {
    this.images = [];       // { file, name, originalData, processedDataUrl, status }
    this.isProcessing = false;
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

  addFiles(fileList) {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    for (const file of imageFiles) {
      this.images.push({
        file,
        name: file.name,
        originalData: null,
        processedDataUrl: null,
        status: 'pending'
      });
    }
    this.emit('imagesChanged', this.images);
    return imageFiles.length;
  }

  removeImage(index) {
    if (index >= 0 && index < this.images.length) {
      this.images.splice(index, 1);
      this.emit('imagesChanged', this.images);
    }
  }

  clearAll() {
    this.images = [];
    this.emit('imagesChanged', this.images);
  }

  async processAll(filterStack, onProgress) {
    if (this.isProcessing || this.images.length === 0) return;
    this.isProcessing = true;
    this.emit('processingStarted');

    const total = this.images.length;
    let completed = 0;

    for (let i = 0; i < this.images.length; i++) {
      const entry = this.images[i];
      entry.status = 'processing';
      this.emit('imagesChanged', this.images);

      try {
        const imageData = await this._loadImageAsData(entry.file);
        entry.originalData = imageData;

        const processed = applyFilterStack(imageData, filterStack, imageData.width, imageData.height);

        // Convert to data URL for download
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = processed.width;
        tempCanvas.height = processed.height;
        tempCanvas.getContext('2d').putImageData(processed, 0, 0);
        entry.processedDataUrl = tempCanvas.toDataURL('image/png');

        entry.status = 'done';
        completed++;
      } catch (err) {
        entry.status = 'error';
        console.error(`Failed to process ${entry.name}:`, err);
        completed++;
      }

      if (onProgress) onProgress(completed, total);
      this.emit('imagesChanged', this.images);
    }

    this.isProcessing = false;
    this.emit('processingComplete', { completed, total });
  }

  downloadAll(format = 'png', quality = 0.92) {
    const mimeTypes = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
    const mime = mimeTypes[format] || 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : format;

    for (const entry of this.images) {
      if (entry.status !== 'done' || !entry.processedDataUrl) continue;

      // Re-encode in desired format if not PNG
      if (format !== 'png' && entry.originalData) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = entry.originalData.width;
        tempCanvas.height = entry.originalData.height;
        const ctx = tempCanvas.getContext('2d');

        const img = new Image();
        img.src = entry.processedDataUrl;
        // Use synchronous approach since data URL is already loaded
        ctx.drawImage(img, 0, 0);
        const dataUrl = tempCanvas.toDataURL(mime, quality);

        const link = document.createElement('a');
        link.download = entry.name.replace(/\.[^.]+$/, '') + `-pixelforge.${ext}`;
        link.href = dataUrl;
        link.click();
      } else {
        const link = document.createElement('a');
        link.download = entry.name.replace(/\.[^.]+$/, '') + `-pixelforge.${ext}`;
        link.href = entry.processedDataUrl;
        link.click();
      }
    }
  }

  downloadSingle(index, format = 'png', quality = 0.92) {
    const entry = this.images[index];
    if (!entry || entry.status !== 'done' || !entry.processedDataUrl) return;

    const ext = format === 'jpeg' ? 'jpg' : format;
    const link = document.createElement('a');
    link.download = entry.name.replace(/\.[^.]+$/, '') + `-pixelforge.${ext}`;
    link.href = entry.processedDataUrl;
    link.click();
  }

  getImageCount() {
    return this.images.length;
  }

  _loadImageAsData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const maxDim = 1600;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(ctx.getImageData(0, 0, w, h));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
