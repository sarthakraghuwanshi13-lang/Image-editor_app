/**
 * PixelForge — Filter Engine
 * Pure Canvas API pixel manipulation for all filters.
 * No external dependencies.
 */

// ─── Adjustment Filters ─────────────────────────────────────────────

export function adjustBrightness(imageData, amount) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] + amount);
    d[i + 1] = clamp(d[i + 1] + amount);
    d[i + 2] = clamp(d[i + 2] + amount);
  }
  return imageData;
}

export function adjustContrast(imageData, amount) {
  const factor = (259 * (amount + 255)) / (255 * (259 - amount));
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(factor * (d[i] - 128) + 128);
    d[i + 1] = clamp(factor * (d[i + 1] - 128) + 128);
    d[i + 2] = clamp(factor * (d[i + 2] - 128) + 128);
  }
  return imageData;
}

export function adjustSaturation(imageData, amount) {
  const factor = 1 + amount / 100;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    d[i]     = clamp(gray + factor * (d[i] - gray));
    d[i + 1] = clamp(gray + factor * (d[i + 1] - gray));
    d[i + 2] = clamp(gray + factor * (d[i + 2] - gray));
  }
  return imageData;
}

export function adjustVibrance(imageData, amount) {
  const factor = amount / 100;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const satRatio = (max - avg) / 128;
    const boostFactor = factor * (1 - satRatio);
    const gray = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    d[i]     = clamp(gray + (1 + boostFactor) * (d[i] - gray));
    d[i + 1] = clamp(gray + (1 + boostFactor) * (d[i + 1] - gray));
    d[i + 2] = clamp(gray + (1 + boostFactor) * (d[i + 2] - gray));
  }
  return imageData;
}

export function adjustHueRotate(imageData, degrees) {
  const d = imageData.data;
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i]     = clamp(r * (0.213 + 0.787 * cos - 0.213 * sin) + g * (0.715 - 0.715 * cos - 0.715 * sin) + b * (0.072 - 0.072 * cos + 0.928 * sin));
    d[i + 1] = clamp(r * (0.213 - 0.213 * cos + 0.143 * sin) + g * (0.715 + 0.285 * cos + 0.140 * sin) + b * (0.072 - 0.072 * cos - 0.283 * sin));
    d[i + 2] = clamp(r * (0.213 - 0.213 * cos - 0.787 * sin) + g * (0.715 - 0.715 * cos + 0.715 * sin) + b * (0.072 + 0.928 * cos + 0.072 * sin));
  }
  return imageData;
}

export function adjustTemperature(imageData, amount) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] + amount);       // Warm = more red
    d[i + 2] = clamp(d[i + 2] - amount);   // Cool = more blue
  }
  return imageData;
}

export function adjustTint(imageData, amount) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i + 1] = clamp(d[i + 1] + amount);
  }
  return imageData;
}

export function adjustSharpen(imageData, width, height, amount = 1) {
  const kernel = [
     0, -amount,  0,
    -amount, 1 + 4 * amount, -amount,
     0, -amount,  0
  ];
  return applyConvolution(imageData, width, height, kernel);
}

export function adjustBlur(imageData, width, height, radius = 1) {
  const size = 2 * radius + 1;
  const weight = 1 / (size * size);
  const kernel = new Array(size * size).fill(weight);
  return applyConvolutionN(imageData, width, height, kernel, size);
}

// ─── Preset Effect Filters ──────────────────────────────────────────

export function presetVintage(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i]     = clamp(r * 0.393 + g * 0.769 + b * 0.189 + 20);
    d[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168 + 10);
    d[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131 - 10);
  }
  return imageData;
}

export function presetSepia(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i]     = clamp(r * 0.393 + g * 0.769 + b * 0.189);
    d[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168);
    d[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131);
  }
  return imageData;
}

export function presetNoir(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const boosted = clamp((gray - 128) * 1.4 + 128);
    d[i] = d[i + 1] = d[i + 2] = boosted;
  }
  return imageData;
}

export function presetLomo(imageData, width, height) {
  const d = imageData.data;
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Boost saturation
      const gray = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      d[i]     = clamp(gray + 1.5 * (d[i] - gray));
      d[i + 1] = clamp(gray + 1.5 * (d[i + 1] - gray));
      d[i + 2] = clamp(gray + 1.5 * (d[i + 2] - gray));
      // Vignette
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const vignette = 1 - dist * 0.6;
      d[i]     = clamp(d[i] * vignette);
      d[i + 1] = clamp(d[i + 1] * vignette);
      d[i + 2] = clamp(d[i + 2] * vignette);
    }
  }
  return imageData;
}

export function presetClarity(imageData, width, height) {
  adjustContrast(imageData, 30);
  adjustSharpen(imageData, width, height, 0.6);
  adjustVibrance(imageData, 20);
  return imageData;
}

