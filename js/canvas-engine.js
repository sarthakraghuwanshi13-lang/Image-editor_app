/**
 * PixelForge — Canvas Engine
 * Handles canvas rendering, before/after comparison slider, and image export.
 */

export class CanvasEngine {
  constructor(canvasElement, overlayCanvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.overlayCanvas = overlayCanvasElement;
    this.overlayCtx = overlayCanvasElement.getContext('2d');

    this.originalImage = null;       // HTMLImageElement
    this.originalImageData = null;   // ImageData (pristine)
    this.currentImageData = null;    // ImageData (with filters applied)

    // Comparison slider
    this.comparisonMode = false;
    this.sliderPosition = 0.5;      // 0–1, fraction from left
    this._draggingSlider = false;

    this._initSliderEvents();
  }

  // ─── Image Loading ────────────────────────────────────────────

  loadImage(imageSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.originalImage = img;

        // Limit canvas size for performance (max 1600px on longest side)
        let w = img.width, h = img.height;
        const maxDim = 1600;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        this.canvas.width = w;
        this.canvas.height = h;
        this.overlayCanvas.width = w;
        this.overlayCanvas.height = h;

        this.ctx.drawImage(img, 0, 0, w, h);
        this.originalImageData = this.ctx.getImageData(0, 0, w, h);
        this.currentImageData = this.ctx.getImageData(0, 0, w, h);

        resolve(this.originalImageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  }

  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Invalid image file'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.loadImage(e.target.result).then(resolve).catch(reject);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // ─── Rendering ────────────────────────────────────────────────

  renderImageData(imageData) {
    this.currentImageData = imageData;
    this.ctx.putImageData(imageData, 0, 0);
    if (this.comparisonMode) {
      this._drawComparisonOverlay();
    }
  }

  renderOriginal() {
    if (this.originalImageData) {
      this.ctx.putImageData(this.originalImageData, 0, 0);
    }
  }

  getCurrentImageData() {
    return this.currentImageData
      ? new ImageData(
          new Uint8ClampedArray(this.currentImageData.data),
          this.currentImageData.width,
          this.currentImageData.height
        )
      : null;
  }

  getOriginalImageData() {
    return this.originalImageData
      ? new ImageData(
          new Uint8ClampedArray(this.originalImageData.data),
          this.originalImageData.width,
          this.originalImageData.height
        )
      : null;
  }

  getDimensions() {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  // ─── Thumbnail Generation ────────────────────────────────────

  generateThumbnail(imageData, size = 80) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // First, render the image data to a temp canvas at full size
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = imageData.width;
    fullCanvas.height = imageData.height;
    const fullCtx = fullCanvas.getContext('2d');
    fullCtx.putImageData(imageData, 0, 0);

    // Then scale down
    const aspect = imageData.width / imageData.height;
    let tw, th;
    if (aspect > 1) {
      tw = size;
      th = Math.round(size / aspect);
    } else {
      th = size;
      tw = Math.round(size * aspect);
    }
    tempCanvas.width = tw;
    tempCanvas.height = th;
    tempCtx.drawImage(fullCanvas, 0, 0, tw, th);

    return tempCanvas.toDataURL('image/jpeg', 0.6);
  }

  /**
   * Get small imageData for thumbnail previews
   */
  getThumbnailImageData(size = 80) {
    if (!this.originalImageData) return null;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = this.originalImageData.width;
    fullCanvas.height = this.originalImageData.height;
    fullCanvas.getContext('2d').putImageData(this.originalImageData, 0, 0);

    const aspect = this.originalImageData.width / this.originalImageData.height;
    let tw, th;
    if (aspect > 1) {
      tw = size;
      th = Math.round(size / aspect);
    } else {
      th = size;
      tw = Math.round(size * aspect);
    }
    tempCanvas.width = tw;
    tempCanvas.height = th;
    tempCtx.drawImage(fullCanvas, 0, 0, tw, th);

    return {
      imageData: tempCtx.getImageData(0, 0, tw, th),
      width: tw,
      height: th
    };
  }

  // ─── Comparison Slider ───────────────────────────────────────

  setComparisonMode(enabled) {
    this.comparisonMode = enabled;
    if (enabled) {
      this.sliderPosition = 0.5;
      this._drawComparisonOverlay();
    } else {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      // Re-render current state
      if (this.currentImageData) {
        this.ctx.putImageData(this.currentImageData, 0, 0);
      }
    }
  }

  toggleComparison() {
    this.setComparisonMode(!this.comparisonMode);
    return this.comparisonMode;
  }

  _drawComparisonOverlay() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const splitX = Math.round(w * this.sliderPosition);

    // Draw: left = original, right = filtered
    this.ctx.clearRect(0, 0, w, h);

    // Left side: original
    if (this.originalImageData) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      tempCanvas.getContext('2d').putImageData(this.originalImageData, 0, 0);
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, splitX, h);
      this.ctx.clip();
      this.ctx.drawImage(tempCanvas, 0, 0);
      this.ctx.restore();
    }

    // Right side: filtered
    if (this.currentImageData) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      tempCanvas.getContext('2d').putImageData(this.currentImageData, 0, 0);
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(splitX, 0, w - splitX, h);
      this.ctx.clip();
      this.ctx.drawImage(tempCanvas, 0, 0);
      this.ctx.restore();
    }

    // Draw slider line on overlay
    this.overlayCtx.clearRect(0, 0, w, h);
    this.overlayCtx.strokeStyle = '#fff';
    this.overlayCtx.lineWidth = 2;
    this.overlayCtx.shadowColor = 'rgba(0,0,0,0.5)';
    this.overlayCtx.shadowBlur = 4;
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(splitX, 0);
    this.overlayCtx.lineTo(splitX, h);
    this.overlayCtx.stroke();

    // Draw handle circle
    this.overlayCtx.fillStyle = '#fff';
    this.overlayCtx.shadowBlur = 8;
    this.overlayCtx.beginPath();
    this.overlayCtx.arc(splitX, h / 2, 16, 0, Math.PI * 2);
    this.overlayCtx.fill();

    // Draw arrows on handle
    this.overlayCtx.shadowBlur = 0;
    this.overlayCtx.fillStyle = '#1a1a2e';
    this.overlayCtx.font = '14px sans-serif';
    this.overlayCtx.textAlign = 'center';
    this.overlayCtx.textBaseline = 'middle';
    this.overlayCtx.fillText('◀▶', splitX, h / 2);

    // Labels
    this.overlayCtx.font = '11px Inter, sans-serif';
    this.overlayCtx.fillStyle = 'rgba(255,255,255,0.8)';
    this.overlayCtx.textAlign = 'left';
    this.overlayCtx.fillText('Original', 8, 20);
    this.overlayCtx.textAlign = 'right';
    this.overlayCtx.fillText('Filtered', w - 8, 20);
  }

  _initSliderEvents() {
    const getPos = (e) => {
      const rect = this.overlayCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      return (clientX - rect.left) / rect.width;
    };

    const onDown = (e) => {
      if (!this.comparisonMode) return;
      this._draggingSlider = true;
      this.sliderPosition = Math.max(0.02, Math.min(0.98, getPos(e)));
      this._drawComparisonOverlay();
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!this._draggingSlider) return;
      this.sliderPosition = Math.max(0.02, Math.min(0.98, getPos(e)));
      this._drawComparisonOverlay();
      e.preventDefault();
    };

    const onUp = () => {
      this._draggingSlider = false;
    };

    this.overlayCanvas.addEventListener('mousedown', onDown);
    this.overlayCanvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    this.overlayCanvas.addEventListener('touchstart', onDown, { passive: false });
    this.overlayCanvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }

  // ─── Export ───────────────────────────────────────────────────

  exportImage(format = 'png', quality = 0.92) {
    // Temporarily render filtered version without comparison overlay
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    if (this.currentImageData) {
      exportCtx.putImageData(this.currentImageData, 0, 0);
    }

    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp'
    };
    const mime = mimeTypes[format] || 'image/png';
    return exportCanvas.toDataURL(mime, quality);
  }

  downloadImage(filename, format = 'png', quality = 0.92) {
    const dataUrl = this.exportImage(format, quality);
    const ext = format === 'jpeg' ? 'jpg' : format;
    const finalName = filename.replace(/\.[^.]+$/, '') + `-pixelforge.${ext}`;

    const link = document.createElement('a');
    link.download = finalName;
    link.href = dataUrl;
    link.click();
  }

  // ─── Cleanup ──────────────────────────────────────────────────

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.originalImage = null;
    this.originalImageData = null;
    this.currentImageData = null;
  }

  hasImage() {
    return this.originalImageData !== null;
  }
}
