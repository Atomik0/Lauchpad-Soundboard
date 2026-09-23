// Pad Grid Renderer and Touch Controller
// Full-Bleed 8x8 & 5x5 Studio Matrix with Real-Time Reactive Lighting

class PadGridManager {
  constructor() {
    this.container = null;
    this.currentBankId = null;
    this.banks = {};
    this.gridType = '8x8';
    this.playingPadIndices = new Set();
    this.activePointerPads = new Map();
  }

  init(containerElement) {
    this.container = containerElement;
  }

  setData(data) {
    if (!data) return;
    if (data.gridType) this.gridType = data.gridType;
    if (data.currentBankId) this.currentBankId = data.currentBankId;
    if (data.banks) this.banks = data.banks;

    const size = this.gridType === '5x5' ? 5 : 8;
    if (window.lightingEngine) {
      window.lightingEngine.setSettings({
        gridRows: size,
        gridCols: size
      });
    }

    this.render();
  }

  setBank(bankId) {
    this.currentBankId = bankId;
    this.render();
  }

  setPadPlaying(padIndex, isPlaying) {
    if (isPlaying) {
      this.playingPadIndices.add(padIndex);
    } else {
      this.playingPadIndices.delete(padIndex);
    }

    const padEl = this.container ? this.container.querySelector(`[data-index="${padIndex}"]`) : null;
    if (padEl) {
      padEl.classList.toggle('playing', !!isPlaying);
    }
  }

  clearAllPlaying() {
    this.playingPadIndices.clear();
    if (this.container) {
      this.container.querySelectorAll('.pad-item.playing').forEach(el => el.classList.remove('playing'));
    }
  }

  hexToRgbStr(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
      return '195, 234, 43';
    }
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    if (isNaN(num)) return '195, 234, 43';

    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
  }

  render() {
    if (!this.container) return;

    const size = this.gridType === '5x5' ? 5 : 8;
    const totalPads = size * size;
    const rawPads = (this.banks && this.currentBankId && this.banks[this.currentBankId]) || [];

    this.container.style.setProperty('--grid-cols', size);
    this.container.style.setProperty('--grid-rows', size);
    this.container.innerHTML = '';

    for (let idx = 0; idx < totalPads; idx++) {
      const pad = rawPads[idx] || {
        id: idx,
        name: `Pad ${idx + 1}`,
        color: '#2A2E39',
        audioPath: null,
        obsAction: 'none'
      };

      const padEl = document.createElement('div');
      padEl.className = 'pad-item';
      padEl.dataset.index = idx;

      const hasAudio = !!(pad.audioPath || pad.audioFileName || pad.audioBuffer || pad.synthType);
      const hasObs = pad.obsAction && pad.obsAction !== 'none';
      const isEmpty = !hasAudio && !hasObs;

      if (isEmpty) {
        padEl.classList.add('empty');
      } else {
        padEl.classList.add('has-sound');
      }

      const padColor = pad.color || (hasAudio ? '#C3EA2B' : '#2A2E39');
      const rgbStr = this.hexToRgbStr(padColor);

      padEl.style.setProperty('--pad-color', padColor);
      padEl.style.setProperty('--pad-rgb', rgbStr);

      if (this.playingPadIndices.has(idx)) {
        padEl.classList.add('playing');
      }

      const r = Math.floor(idx / size);
      const c = idx % size;

      padEl.innerHTML = `
        <div class="pad-header">
          <span class="pad-number">${idx + 1}</span>
          ${hasObs ? `<span class="pad-obs-badge">OBS</span>` : ''}
        </div>
        <div class="pad-center">
          <span class="pad-name">${pad.name || `Pad ${idx + 1}`}</span>
        </div>
      `;

      this.bindTouchEvents(padEl, idx, r, c, padColor, pad.pressEffect);
      this.container.appendChild(padEl);
    }

    if (window.lightingEngine) {
      setTimeout(() => window.lightingEngine.clearCoordsCache(), 50);
    }
  }

  bindTouchEvents(padEl, padIndex, row, col, padColor, pressEffect) {
    const handlePress = (e) => {
      e.preventDefault();
      this.activePointerPads.set(e.pointerId, padIndex);

      padEl.classList.add('pressed');

      if (window.HapticsManager) {
        window.HapticsManager.trigger('medium');
      }

      if (window.lightingEngine) {
        window.lightingEngine.trigger(row, col, padColor, pressEffect);
      }

      if (window.remoteClient) {
        window.remoteClient.sendTriggerPad(this.currentBankId, padIndex);
      }
    };

    const handleRelease = (e) => {
      if (this.activePointerPads.has(e.pointerId)) {
        this.activePointerPads.delete(e.pointerId);
        padEl.classList.remove('pressed');
      }
    };

    padEl.addEventListener('pointerdown', handlePress);
    padEl.addEventListener('pointerup', handleRelease);
    padEl.addEventListener('pointercancel', handleRelease);
    padEl.addEventListener('pointerleave', handleRelease);
  }
}

window.padGrid = new PadGridManager();