export function presetSinCity(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // Keep reds, desaturate everything else
    if (r > 100 && g < 80 && b < 80) {
      d[i]     = clamp(r * 1.2);
      d[i + 1] = clamp(g * 0.3);
      d[i + 2] = clamp(b * 0.3);
    } else {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const high = clamp((gray - 128) * 1.3 + 128);
      d[i] = d[i + 1] = d[i + 2] = high;
    }
  }
  return imageData;
}

export function presetCrossProcess(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] * 1.1 + 20);
    d[i + 1] = clamp(d[i + 1] * 1.05 - 10);
    d[i + 2] = clamp(d[i + 2] * 0.8 + 40);
  }
  return imageData;
}

export function presetPinhole(imageData, width, height) {
  presetNoir(imageData);
  const d = imageData.data;
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const v = 1 - dist * 0.8;
      d[i] *= v; d[i + 1] *= v; d[i + 2] *= v;
    }
  }
  return imageData;
}

export function presetNostalgia(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] * 0.9 + 30);
    d[i + 1] = clamp(d[i + 1] * 0.85 + 20);
    d[i + 2] = clamp(d[i + 2] * 0.75 + 10);
  }
  adjustContrast(imageData, -15);
  return imageData;
}

export function presetMajesty(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] * 0.9 + 15);
    d[i + 1] = clamp(d[i + 1] * 0.8);
    d[i + 2] = clamp(d[i + 2] * 1.2 + 20);
  }
  return imageData;
}

export function presetFade(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] * 0.8 + 40);
    d[i + 1] = clamp(d[i + 1] * 0.8 + 40);
    d[i + 2] = clamp(d[i + 2] * 0.8 + 40);
  }
  return imageData;
}

export function presetChrome(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i]     = clamp(Math.min(255, r * 1.2 + 10));
    d[i + 1] = clamp(Math.min(255, g * 1.1 + 5));
    d[i + 2] = clamp(Math.min(255, b * 1.15 + 15));
  }
  adjustContrast(imageData, 20);
  return imageData;
}

// ─── AI-Inspired Filters ────────────────────────────────────────────

export function filterEdgeDetect(imageData, width, height) {
  // Sobel operator
  const src = new Uint8ClampedArray(imageData.data);
  const d = imageData.data;
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumXr = 0, sumYr = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
          const ki = (ky + 1) * 3 + (kx + 1);
          sumXr += gray * gx[ki];
          sumYr += gray * gy[ki];
        }
      }
      const mag = clamp(Math.sqrt(sumXr * sumXr + sumYr * sumYr));
      const i = (y * width + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = mag;
    }
  }
  return imageData;
}

export function filterEmboss(imageData, width, height) {
  const kernel = [
    -2, -1, 0,
    -1,  1, 1,
     0,  1, 2
  ];
  return applyConvolution(imageData, width, height, kernel);
}

export function filterPosterize(imageData, levels = 4) {
  const d = imageData.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  return imageData;
}

export function filterPixelate(imageData, width, height, blockSize = 8) {
  const d = imageData.data;
  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
        }
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          d[i] = r; d[i + 1] = g; d[i + 2] = b;
        }
      }
    }
  }
  return imageData;
}

// ─── Filter Application Engine ──────────────────────────────────────

/**
 * Apply a named filter with given parameters to imageData.
 * Returns the modified imageData.
 */
export function applyFilter(imageData, filterName, params, width, height) {
  switch (filterName) {
    // Adjustments
    case 'brightness':   return adjustBrightness(imageData, params.value);
    case 'contrast':     return adjustContrast(imageData, params.value);
    case 'saturation':   return adjustSaturation(imageData, params.value);
    case 'vibrance':     return adjustVibrance(imageData, params.value);
    case 'hueRotate':    return adjustHueRotate(imageData, params.value);
    case 'temperature':  return adjustTemperature(imageData, params.value);
    case 'tint':         return adjustTint(imageData, params.value);
    case 'sharpen':      return adjustSharpen(imageData, width, height, params.value);
    case 'blur':         return adjustBlur(imageData, width, height, params.value);
    // Presets
    case 'vintage':      return presetVintage(imageData);
    case 'sepia':        return presetSepia(imageData);
    case 'noir':         return presetNoir(imageData);
    case 'lomo':         return presetLomo(imageData, width, height);
    case 'clarity':      return presetClarity(imageData, width, height);
    case 'sinCity':      return presetSinCity(imageData);
    case 'crossProcess': return presetCrossProcess(imageData);
    case 'pinhole':      return presetPinhole(imageData, width, height);
    case 'nostalgia':    return presetNostalgia(imageData);
    case 'majesty':      return presetMajesty(imageData);
    case 'fade':         return presetFade(imageData);
    case 'chrome':       return presetChrome(imageData);
    // AI
    case 'edgeDetect':   return filterEdgeDetect(imageData, width, height);
    case 'emboss':       return filterEmboss(imageData, width, height);
    case 'posterize':    return filterPosterize(imageData, params.value || 4);
    case 'pixelate':     return filterPixelate(imageData, width, height, params.value || 8);
    default:
      console.warn(`Unknown filter: ${filterName}`);
      return imageData;
  }
}

