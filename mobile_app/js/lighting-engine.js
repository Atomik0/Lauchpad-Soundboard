// Lighting Animation Engine for Launchpad Studio Mobile
// Full 60 FPS Procedural Idle & Press Effects Matching STM32 Hardware & Desktop Engine

class MobileLightingEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.activeEffects = [];
    this.idleEffect = 10;
    this.pressEffect = 9;
    this.blendMode = 0;
    this.gridRows = 8;
    this.gridCols = 8;
    this.isRunning = false;
    this.padCoordsCache = new Map();
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.checkResize();
    this.start();
  }

  clearCoordsCache() {
    this.padCoordsCache.clear();
  }

  setSettings(settings = {}) {
    if (settings.idleEffect !== undefined) this.idleEffect = parseInt(settings.idleEffect, 10);
    if (settings.pressEffect !== undefined) this.pressEffect = parseInt(settings.pressEffect, 10);
    if (settings.blendMode !== undefined) this.blendMode = parseInt(settings.blendMode, 10);
    if (settings.gridRows) this.gridRows = settings.gridRows;
    if (settings.gridCols) this.gridCols = settings.gridCols;
    this.clearCoordsCache();
  }

  checkResize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (targetW > 0 && targetH > 0 && (this.canvas.width !== targetW || this.canvas.height !== targetH)) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.clearCoordsCache();
    }
  }

  trigger(row, col, colorHex = '#C3EA2B', effectType = null) {
    const effId = effectType !== null && effectType !== undefined ? parseInt(effectType, 10) : this.pressEffect;
    this.activeEffects.push({
      id: effId,
      r: row,
      c: col,
      color: colorHex || '#C3EA2B',
      startTime: performance.now(),
      duration: 850
    });
  }

  getPadCoords(r, c) {
    const key = `${r}_${c}`;
    if (this.padCoordsCache.has(key)) {
      return this.padCoordsCache.get(key);
    }

    const idx = r * this.gridCols + c;
    const padEl = document.querySelector(`.pad-item[data-index="${idx}"]`);
    if (padEl && this.canvas) {
      const pRect = padEl.getBoundingClientRect();
      const cRect = this.canvas.getBoundingClientRect();
      if (cRect.width > 0 && cRect.height > 0) {
        const coords = {
          x: pRect.left - cRect.left,
          y: pRect.top - cRect.top,
          w: pRect.width,
          h: pRect.height,
          hasSound: padEl.classList.contains('has-sound')
        };
        if (coords.w > 0 && coords.h > 0) {
          this.padCoordsCache.set(key, coords);
        }
        return coords;
      }
    }

    const gap = 4;
    const w = ((this.canvas.width / (window.devicePixelRatio || 1)) - gap * (this.gridCols - 1)) / this.gridCols;
    const h = ((this.canvas.height / (window.devicePixelRatio || 1)) - gap * (this.gridRows - 1)) / this.gridRows;
    return {
      x: c * (w + gap),
      y: r * (h + gap),
      w,
      h,
      hasSound: false
    };
  }

  hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  computeIdleColor(r, c, idleMode, now) {
    if (idleMode === 0) return [0, 0, 0];
    const t = now * 0.001;
    const rows = this.gridRows;
    const cols = this.gridCols;
    const centerR = (rows - 1) / 2;
    const centerC = (cols - 1) / 2;
    const scale = cols === 5 ? 0.625 : 1.0;

    switch (idleMode) {
      case 1: { // Rainbow Wave
        const step = cols === 5 ? 50 : 32;
        const hue = (t * 98.9 + (r * step) + (c * step)) % 360;
        return this.hslToRgb(hue, 1.0, 0.55);
      }
      case 2: { // Matrix Rain
        const speeds = [0.85, 1.15, 0.75, 1.25, 0.70, 1.05, 0.90, 1.20];
        const sp = speeds[c % speeds.length];
        const offset = (c * 2.3) % 8.4;
        const wrapLen = rows + 3.2;
        const dropPos = ((t * 7.8 * sp + offset) % wrapLen);
        const diff = r - dropPos;
        if (Math.abs(diff) < 0.6) return [220, 255, 220];
        if (diff < 0 && diff > -2.2) return [0, 230, 70];
        if (diff < 0 && diff > -4.5) return [0, 90, 25];
        return [0, 15, 8];
      }
      case 3: { // Nebula
        const cx = centerC + Math.sin(t * 1.2) * 1.8;
        const cy = centerR + Math.cos(t * 0.9) * 1.8;
        const dist = Math.hypot(r - cy, c - cx);
        const norm = Math.max(0, Math.min(1, dist / 4.6));
        return [Math.round((1.0 - norm) * 240), Math.round(norm * 180), 255];
      }
      case 4: { // Breathing
        const phase = Math.sin(t * 2.0) * 0.5 + 0.5;
        const br = Math.round(40 + phase * 215);
        return [0, Math.round(br * 0.9), br];
      }
      case 5: { // Fireworks
        const maxDist = Math.hypot(centerR, centerC) + 0.6;
        const cycleLen = maxDist + 0.8;
        const d1 = ((t * 2.8) % cycleLen);
        const dist = Math.hypot(r - centerR, c - centerC);
        const thr = 1.1;
        const diff1 = Math.abs(dist - d1);
        if (diff1 < thr) {
          const fade = Math.max(0, 1.0 - d1 / maxDist) * (1.0 - diff1 / thr);
          const hue = (Math.floor(t * 0.6) * 65 + (r + c) * 18) % 360;
          const [cr, cg, cb] = this.hslToRgb(hue, 1.0, 0.5);
          return [Math.round(cr * fade), Math.round(cg * fade), Math.round(cb * fade)];
        }
        return [5, 5, 14];
      }
      case 6: { // Ocean Waves
        const oceanPhase = t * 120.0;
        const wave = Math.round((Math.sin((oceanPhase + c * 35) * 0.02454) + 1.0) * 127.5);
        return [0, Math.round(wave * 0.7), wave];
      }
      case 7: { // Inferno Flames
        const flicker = Math.sin(t * 3.5 + c * 1.8) * 0.9;
        const h = (rows - 1 - r) + flicker;
        if (h > 5.2) return [255, 235, 70];
        if (h > 3.2) return [255, 130, 0];
        if (h > 1.2) return [230, 30, 0];
        if (h >= 0.0) return [90, 10, 0];
        return [18, 3, 0];
      }
      case 8: { // Cyber Spectrum
        const barVal = (Math.sin(t * 2.5 + c * 1.1) * 0.5 + 0.5) * (rows - 0.4);
        const invRow = rows - 1 - r;
        if (invRow <= barVal) {
          const ratio = invRow / (rows - 1);
          if (ratio >= 0.75) return [255, 0, 50];
          if (ratio >= 0.5) return [255, 200, 0];
          if (ratio >= 0.25) return [0, 240, 255];
          return [0, 255, 90];
        }
        return [8, 12, 18];
      }
      case 9: { // Plasma
        const v = Math.sin(r * 0.8 + t * 2.0) + Math.sin(c * 0.8 + t * 2.6) + Math.sin((r + c) * 0.5 + t * 1.8);
        const hue = Math.round(((v + 3.0) * 60 + t * 40) % 360);
        return this.hslToRgb(hue, 1.0, 0.55);
      }
      case 10: { // Hyperspace (Active on Amigos)
        const maxRing = 5.2;
        const ring1 = ((t * 3.5) % maxRing);
        const ring2 = ((t * 3.5 + maxRing * 0.5) % maxRing);
        const dist = Math.hypot(r - centerR, c - centerC);
        const d1 = Math.abs(dist - ring1);
        const d2 = Math.abs(dist - ring2);
        if (d1 < 0.9) {
          const b1 = Math.round((1.0 - (d1 / 0.9)) * 255);
          return [b1, b1, 255];
        }
        if (d2 < 0.9) {
          const b2 = Math.round((1.0 - (d2 / 0.9)) * 220);
          return [Math.round(b2 * 0.4), b2, 255];
        }
        return [10, 15, 35];
      }
      case 11: { // Acid Mandala
        const fx = Math.abs(c - centerC);
        const fy = Math.abs(r - centerR);
        const mand = Math.sin(fx * 1.7 + t * 2.5) * Math.cos(fy * 1.7 - t * 2.5) + Math.sin((fx + fy) * 1.1 + t * 3.5);
        const hue = Math.round(((mand + 2.0) * 85 + t * 76.9) % 360);
        return this.hslToRgb(hue, 1.0, 0.6);
      }
      case 12: { // Cyber DMT
        const dx = c - centerC;
        const dy = r - centerR;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const tunnel = (((t * 1.6 - (1.0 / (dist + 0.2)) * 3.5) % 1) + 1) % 1;
        const hue = Math.round(((angle / Math.PI + 1.0) * 180 + t * 65) % 360);
        const br = Math.sin(tunnel * Math.PI * 2) * 0.5 + 0.5;
        return this.hslToRgb(hue, 1.0, Math.max(0.12, br * 0.6));
      }
      case 13: { // Neon Lava
        const pTime = t * 1.6;
        const m1x = centerC + Math.sin(pTime * 1.1) * 2.0;
        const m1y = centerR + Math.cos(pTime * 1.4) * 2.0;
        const m2x = centerC + Math.cos(pTime * 0.9) * 2.2;
        const m2y = centerR + Math.sin(pTime * 1.5) * 2.2;
        const field = (1.0 / (Math.pow(c - m1x, 2) + Math.pow(r - m1y, 2) + 0.45))
          + (1.0 / (Math.pow(c - m2x, 2) + Math.pow(r - m2y, 2) + 0.45));
        const hue = Math.round((field * 140 + t * 50) % 360);
        return this.hslToRgb(hue, 1.0, Math.min(0.65, field * 0.55));
      }
      case 14: { // Quantum Vortex
        const dx = c - centerC;
        const dy = r - centerR;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const spiral = angle * 2.0 + dist * 1.7 - t * 3.2;
        const hue = Math.round((spiral * (180 / Math.PI) + 720) % 360);
        const pulse = Math.sin(spiral * 2.0) * 0.5 + 0.5;
        return this.hslToRgb(hue, 1.0, Math.max(0.15, pulse * 0.6));
      }
      case 15: { // Psy Aurora
        const pTime = t * 1.6;
        const wave1 = Math.sin(c * 0.7 + pTime * 1.8) * 1.7;
        const targetY = centerR + wave1;
        const distY = Math.abs(r - targetY);
        const intensity = Math.max(0, 1.0 - distY / 2.7);
        const hue = Math.round((c * 30 + r * 22 + t * 70) % 360);
        return this.hslToRgb(hue, 1.0, intensity * 0.65);
      }
      case 16: { // Audio Pulse
        const dist = Math.hypot(r - centerR, c - centerC);
        const normDist = Math.max(0, 1.0 - (dist / 5.4));
        const pulse = Math.sin(t * 3.0 - dist * 0.8) * 0.5 + 0.5;
        const hue = Math.round((t * 50 + dist * 35) % 360);
        return this.hslToRgb(hue, 1.0, Math.max(0.1, pulse * 0.65));
      }
      default: {
        const hue = (t * 40 + (r * 30) + (c * 25)) % 360;
        return this.hslToRgb(hue, 1.0, 0.5);
      }
    }
  }

  computePressIntensity(eff, r, c, now) {
    const rawT = (now - eff.startTime) / eff.duration;
    const t = Math.max(0, Math.min(1, rawT));
    const dr = r - eff.r;
    const dc = c - eff.c;
    const dist = Math.hypot(dr, dc);

    let intensity = 0;
    let col = eff.color;

    switch (eff.id) {
      case 0: { // Direct Flash
        if (dist <= 0.7) {
          intensity = 1.0 - t;
          col = '#FFFFFF';
        }
        break;
      }
      case 1: { // Ripple
        const waveR = t * 9.0;
        const diff = Math.abs(dist - waveR);
        if (diff < 1.3) {
          intensity = (1.0 - diff / 1.3) * (1.0 - t * 0.8);
        }
        break;
      }
      case 2: { // Crosshair
        const onCross = (Math.abs(dr) < 0.6 || Math.abs(dc) < 0.6);
        if (onCross && dist <= t * 8.0) {
          intensity = (1.0 - dist / 8.0) * (1.0 - t);
        }
        break;
      }
      case 3: { // Starburst
        const isDiag = Math.abs(Math.abs(dr) - Math.abs(dc)) < 0.6;
        const onCross = (Math.abs(dr) < 0.6 || Math.abs(dc) < 0.6);
        if ((isDiag || onCross) && dist <= t * 8.0) {
          intensity = 1.0 - t;
        }
        break;
      }
      case 4: { // Lightning Storm
        const inStorm = (Math.sin(dist * 5.0 - t * 30) > 0.45) && (dist < t * 8.0);
        if (inStorm) {
          intensity = 1.0 - t;
          col = (t * 15 % 2 > 1) ? '#FFFFFF' : '#38BDF8';
        }
        break;
      }
      case 5: { // Crystal Diamond
        const mDist = Math.abs(dr) + Math.abs(dc);
        const waveM = t * 11.0;
        const diffM = Math.abs(mDist - waveM);
        if (diffM < 1.3) {
          intensity = (1.0 - diffM / 1.3) * (1.0 - t * 0.8);
          col = '#A855F7';
        }
        break;
      }
      case 6: { // Volcanic Shockwave
        const waveR = t * 8.5;
        const diff = Math.abs(dist - waveR);
        if (diff < 1.3) {
          intensity = (1.0 - diff / 1.3) * (1.0 - t);
          col = t < 0.4 ? '#FFDD00' : '#EF4444';
        }
        break;
      }
      case 7: { // Vortex Spiral
        const angle = Math.atan2(dr, dc);
        const spiralDist = ((angle / (Math.PI * 2) + t * 2.5) % 1) * 8.0;
        const diffS = Math.abs(dist - spiralDist);
        if (diffS < 1.2) {
          intensity = (1.0 - diffS / 1.2) * (1.0 - t);
          col = '#06B6D4';
        }
        break;
      }
      case 8: { // Hyper Neon Pulse
        const r1 = t * 10.0;
        const r2 = Math.max(0, (t - 0.22) * 10.0);
        const p1 = Math.abs(dist - r1) < 1.2 ? (1 - Math.abs(dist - r1) / 1.2) * (1 - t) : 0;
        const p2 = Math.abs(dist - r2) < 1.2 ? (1 - Math.abs(dist - r2) / 1.2) * (1 - t) : 0;
        intensity = Math.max(p1, p2);
        col = '#EC4899';
        break;
      }
      case 9: { // Quantum Prism (Active on Amigos!)
        const waveR = t * 9.0;
        const diff = Math.abs(dist - waveR);
        if (diff < 1.4) {
          intensity = (1.0 - diff / 1.4) * (1.0 - t * 0.8);
          const hue = Math.round((t * 360 + Math.atan2(dr, dc) * (180 / Math.PI) + 360) % 360);
          col = `hsl(${hue}, 100%, 65%)`;
        }
        break;
      }
      case 10: { // Supernova Shockwave
        const wave1 = t * 7.5;
        const wave2 = t * 11.0;
        const p1 = Math.abs(dist - wave1) < 1.2 ? (1 - Math.abs(dist - wave1) / 1.2) * (1 - t) : 0;
        const p2 = Math.abs(dist - wave2) < 1.2 ? (1 - Math.abs(dist - wave2) / 1.2) * (1 - t) : 0;
        intensity = Math.max(p1, p2);
        col = t < 0.25 ? '#FFFFFF' : '#FACC15';
        break;
      }
      case 11: { // Spiral Dimension
        const angle = Math.atan2(dr, dc);
        const arm1 = ((angle + t * 10) % (Math.PI * 2)) / (Math.PI * 2) * 8.0;
        const p1 = Math.abs(dist - arm1) < 1.3 ? (1 - Math.abs(dist - arm1) / 1.3) * (1 - t) : 0;
        intensity = p1;
        col = '#8B5CF6';
        break;
      }
      case 12: { // Tesla Arc
        const inArc = ((Math.sin(dist * 3.5 + t * 25) > 0.4) && dist < 4.2);
        if (inArc) {
          intensity = 1.0 - t * 0.9;
          col = (t * 20 % 2 > 1) ? '#FFFFFF' : '#38BDF8';
        }
        break;
      }
      default: {
        const waveR = t * 8.5;
        const diff = Math.abs(dist - waveR);
        if (diff < 1.3) {
          intensity = (1.0 - diff / 1.3) * (1.0 - t);
        }
        break;
      }
    }

    return { intensity, color: col };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const renderLoop = (timestamp) => {
      if (!this.isRunning) return;
      this.checkResize();
      this.draw(timestamp);
      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }

  draw(now) {
    if (!this.ctx || !this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasCssW = this.canvas.width / dpr;
    const canvasCssH = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, canvasCssW, canvasCssH);

    const rows = this.gridRows;
    const cols = this.gridCols;

    this.activeEffects = this.activeEffects.filter(eff => (now - eff.startTime) < eff.duration);

    const idleNum = this.idleEffect;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const coords = this.getPadCoords(r, c);
        if (!coords || coords.w <= 0) continue;

        if (idleNum > 0) {
          const [ir, ig, ib] = this.computeIdleColor(r, c, idleNum, now);
          const energy = (ir * 0.299 + ig * 0.587 + ib * 0.114) / 255.0;

          const alpha = coords.hasSound
            ? Math.min(0.65, 0.15 + energy * 0.50)
            : Math.min(1.0, 0.40 + energy * 0.60);

          this.ctx.save();
          this.ctx.beginPath();
          if (this.ctx.roundRect) {
            this.ctx.roundRect(coords.x + 1, coords.y + 1, coords.w - 2, coords.h - 2, 5);
          } else {
            this.ctx.rect(coords.x + 1, coords.y + 1, coords.w - 2, coords.h - 2);
          }
          this.ctx.fillStyle = `rgba(${ir}, ${ig}, ${ib}, ${alpha})`;
          if (energy > 0.3) {
            this.ctx.shadowColor = `rgb(${ir}, ${ig}, ${ib})`;
            this.ctx.shadowBlur = energy * 16;
          }
          this.ctx.fill();
          this.ctx.restore();
        }

        if (this.activeEffects.length > 0) {
          let maxInt = 0;
          let activeCol = null;

          for (const eff of this.activeEffects) {
            const res = this.computePressIntensity(eff, r, c, now);
            if (res.intensity > maxInt) {
              maxInt = res.intensity;
              activeCol = res.color;
            }
          }

          if (maxInt > 0.03 && activeCol) {
            this.ctx.save();
            this.ctx.beginPath();
            if (this.ctx.roundRect) {
              this.ctx.roundRect(coords.x, coords.y, coords.w, coords.h, 5);
            } else {
              this.ctx.rect(coords.x, coords.y, coords.w, coords.h);
            }
            this.ctx.fillStyle = activeCol;
            this.ctx.globalAlpha = Math.min(1.0, maxInt * 1.4);
            this.ctx.shadowColor = activeCol;
            this.ctx.shadowBlur = maxInt * 25;
            this.ctx.fill();
            this.ctx.restore();
          }
        }
      }
    }
  }
}

window.lightingEngine = new MobileLightingEngine();