/**
 * Apply a stack of filters sequentially to a copy of the original image data.
 */
export function applyFilterStack(originalImageData, filterStack, width, height) {
  const copy = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );
  for (const filter of filterStack) {
    applyFilter(copy, filter.name, filter.params, width, height);
  }
  return copy;
}

/**
 * Generate a tiny preview of a preset filter applied to a thumbnail.
 */
export function generatePreviewThumbnail(originalImageData, filterName, width, height) {
  const copy = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );
  applyFilter(copy, filterName, { value: 0 }, width, height);
  return copy;
}

// ─── Filter Registry ────────────────────────────────────────────────

export const ADJUSTMENT_FILTERS = [
  { name: 'brightness',  label: 'Brightness',  min: -100, max: 100, default: 0, step: 1, icon: '☀️' },
  { name: 'contrast',    label: 'Contrast',    min: -100, max: 100, default: 0, step: 1, icon: '◐' },
  { name: 'saturation',  label: 'Saturation',  min: -100, max: 100, default: 0, step: 1, icon: '🎨' },
  { name: 'vibrance',    label: 'Vibrance',    min: -100, max: 100, default: 0, step: 1, icon: '💎' },
  { name: 'hueRotate',   label: 'Hue',         min: -180, max: 180, default: 0, step: 1, icon: '🌈' },
  { name: 'temperature', label: 'Temperature', min: -50,  max: 50,  default: 0, step: 1, icon: '🌡️' },
  { name: 'tint',        label: 'Tint',        min: -50,  max: 50,  default: 0, step: 1, icon: '🔮' },
  { name: 'sharpen',     label: 'Sharpen',     min: 0,    max: 3,   default: 0, step: 0.1, icon: '🔪' },
  { name: 'blur',        label: 'Blur',        min: 0,    max: 5,   default: 0, step: 1, icon: '🌫️' },
];

export const PRESET_FILTERS = [
  { name: 'vintage',      label: 'Vintage',        icon: '📷' },
  { name: 'sepia',        label: 'Sepia',          icon: '🟤' },
  { name: 'noir',         label: 'Noir',           icon: '🖤' },
  { name: 'lomo',         label: 'Lomo',           icon: '📸' },
  { name: 'clarity',      label: 'Clarity',        icon: '✨' },
  { name: 'sinCity',      label: 'Sin City',       icon: '🔴' },
  { name: 'crossProcess', label: 'Cross Process',  icon: '🔄' },
  { name: 'pinhole',      label: 'Pinhole',        icon: '🕳️' },
  { name: 'nostalgia',    label: 'Nostalgia',      icon: '🕰️' },
  { name: 'majesty',      label: 'Majesty',        icon: '👑' },
  { name: 'fade',         label: 'Fade',           icon: '🌁' },
  { name: 'chrome',       label: 'Chrome',         icon: '🪞' },
];

export const AI_FILTERS = [
  { name: 'edgeDetect', label: 'Edge Detect', icon: '🧠' },
  { name: 'emboss',     label: 'Emboss',      icon: '🗿' },
  { name: 'posterize',  label: 'Posterize',   icon: '🎭', hasParam: true, min: 2, max: 16, default: 4, step: 1 },
  { name: 'pixelate',   label: 'Pixelate',    icon: '🧩', hasParam: true, min: 2, max: 32, default: 8, step: 1 },
];

// ─── Utility Functions ──────────────────────────────────────────────

function clamp(val) {
  return Math.max(0, Math.min(255, Math.round(val)));
}

function applyConvolution(imageData, width, height, kernel) {
  const src = new Uint8ClampedArray(imageData.data);
  const d = imageData.data;
  const side = 3;
  const half = Math.floor(side / 2);

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const srcIdx = ((y + ky - half) * width + (x + kx - half)) * 4;
          const w = kernel[ky * side + kx];
          r += src[srcIdx] * w;
          g += src[srcIdx + 1] * w;
          b += src[srcIdx + 2] * w;
        }
      }
      const idx = (y * width + x) * 4;
      d[idx]     = clamp(r);
      d[idx + 1] = clamp(g);
      d[idx + 2] = clamp(b);
    }
  }
  return imageData;
}

function applyConvolutionN(imageData, width, height, kernel, size) {
  const src = new Uint8ClampedArray(imageData.data);
  const d = imageData.data;
  const half = Math.floor(size / 2);

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const srcIdx = ((y + ky - half) * width + (x + kx - half)) * 4;
          const w = kernel[ky * size + kx];
          r += src[srcIdx] * w;
          g += src[srcIdx + 1] * w;
          b += src[srcIdx + 2] * w;
        }
      }
      const idx = (y * width + x) * 4;
      d[idx]     = clamp(r);
      d[idx + 1] = clamp(g);
      d[idx + 2] = clamp(b);
    }
  }
  return imageData;
}
