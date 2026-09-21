/*
 * Launchpad 8x8 Soundboard Pro
 * Multi-Bank Engine, Dual Audio Output (Headphones + Discord Cable), Lightshows & Zero Latency
 */

function createEmptyBank(prefix = 'Pad', rows = 8, cols = 8) {
  const count = rows * cols;
  return Array(count).fill(null).map((_, i) => ({
    id: i,
    row: Math.floor(i / cols),
    col: i % cols,
    name: `${prefix} ${i + 1}`,
    audioBuffer: null,
    audioBlob: null,
    audioUrl: null,
    audioPath: null,
    synthType: null,
    color: '#c3ea2b',
    rgb: [195, 234, 43],
    pressEffect: null,
    mode: 'oneshot',
    volume: 1.0,
    isPlaying: false,
    activeNodes: []
  }));
}

const ipcRenderer = (typeof window !== 'undefined' && window.require) ? window.require('electron').ipcRenderer : (typeof require !== 'undefined' ? require('electron').ipcRenderer : null);

function getIconSvg(name, size = 16, strokeWidth = 2) {
  const s = size;
  const sw = strokeWidth;
  const icons = {
    play: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    headphones: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`,
    volume: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
    radio: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`,
    bot: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="6" rx="2"></rect><circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><path d="M12 2v4M2 12h1M21 12h1"></path></svg>`,
    zap: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    cpu: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"></path></svg>`,
    usb: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="19" r="2"></circle><path d="M12 17V7"></path><circle cx="6" cy="10" r="1.5"></circle><path d="m12 14-4-2"></path><rect x="16.5" y="8.5" width="3" height="3" rx="0.5"></rect><path d="m12 11 4-2"></path><path d="M10 7h4v3h-4z"></path></svg>`,
    mic: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>`,
    alert: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    error: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    search: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    music: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    x: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    info: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };
  return icons[name] || icons.info;
}

const state = {
  gridType: '8x8',
  gridRows: 8,
  gridCols: 8,
  gridPadCount: 64,
  gridProfiles: {},
  appMode: 'live',
  selectedPadIndex: 0,
  masterVolume: 1.0,
  currentBankId: 'capa_1',
  bankOrder: ['capa_1'],
  bankNames: { 'capa_1': 'Capa 1' },
  botDiscord: {
    ws: null,
    connected: false,
    online: false,
    botUser: null,
    inVoice: false,
    channelName: null,
    guildName: null,
    volume: 1.0,
    reconnectTimer: null,
    heartbeatTimer: null,
    hasShownInitialToast: false,
    vpsUrl: localStorage.getItem('soundboard_bot_vps_url') || 'ws://localhost:3002',
    secretKey: localStorage.getItem('soundboard_bot_secret_key') || 'launchpad2026',
    voiceChannels: [],
    uploadedSounds: new Set()
  },
  banks: {
    'capa_1': createEmptyBank('Pad', 8, 8)
  },
  selectedHeadphonesId: 'default',
  selectedDiscordId: 'default',
  muteLocalOnDiscord: true,
  pressEffect: 1,
  idleEffect: 11,
  blendMode: 0,
  fnKeyEnabled: true,
  bankSettings: {},
  lastActivityTime: Date.now(),
  serialPort: null,
  serialReader: null,
  isConnected: false
};

function syncLayerInfoToHardware() {
  if (!state.isConnected || !state.serialPort) return;
  const total = Math.min(state.gridCols || 8, (state.bankOrder && state.bankOrder.length) || 1);
  const currentIdx = Math.max(0, (state.bankOrder || []).indexOf(state.currentBankId));
  const fnEn = state.fnKeyEnabled ? 1 : 0;
  sendSerial(`L ${total} ${currentIdx} ${fnEn}`);
}

function recordActivity(wakeHardware = false) {
  state.lastActivityTime = Date.now();
  lastPreviewInteraction = performance.now();
  if (wakeHardware && state.isConnected && state.serialPort) {
    sendSerial('W');
  }
}

function setAppMode(mode) {
  state.appMode = mode;
  const btnLive = document.getElementById('btn-mode-live');
  const btnEdit = document.getElementById('btn-mode-edit');
  const frame = document.getElementById('launchpad-frame');

  if (btnLive) btnLive.classList.toggle('active', mode === 'live');
  if (btnEdit) btnEdit.classList.toggle('active', mode === 'edit');
  if (frame) frame.classList.toggle('edit-mode', mode === 'edit');

  const batchCard = document.getElementById('batch-edit-card');

  if (batchCard) {
    batchCard.style.display = (mode === 'edit') ? 'block' : 'none';
  }

  if (mode === 'edit') {
    const tabInspector = document.getElementById('tab-inspector');
    const tabBtnInspector = document.querySelector('.tab-btn[data-tab="tab-inspector"]');
    if (tabInspector && !tabInspector.classList.contains('active')) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (tabBtnInspector) tabBtnInspector.classList.add('active');
      tabInspector.classList.add('active');
    }
  }

  if (mode === 'edit') {
    showToast('Modo Edición: Selecciona y edita sin reproducir sonido', 'edit');
  } else {
    showToast('Modo En Vivo: Los pads reproducen su sonido al pulsarlos', 'play');
  }
}

function setGridType(type, saveConfig = true) {
  if (type !== '8x8' && type !== '5x5') type = '8x8';

  if (!state.gridProfiles) {
    state.gridProfiles = {};
  }
  state.gridProfiles[state.gridType] = {
    currentBankId: state.currentBankId,
    bankOrder: [...(state.bankOrder || ['capa_1'])],
    bankNames: { ...(state.bankNames || { 'capa_1': 'Capa 1' }) },
    banks: state.banks
  };

  state.gridType = type;
  state.gridRows = (type === '5x5') ? 5 : 8;
  state.gridCols = (type === '5x5') ? 5 : 8;
  state.gridPadCount = state.gridRows * state.gridCols;

  if (state.gridProfiles[type] && state.gridProfiles[type].banks) {
    const profile = state.gridProfiles[type];
    state.currentBankId = profile.currentBankId || 'capa_1';
    state.bankOrder = (profile.bankOrder && profile.bankOrder.length > 0) ? profile.bankOrder : ['capa_1'];
    state.bankNames = profile.bankNames || { 'capa_1': 'Capa 1' };
    state.banks = profile.banks;
  }
  else {
    const initialBankId = 'capa_1';
    state.currentBankId = initialBankId;
    state.bankOrder = [initialBankId];
    state.bankNames = { [initialBankId]: 'Capa 1' };
    state.banks = {
      [initialBankId]: createEmptyBank('Pad', state.gridRows, state.gridCols)
    };
    state.gridProfiles[type] = {
      currentBankId: state.currentBankId,
      bankOrder: [...state.bankOrder],
      bankNames: { ...state.bankNames },
      banks: state.banks
    };
  }

  const btn8 = document.getElementById('btn-grid-8x8');
  const btn5 = document.getElementById('btn-grid-5x5');
  const btnCopy = document.getElementById('btn-copy-from-8x8');

  if (btn8) btn8.classList.toggle('active', type === '8x8');
  if (btn5) btn5.classList.toggle('active', type === '5x5');
  if (btnCopy) btnCopy.style.display = (type === '5x5') ? 'inline-flex' : 'none';

  const hwLabel = document.getElementById('hardware-model-label');

  if (hwLabel) {
    hwLabel.textContent = (type === '5x5') ? 'LAUNCHPAD 5X5 MINI' : 'LAUNCHPAD 8X8 PRO';
  }

  const batchPadCountLabel = document.getElementById('batch-pad-count-label');

  if (batchPadCountLabel) {
    batchPadCountLabel.textContent = state.gridPadCount;
  }

  const gridEl = document.getElementById('pads-grid');

  if (gridEl) {
    gridEl.classList.toggle('grid-5x5', type === '5x5');
    gridEl.style.setProperty('--grid-cols', state.gridCols);
    gridEl.style.setProperty('--grid-rows', state.gridRows);
  }

  if (state.selectedPadIndex >= state.gridPadCount) {
    state.selectedPadIndex = 0;
  }

  resizeCanvas();
  renderBankPills();
  renderGrid();
  selectPad(state.selectedPadIndex);

  if (saveConfig) {
    saveSoundboardConfigDebounced(300);
  }

  if (state.isConnected) {
    syncAllPadsToHardware();
    syncLayerInfoToHardware();
    const txt = document.getElementById('connection-text');
    if (txt) txt.textContent = (type === '5x5') ? 'LAUNCHPAD 5X5 CONECTADO' : 'LAUNCHPAD 8X8 CONECTADO';
  }

  if (typeof syncAllGlobalHotkeys === 'function') {
    syncAllGlobalHotkeys();
  }

  showToast(`Matriz cambiada a ${type} (${state.gridPadCount} Pads)`, 'refresh');
}

function copyFrom8x8To5x5() {
  const profile8 = state.gridProfiles && state.gridProfiles['8x8'];

  if (!profile8 || !profile8.banks) {
    showToast('No se encontró configuración 8x8 previa para copiar', 'alert');
    return;
  }

  const sourceBank = profile8.banks[profile8.currentBankId] || profile8.banks['capa_1'];

  if (!sourceBank) return;

  const current5 = currentPads();
  let copiedCount = 0;

  for (let i = 0; i < 25; i++) {
    const src = sourceBank[i];

    if (src && (src.audioPath || src.synthType || src.audioBuffer || src.name !== `Pad ${i + 1}`)) {
      current5[i].name = src.name;
      current5[i].color = src.color;
      current5[i].rgb = src.rgb ? [...src.rgb] : hexToRgb(src.color);
      current5[i].mode = src.mode;
      current5[i].volume = src.volume;
      current5[i].pressEffect = src.pressEffect;
      current5[i].audioPath = src.audioPath;
      current5[i].audioBlob = src.audioBlob;
      current5[i].audioBuffer = src.audioBuffer;
      current5[i].synthType = src.synthType;
      copiedCount++;
    }
  }

  renderGrid();
  selectPad(state.selectedPadIndex);
  saveSoundboardConfigDebounced(300);
  showToast(`¡${copiedCount} sonidos copiados desde 8x8 a 5x5!`, 'check');
}

function applyPressEffectToAllPads(effectVal, onlyWithAudio = false) {
  const pads = currentPads();
  const eff = (effectVal === 'default' || effectVal === null || effectVal === undefined)
    ? null
    : parseInt(effectVal, 10);

  let updatedCount = 0;
  pads.forEach((pad) => {
    const hasAudio = !!(pad.audioPath || pad.audioBuffer || pad.synthType);
    if (!onlyWithAudio || hasAudio) {
      pad.pressEffect = eff;
      updatedCount++;
    }
  });

  if (updatedCount === 0) {
    showToast('No hay pads con audio cargado. Desmarca la casilla para aplicar a todos.', 'alert');
    return;
  }

  const padPressSelect = document.getElementById('select-pad-press-effect');

  if (padPressSelect && pads[state.selectedPadIndex]) {
    const curEff = pads[state.selectedPadIndex].pressEffect;
    padPressSelect.value = (curEff !== undefined && curEff !== null) ? String(curEff) : 'default';
  }

  const batchPressSelect = document.getElementById('select-batch-press-effect');

  if (batchPressSelect) {
    batchPressSelect.value = (eff !== null) ? String(eff) : 'default';
  }

  saveSoundboardConfig();

  let effName = 'Global (Predeterminado)';

  if (eff !== null && typeof PRESS_EFFECTS_META !== 'undefined') {
    const meta = PRESS_EFFECTS_META.find(m => m.id === eff);
    effName = meta ? meta.name : `Efecto #${eff}`;
  }

  showToast(`¡Efecto "${effName}" aplicado a ${updatedCount} pads!`, 'magic');
}

function applyPlaybackModeToAllPads(modeVal, onlyWithAudio = false) {
  const pads = currentPads();
  let updatedCount = 0;

  pads.forEach((pad, idx) => {
    const hasAudio = !!(pad.audioPath || pad.audioBuffer || pad.synthType);
    if (!onlyWithAudio || hasAudio) {
      pad.mode = modeVal;
      updatePadVisual(idx);
      updatedCount++;
    }
  });

  if (updatedCount === 0) {
    showToast('No hay pads con audio cargado. Desmarca la casilla para aplicar a todos.', 'alert');
    return;
  }

  const modeSelect = document.getElementById('select-playback-mode');

  if (modeSelect && pads[state.selectedPadIndex]) {
    modeSelect.value = pads[state.selectedPadIndex].mode;
  }

  const batchModeSelect = document.getElementById('select-batch-playback-mode');

  if (batchModeSelect) {
    batchModeSelect.value = modeVal;
  }

  saveSoundboardConfig();

  const modeLabels = {
    'oneshot': 'One-Shot',
    'toggle': 'Toggle',
    'hold': 'Hold',
    'loop': 'Loop'
  };
  const label = modeLabels[modeVal] || modeVal;
  showToast(`¡Modo "${label}" aplicado a ${updatedCount} pads!`, 'check');
}

let _savedBadgeTimer = null;
function showVolumeSavedBadge() {
  const badge = document.getElementById('pad-vol-saved-badge');
  if (!badge) return;
  badge.innerHTML = `${getIconSvg('check', 11, 2.5)} Guardado`;
  badge.classList.add('visible');
  if (_savedBadgeTimer) clearTimeout(_savedBadgeTimer);
  _savedBadgeTimer = setTimeout(() => {
    badge.classList.remove('visible');
  }, 1500);
}

function updatePadVolume(padIndex, volumePercent, saveDebounced = true) {
  const pad = currentPads()[padIndex];
  if (!pad) return;

  const safePct = Math.max(0, Math.min(volumePercent, 200));
  pad.volume = safePct / 100;

  const slider = document.getElementById('slider-pad-volume');

  if (slider && parseInt(slider.value, 10) !== safePct) {
    slider.value = safePct;
  }

  const label = document.getElementById('pad-vol-label');

  if (label) {
    label.textContent = `${safePct}%`;
  }

  document.querySelectorAll('.btn-vol-preset').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.vol, 10) === safePct);
  });

  if (pad.activeNodes) {
    const targetGain = pad.volume * state.masterVolume;
    if (pad.activeNodes.gainH && pad.activeNodes.gainH.gain) {
      pad.activeNodes.gainH.gain.value = targetGain;
    }
    if (pad.activeNodes.gainD && pad.activeNodes.gainD.gain) {
      pad.activeNodes.gainD.gain.value = targetGain;
    }
  }

  if (saveDebounced) {
    saveSoundboardConfigDebounced(300);
  }
}

const PALETTE_COLORS = [
  { name: 'Electric Lime', hex: '#c3ea2b', rgb: [195, 234, 43] },
  { name: 'Cyan', hex: '#00f0ff', rgb: [0, 240, 255] },
  { name: 'Purple', hex: '#9d00ff', rgb: [157, 0, 255] },
  { name: 'Neon Green', hex: '#00ff88', rgb: [0, 255, 136] },
  { name: 'Hot Pink', hex: '#ff007b', rgb: [255, 0, 123] },
  { name: 'Yellow', hex: '#ffd000', rgb: [255, 208, 0] },
  { name: 'Coral Red', hex: '#ff334b', rgb: [255, 51, 75] },
  { name: 'Electric Blue', hex: '#0077ff', rgb: [0, 119, 255] },
  { name: 'Lime', hex: '#bfff00', rgb: [191, 255, 0] },
  { name: 'Orange', hex: '#ff8800', rgb: [255, 136, 0] },
  { name: 'Teal', hex: '#00e5ff', rgb: [0, 229, 255] },
  { name: 'Magenta', hex: '#e000ff', rgb: [224, 0, 255] },
  { name: 'Mint', hex: '#00ffcc', rgb: [0, 255, 204] },
  { name: 'Warm White', hex: '#ffffff', rgb: [255, 255, 255] },
  { name: 'Sky Blue', hex: '#38bdf8', rgb: [56, 189, 248] },
  { name: 'Indigo', hex: '#6366f1', rgb: [99, 102, 241] },
  { name: 'Gold', hex: '#fbbf24', rgb: [251, 191, 36] }
];

let audioCtx = null;

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function getHwLedIndex(row, screenCol) {
  const cols = state.gridCols || 8;
  const hwCol = (cols - 1) - screenCol;
  if (row % 2 === 0) {
    return (row * cols) + ((cols - 1) - hwCol);
  } else {
    return (row * cols) + hwCol;
  }
}

function currentPads() {
  return state.banks[state.currentBankId];
}

async function initAppVersionBadge() {
  const badge = document.getElementById('app-version-badge');
  if (!badge) return;

  try {
    const res = await fetch('version.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        badge.textContent = `v${data.version}`;
        return;
      }
    }
  } catch (e) { }

  if (ipcRenderer) {
    try {
      const v = await ipcRenderer.invoke('get-app-version');
      if (v) badge.textContent = `v${v}`;
    } catch (e) { }
  }
}

let updateInfoCache = null;

async function initAutoUpdaterEngine() {
  if (!ipcRenderer) return;

  const btnUpdate = document.getElementById('btn-update-available');
  const badgeText = document.getElementById('update-badge-text');
  const modal = document.getElementById('modal-app-update');
  const btnClose = document.getElementById('btn-close-update-modal');
  const btnLater = document.getElementById('btn-update-later');
  const btnGithub = document.getElementById('btn-update-view-github');
  const btnInstall = document.getElementById('btn-update-install-now');
  const titleEl = document.getElementById('update-modal-title');
  const notesEl = document.getElementById('update-modal-notes');
  const progressSec = document.getElementById('update-progress-section');
  const progressBar = document.getElementById('update-progress-bar');
  const progressPct = document.getElementById('update-progress-pct');
  const progressStatus = document.getElementById('update-progress-status');

  const closeUpdateModal = () => {
    if (modal) modal.classList.remove('modal-active');
  };

  if (btnClose) btnClose.addEventListener('click', closeUpdateModal);
  if (btnLater) btnLater.addEventListener('click', closeUpdateModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeUpdateModal();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('modal-active')) {
      closeUpdateModal();
    }
  });

  if (btnGithub) {
    btnGithub.addEventListener('click', async () => {
      const url = updateInfoCache?.releaseHtmlUrl;
      await ipcRenderer.invoke('open-release-url', url);
    });
  }

  if (btnUpdate) {
    btnUpdate.addEventListener('click', () => {
      if (!updateInfoCache) return;
      if (titleEl) titleEl.textContent = `LAUNCHPAD STUDIO PRO V${updateInfoCache.latestVersion}`;
      if (notesEl) {
        notesEl.textContent = updateInfoCache.releaseNotes || 'No hay notas detalladas para esta version.';
      }
      if (progressSec) progressSec.style.display = 'none';
      if (btnInstall) {
        btnInstall.disabled = false;
        btnInstall.textContent = updateInfoCache.updateAssetUrl ? 'ACTUALIZAR Y REINICIAR' : 'DESCARGAR DESDE GITHUB';
      }
      if (modal) modal.classList.add('modal-active');
    });
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!updateInfoCache) return;

      const downloadTarget = updateInfoCache.updateAssetUrl;
      if (!downloadTarget) {
        await ipcRenderer.invoke('open-release-url', updateInfoCache.releaseHtmlUrl);
        return;
      }

      btnInstall.disabled = true;
      if (btnLater) btnLater.disabled = true;
      if (btnClose) btnClose.disabled = true;
      if (progressSec) progressSec.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPct) progressPct.textContent = '0%';
      if (progressStatus) progressStatus.textContent = 'Descargando actualizacion...';

      const res = await ipcRenderer.invoke('apply-app-update', downloadTarget);
      if (!res.success) {
        if (progressStatus) progressStatus.textContent = `Error: ${res.error || 'Fallo al aplicar'}`;
        btnInstall.disabled = false;
        if (btnLater) btnLater.disabled = false;
        if (btnClose) btnClose.disabled = false;
      } else {
        if (progressStatus) progressStatus.textContent = 'Actualizacion completada. Reiniciando...';
        if (progressBar) progressBar.style.width = '100%';
        if (progressPct) progressPct.textContent = '100%';
      }
    });
  }

  ipcRenderer.on('update-download-progress', (event, data) => {
    if (progressBar) progressBar.style.width = `${data.percent}%`;
    if (progressPct) progressPct.textContent = `${data.percent}%`;
    if (progressStatus) {
      const mbDl = (data.dl / (1024 * 1024)).toFixed(1);
      const mbTot = (data.total / (1024 * 1024)).toFixed(1);
      progressStatus.textContent = `Descargando: ${mbDl}MB de ${mbTot}MB...`;
    }
  });

  setTimeout(async () => {
    try {
      const info = await ipcRenderer.invoke('check-app-update');
      if (info && info.updateAvailable) {
        updateInfoCache = info;
        if (badgeText) badgeText.textContent = `v${info.latestVersion} DISPONIBLE`;
        if (btnUpdate) btnUpdate.style.display = 'inline-flex';
      }
    } catch (e) { }
  }, 2000);
}

function initOnboardingWizardEngine() {
  const wizardModal = document.getElementById('modal-onboarding-wizard');
  if (!wizardModal) return;

  const stepDots = wizardModal.querySelectorAll('.step-dot');
  const stepContents = [
    document.getElementById('onboarding-step-1'),
    document.getElementById('onboarding-step-2'),
    document.getElementById('onboarding-step-3')
  ];
  const btnPrev = document.getElementById('btn-wizard-prev');
  const btnNext = document.getElementById('btn-wizard-next');
  const btnSkip = document.getElementById('btn-wizard-skip');
  const optVps = document.getElementById('opt-mode-vps');
  const optLocal = document.getElementById('opt-mode-local');
  const inputUrl = document.getElementById('wizard-input-url');
  const inputToken = document.getElementById('wizard-input-token');
  const testUrlLabel = document.getElementById('wizard-test-url-label');
  const testStatus = document.getElementById('wizard-test-status');
  const btnTest = document.getElementById('btn-wizard-test-connection');

  const liveStatusStep2 = document.getElementById('wizard-step2-live-status');
  let activeTestWs = null;
  let liveCheckTimer = null;

  const runLiveTest = (targetUrl, targetSecret, statusEl) => {
    if (!statusEl) return;
    if (activeTestWs) {
      try { activeTestWs.close(); } catch (e) { }
      activeTestWs = null;
    }

    const cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl || cleanUrl === 'ws://tu-ip-o-dominio:3002') {
      statusEl.className = 'test-status-area';
      statusEl.textContent = 'Ingresa una direccion valida para verificar';
      return;
    }

    statusEl.className = 'test-status-area checking';
    statusEl.textContent = 'Comprobando respuesta de ' + cleanUrl + '...';

    try {
      const ws = new WebSocket(cleanUrl);
      activeTestWs = ws;
      let settled = false;

      const timeoutTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { ws.close(); } catch (e) { }
          if (activeTestWs === ws) activeTestWs = null;
          statusEl.className = 'test-status-area error';
          statusEl.textContent = 'Sin respuesta del Bot (servidor no disponible)';
        }
      }, 3500);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'auth',
          token: (targetSecret || '').trim()
        }));
      };

      ws.onmessage = (event) => {
        if (settled) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'auth_error') {
            settled = true;
            clearTimeout(timeoutTimer);
            try { ws.close(); } catch (e) { }
            if (activeTestWs === ws) activeTestWs = null;
            statusEl.className = 'test-status-area error';
            statusEl.textContent = 'Servidor activo, pero clave secreta incorrecta';
          } else if (msg.type === 'auth_ok' || msg.type === 'status' || msg.type === 'voice_channels') {
            settled = true;
            clearTimeout(timeoutTimer);
            try { ws.close(); } catch (e) { }
            if (activeTestWs === ws) activeTestWs = null;
            statusEl.className = 'test-status-area success';
            const botTag = msg.botUser ? ` (Bot: ${msg.botUser})` : '';
            statusEl.textContent = 'Conexion exitosa con el Bot' + botTag;
          }
        } catch (e) { }
      };

      ws.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        if (activeTestWs === ws) activeTestWs = null;
        statusEl.className = 'test-status-area error';
        statusEl.textContent = 'No se pudo conectar a ' + cleanUrl;
      };
    } catch (err) {
      statusEl.className = 'test-status-area error';
      statusEl.textContent = 'Error: ' + err.message;
    }
  };

  const scheduleLiveCheck = (delay = 400) => {
    if (liveCheckTimer) clearTimeout(liveCheckTimer);
    liveCheckTimer = setTimeout(() => {
      const url = (inputUrl && inputUrl.value.trim()) || '';
      const secret = (inputToken && inputToken.value.trim()) || '';
      const targetEl = (currentStep === 2) ? liveStatusStep2 : testStatus;
      runLiveTest(url, secret, targetEl);
    }, delay);
  };

  let currentStep = 1;

  const updateStepUI = (step) => {
    currentStep = step;
    stepContents.forEach((el, idx) => {
      if (el) el.style.display = (idx + 1 === step) ? 'block' : 'none';
    });

    stepDots.forEach((dot, idx) => {
      const sNum = idx + 1;
      dot.classList.toggle('active', sNum === step);
      dot.classList.toggle('completed', sNum < step);
    });

    if (btnPrev) btnPrev.style.display = (step > 1) ? 'inline-flex' : 'none';
    if (btnNext) btnNext.textContent = (step === 3) ? 'FINALIZAR Y COMENZAR' : 'CONTINUAR';

    if (step === 2) {
      scheduleLiveCheck(100);
    }

    if (step === 3 && testUrlLabel && inputUrl) {
      const urlVal = inputUrl.value.trim() || 'ws://localhost:3002';
      testUrlLabel.textContent = urlVal;
      runLiveTest(urlVal, (inputToken && inputToken.value.trim()) || '', testStatus);
    }
  };

  if (optVps && optLocal && inputUrl) {
    optVps.addEventListener('click', () => {
      optVps.classList.add('active');
      optLocal.classList.remove('active');
      if (inputUrl.value === 'ws://localhost:3002' || !inputUrl.value.trim()) {
        inputUrl.value = 'ws://tu-ip-o-dominio:3002';
      }
      scheduleLiveCheck(100);
    });

    optLocal.addEventListener('click', () => {
      optLocal.classList.add('active');
      optVps.classList.remove('active');
      inputUrl.value = 'ws://localhost:3002';
      scheduleLiveCheck(100);
    });
  }

  if (inputUrl) {
    inputUrl.addEventListener('input', () => scheduleLiveCheck(500));
  }
  if (inputToken) {
    inputToken.addEventListener('input', () => scheduleLiveCheck(500));
  }

  if (btnTest) {
    btnTest.addEventListener('click', () => {
      const url = (inputUrl && inputUrl.value.trim()) || 'ws://localhost:3002';
      const secret = (inputToken && inputToken.value.trim()) || '';
      runLiveTest(url, secret, testStatus);
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) updateStepUI(currentStep - 1);
    });
  }

  const finishWizard = () => {
    const finalUrl = (inputUrl && inputUrl.value.trim()) || 'ws://localhost:3002';
    const finalToken = (inputToken && inputToken.value.trim()) || 'launchpad2026';

    state.botDiscord.vpsUrl = finalUrl;
    state.botDiscord.secretKey = finalToken;
    localStorage.setItem('soundboard_bot_vps_url', finalUrl);
    localStorage.setItem('soundboard_bot_secret_key', finalToken);
    localStorage.setItem('soundboard_setup_completed', 'true');

    const mainInputUrl = document.getElementById('input-bot-vps-url');
    const mainInputToken = document.getElementById('input-bot-vps-token');
    if (mainInputUrl) mainInputUrl.value = finalUrl;
    if (mainInputToken) mainInputToken.value = finalToken;

    wizardModal.style.display = 'none';
    showToast('Configuracion guardada. Conectando al Bot...', 'check');

    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('save-vps-credentials', {
          vpsUrl: finalUrl,
          secretKey: finalToken,
          setupCompleted: true
        });
      } catch (e) { }
    }

    initBotDiscordWebSocket();
  };

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (currentStep < 3) {
        updateStepUI(currentStep + 1);
      } else {
        finishWizard();
      }
    });
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', () => {
      localStorage.setItem('soundboard_setup_completed', 'true');
      wizardModal.style.display = 'none';
    });
  }

  const checkWizardTrigger = async () => {
    try {
      const res = await fetch('vps_default.json');

      if (res.ok) {
        const d = await res.json();

        if (d && (d.isPreconfigured || d.vpsUrl)) {
          return;
        }
      }
    }
    catch (e) { }

    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const resCreds = await ipcRenderer.invoke('load-vps-credentials');

        if (resCreds && resCreds.success && resCreds.credentials && resCreds.credentials.setupCompleted) {
          const loadedUrl = resCreds.credentials.vpsUrl || 'ws://localhost:3002';
          const loadedSecret = resCreds.credentials.secretKey || 'launchpad2026';
          state.botDiscord.vpsUrl = loadedUrl;
          state.botDiscord.secretKey = loadedSecret;
          localStorage.setItem('soundboard_bot_vps_url', loadedUrl);
          localStorage.setItem('soundboard_bot_secret_key', loadedSecret);
          localStorage.setItem('soundboard_setup_completed', 'true');
          const mainInputUrl = document.getElementById('input-bot-vps-url');
          const mainInputToken = document.getElementById('input-bot-vps-token');
          if (mainInputUrl) mainInputUrl.value = loadedUrl;
          if (mainInputToken) mainInputToken.value = loadedSecret;
          initBotDiscordWebSocket();

          return;
        }
      }
      catch (e) { }
    }

    if (localStorage.getItem('soundboard_setup_completed') === 'true' || new URLSearchParams(window.location.search).get('no_wizard') === '1') {
      return;
    }

    updateStepUI(1);
    wizardModal.style.display = 'flex';
  };

  checkWizardTrigger();
}

document.addEventListener('DOMContentLoaded', async () => {
  initAppVersionBadge();
  initAutoUpdaterEngine();
  initAudioEngine();
  initCanvasEngine();
  renderPalette();
  renderGrid();
  renderBankPills();
  selectPad(0);

  initAudioVisualizerEngine();
  initBatchDragAndDropEngine();
  initObsWebSocketEngine();
  initGlobalHotkeysEngine();
  initSoundpackEngine();
  initOnboardingWizardEngine();
  initAudioTrimmerEngine();

  try {
    await populateAudioOutputs();
  }
  catch (err) {
    console.warn('Nota audio outputs:', err);
  }

  setupEventListeners();

  try {
    await loadOrInitSoundboard();
  }
  catch (err) {
    console.error('Error cargando soundboard:', err);
  }

  setupSerialHotPlug();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('no_wizard') === '1') {
    const wizardModal = document.getElementById('modal-onboarding-wizard');
    if (wizardModal) wizardModal.style.display = 'none';
  }
  const targetTab = urlParams.get('tab');
  if (targetTab) {
    setTimeout(() => {
      const btn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
      if (btn) btn.click();
    }, 400);
  }

  setTimeout(async () => {
    if (!state.isConnected) {
      await autoDetectLaunchpad();
    }

    if (!state.isConnected) {
      try {
        await connectLaunchpadHardware();
      } catch (e) { }
    }
  }, 500);
});

let canvas = null;
let ctx = null;
let lightParticles = [];
let idleTime = 0;

function initCanvasEngine() {
  canvas = document.getElementById('lightshow-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(loopCanvas);
}

function resizeCanvas() {
  if (!canvas || !canvas.parentElement) return;

  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}

function drawSiliconePadRect(context, coords, r = 4) {
  const w = coords.padW * 0.96;
  const h = coords.padH * 0.96;
  const x = coords.x - w / 2;
  const y = coords.y - h / 2;

  if (context.roundRect) {
    context.roundRect(x, y, w, h, r);
  }
  else {
    context.rect(x, y, w, h);
  }
}

const drawKeycapRect = drawSiliconePadRect;

function getPadCanvasCoords(row, col, cachedCanvasRect = null) {
  if (!canvas) return { x: 0, y: 0, padW: 0, padH: 0 };

  const cols = state.gridCols || 8;
  const index = row * cols + col;
  const padEl = document.getElementById(`pad-${index}`);
  if (padEl && canvas) {
    const padRect = padEl.getBoundingClientRect();
    const canvasRect = cachedCanvasRect || canvas.getBoundingClientRect();
    if (canvasRect.width > 0 && canvasRect.height > 0) {
      const padW = padRect.width;
      const padH = padRect.height;
      const x = (padRect.left - canvasRect.left) + padW / 2;
      const y = (padRect.top - canvasRect.top) + padH / 2;
      return { x, y, padW, padH };
    }
  }

  const rows = state.gridRows || 8;
  const gap = (cols === 5) ? 8 : 5;
  const gridW = canvas.width;
  const gridH = canvas.height;
  const padW = (gridW - (gap * (cols - 1))) / cols;
  const padH = (gridH - (gap * (rows - 1))) / rows;
  const x = (col * (padW + gap)) + (padW / 2);
  const y = (row * (padH + gap)) + (padH / 2);

  return { x, y, padW, padH };
}

let activeMainGridEffects = [];
let mainGridParticles = [];

function computePressEffectIntensity(eff, r, c, rows, cols, nowTime = null) {
  const now = nowTime || performance.now();
  const rawT = (now - eff.startTime) / (eff.duration || 900);
  const t = Math.max(0, Math.min(1, isNaN(rawT) ? 0 : rawT));
  const dr = r - eff.r;
  const dc = c - eff.c;
  const dist = Math.hypot(dr, dc);

  let intensity = 0;
  let col = eff.color;

  switch (eff.id) {
    case 0: {
      const radPoint = cols === 5 ? 0.65 : 0.7;
      const radSpread = cols === 5 ? 1.5 : 1.9;
      if (dist < radPoint) intensity = Math.max(0, 1 - t * 2.5);
      else if (dist < radSpread) intensity = Math.max(0, 0.45 * (1 - dist / radSpread) * (1 - t * 2));
      col = '#ffffff';
      break;
    }

    case 1: {
      const maxWaveR = cols === 5 ? 6.2 : 9.5;
      const waveR = t * maxWaveR;
      const diff = Math.abs(dist - waveR);
      if (diff < 1.3) intensity = Math.max(0, (1 - diff / 1.3) * (1 - t * 0.8));
      break;
    }

    case 2: {
      const inCross = Math.abs(dr) < 0.6 || Math.abs(dc) < 0.6;
      const laserDist = Math.max(Math.abs(dr), Math.abs(dc));
      const maxLaser = cols === 5 ? 6.2 : 10.0;
      if (inCross && laserDist <= t * maxLaser) {
        intensity = Math.max(0, (1 - t * 0.95));
      }
      break;
    }

    case 3: {
      const maxStarR = cols === 5 ? 5.2 : 8.0;
      const starR = t * maxStarR;
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      const ptAngle = (Math.atan2(dr, dc) * 180 / Math.PI + 360) % 360;
      for (const a of angles) {
        let diffA = Math.abs(ptAngle - a);
        if (diffA > 180) diffA = 360 - diffA;
        if (diffA < 18 && Math.abs(dist - starR) < 1.2) {
          intensity = Math.max(0, (1 - diffA / 18) * (1 - Math.abs(dist - starR) / 1.2) * (1 - t));
          break;
        }
      }
      break;
    }

    case 4: {
      const flicker = Math.sin(t * 35 + (eff.seed || 0.5) * 20) > 0.0;
      const maxSparkDist = cols === 5 ? 2.5 : 3.8;
      if (flicker && (dist < maxSparkDist)) {
        const hash = Math.sin(r * 12.9898 + c * 78.233 + Math.floor(t * 12)) * 43758.5453;
        if ((hash - Math.floor(hash)) > 0.55) {
          intensity = Math.max(0, (1 - t * 0.8));
        }
      }
      break;
    }

    case 5: {
      const manhattan = Math.abs(dr) + Math.abs(dc);
      const maxDiaR = cols === 5 ? 8.2 : 12.5;
      const diaR = t * maxDiaR;
      const diff = Math.abs(manhattan - diaR);
      if (diff < 1.2) intensity = Math.max(0, (1 - diff / 1.2) * (1 - t * 0.85));
      break;
    }

    case 6: {
      const maxFireR = cols === 5 ? 5.8 : 9.0;
      const waveR = t * maxFireR;
      const diff = Math.abs(dist - waveR);
      if (diff < 1.4) {
        intensity = Math.max(0, (1 - diff / 1.4) * (1 - t * 0.85));
        col = t < 0.4 ? '#ffcc00' : '#ff4500';
      }
      break;
    }

    case 7: {
      const angle = Math.atan2(dr, dc);
      const maxSpiral = cols === 5 ? 5.2 : 8.0;
      const expectedDist = ((angle + t * Math.PI * 5 + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2) * maxSpiral;
      const diff = Math.abs(dist - expectedDist);
      if (diff < 1.4) intensity = Math.max(0, (1 - diff / 1.4) * (1 - t * 0.9));
      break;
    }

    case 8: {
      const maxShockR = cols === 5 ? 6.4 : 10.0;
      const r1 = t * maxShockR;
      const r2 = Math.max(0, (t - 0.22) * maxShockR);
      const diff1 = Math.abs(dist - r1);
      const diff2 = Math.abs(dist - r2);
      let p1 = diff1 < 1.2 ? Math.max(0, (1 - diff1 / 1.2) * (1 - t)) : 0;
      let p2 = diff2 < 1.2 ? Math.max(0, (1 - diff2 / 1.2) * (1 - t)) : 0;
      intensity = Math.max(p1, p2);
      break;
    }

    case 9: {
      const maxRainR = cols === 5 ? 5.8 : 9.0;
      const waveR = t * maxRainR;
      const diff = Math.abs(dist - waveR);
      if (diff < 1.3) {
        intensity = Math.max(0, (1 - diff / 1.3) * (1 - t * 0.85));
        const hue = Math.round((t * 360 + Math.atan2(dr, dc) * (180 / Math.PI) + 360) % 360);
        col = `hsl(${hue}, 100%, 65%)`;
      }
      break;
    }

    case 10: {
      const maxW1 = cols === 5 ? 4.8 : 7.5;
      const maxW2 = cols === 5 ? 7.2 : 11.0;
      const wave1 = t * maxW1;
      const wave2 = t * maxW2;
      const d1 = Math.abs(dist - wave1);
      const d2 = Math.abs(dist - wave2);
      const coreRad = cols === 5 ? 1.0 : 1.5;
      const pCore = (dist < coreRad && t < 0.35) ? (1 - t / 0.35) : 0;
      const p1 = d1 < 1.2 ? (1 - d1 / 1.2) * (1 - t) : 0;
      const p2 = d2 < 1.2 ? (1 - d2 / 1.2) * (1 - t) : 0;
      intensity = Math.max(pCore, Math.max(p1, p2));
      col = t < 0.25 ? '#ffffff' : '#facc15';
      break;
    }

    case 11: {
      const angle = Math.atan2(dr, dc);
      const maxArm = cols === 5 ? 5.2 : 8.0;
      const arm1 = ((angle + t * 10) % (Math.PI * 2)) / (Math.PI * 2) * maxArm;
      const arm2 = ((angle + Math.PI + t * 10) % (Math.PI * 2)) / (Math.PI * 2) * maxArm;
      const diff1 = Math.abs(dist - arm1);
      const diff2 = Math.abs(dist - arm2);
      const p1 = diff1 < 1.3 ? (1 - diff1 / 1.3) * (1 - t) : 0;
      const p2 = diff2 < 1.3 ? (1 - diff2 / 1.3) * (1 - t) : 0;
      intensity = Math.max(p1, p2);
      break;
    }

    case 12: {
      const seed = (eff.seed || 0.5) * 50;
      const maxArcDist = cols === 5 ? 2.8 : 4.2;
      const inArc = ((Math.sin(dist * 3.5 + t * 25 + seed) > 0.4) && dist < maxArcDist);
      if (inArc) {
        intensity = Math.max(0, (1 - t * 0.9));
        col = (t * 20 % 2 > 1) ? '#ffffff' : '#38bdf8';
      }
      break;
    }
  }

  return { intensity, color: col };
}

function triggerLightEffect(row, col, colorHex = '#00f0ff', effectType = 1) {
  if (!canvas) return;

  const typeNum = parseInt(effectType);
  const color = colorHex || '#00f0ff';

  let dur = 900;
  if (typeNum === 0) dur = 380;
  else if (typeNum === 4 || typeNum === 12) dur = 650;
  else if (typeNum === 10 || typeNum === 11) dur = 1200;

  activeMainGridEffects.push({
    id: typeNum,
    r: row,
    c: col,
    startTime: performance.now(),
    duration: dur,
    color: color,
    seed: Math.random()
  });

  if (activeMainGridEffects.length > 8) activeMainGridEffects.shift();

  if (typeNum === 3 || typeNum === 10 || typeNum === 6 || typeNum === 4 || typeNum === 12) {
    const cols = state.gridCols || 8;
    const count = typeNum === 10 ? 24 : (typeNum === 3 ? 18 : 12);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = (cols === 5 ? 0.025 : 0.038) + Math.random() * (cols === 5 ? 0.03 : 0.045);
      mainGridParticles.push({
        x: col,
        y: row,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: typeNum === 6 ? (Math.random() > 0.5 ? '#ff3b00' : '#ffaa00') : color,
        size: (cols === 5 ? 3.5 : 2.8) + Math.random() * 2.5,
        life: 1.0,
        decay: (cols === 5 ? 0.024 : 0.018) + Math.random() * 0.022
      });
    }
  }
}

let lastCanvasLoopTime = performance.now();
let globalSimTime = 0;

function loopCanvas(timestamp) {
  if (!ctx || !canvas) {
    requestAnimationFrame(loopCanvas);
    return;
  }

  const now = timestamp || performance.now();
  const dt = Math.min(0.05, Math.max(0.001, (now - lastCanvasLoopTime) / 1000));
  lastCanvasLoopTime = now;
  globalSimTime += dt;

  const t = globalSimTime;
  const frameScale = dt * 60;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const maxR = state.gridRows || 8;
  const maxC = state.gridCols || 8;
  const centerR = (maxR - 1) / 2;
  const centerC = (maxC - 1) / 2;

  const idleNum = parseInt(state.idleEffect, 10);
  const blendMode = state.blendMode !== undefined ? parseInt(state.blendMode, 10) : 0;
  const currentBankPads = (state.banks && state.banks[state.currentBankId]) || [];
  const padBorderRadius = (maxC === 5) ? 6 : 4;
  const canvasRect = canvas.getBoundingClientRect();

  if (!isNaN(idleNum) && idleNum > 0) {
    for (let r = 0; r < maxR; r++) {
      for (let c = 0; c < maxC; c++) {
        const coords = getPadCanvasCoords(r, c, canvasRect);
        if (!coords || coords.padW === 0) continue;

        const padIdx = r * maxC + c;
        const padData = currentBankPads[padIdx];
        const isSoundPad = padData && (padData.audioPath || padData.synthType || padData.audioBuffer);

        const idleRgb = computeIdleLedColor(r, c, idleNum, now, maxR, maxC);
        const energy = (idleRgb[0] * 0.299 + idleRgb[1] * 0.587 + idleRgb[2] * 0.114) / 255.0;

        let alpha = 0;
        const baseR = idleRgb[0];
        const baseG = idleRgb[1];
        const baseB = idleRgb[2];

        const isScreensaver = (blendMode === 2) && ((Date.now() - (state.lastActivityTime || 0)) > 15000);

        if (isScreensaver) {
          // Fondo total inactivo (>15s): animacion cubre todos los pads
          alpha = Math.min(1.0, 0.16 + energy * 0.84);
        } else if (blendMode === 0 || blendMode === 2) {
          // Fusión Neón o Fondo total activo (<15s tras pulsar): resalta botones con sonido
          if (isSoundPad) {
            alpha = energy * 0.42;
          } else {
            alpha = Math.min(1.0, 0.10 + energy * 0.90);
          }
        } else if (blendMode === 1) {
          // Botones Puros: sound pads se mantienen intactos
          if (!isSoundPad) {
            alpha = Math.min(1.0, 0.10 + energy * 0.90);
          }
        }

        if (alpha > 0.02) {
          ctx.save();
          ctx.beginPath();
          drawSiliconePadRect(ctx, coords, padBorderRadius);
          ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;

          if (energy > 0.45) {
            ctx.shadowColor = `rgb(${baseR}, ${baseG}, ${baseB})`;
            ctx.shadowBlur = Math.min(20, energy * 18);
          }

          ctx.fill();

          if (energy > 0.25) {
            ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha * 0.65})`;
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }

          ctx.restore();
        }
      }
    }
  }


  activeMainGridEffects = activeMainGridEffects.filter(eff => (now - eff.startTime) < (eff.duration || 900));

  if (activeMainGridEffects.length > 0) {
    const padBorderRadius = (maxC === 5) ? 6 : 4;

    for (let r = 0; r < maxR; r++) {
      for (let c = 0; c < maxC; c++) {
        let effIntensity = 0;
        let effColor = null;

        for (const eff of activeMainGridEffects) {
          const res = computePressEffectIntensity(eff, r, c, maxR, maxC, now);
          if (res.intensity > effIntensity) {
            effIntensity = res.intensity;
            effColor = res.color;
          }
        }

        if (effIntensity > 0.03 && effColor) {
          const coords = getPadCanvasCoords(r, c);
          ctx.save();
          ctx.beginPath();
          drawSiliconePadRect(ctx, coords, padBorderRadius);
          ctx.fillStyle = effColor;
          ctx.globalAlpha = Math.min(1.0, effIntensity * 0.95);
          ctx.shadowColor = effColor;
          ctx.shadowBlur = Math.min(28, 20 * effIntensity);
          ctx.fill();

          if (effIntensity > 0.22) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.3;
            ctx.globalAlpha = Math.min(0.9, (effIntensity - 0.22) * 1.3);
            ctx.stroke();
          }

          ctx.restore();
        }
      }
    }
  }

  mainGridParticles = mainGridParticles.filter(p => p.life > 0.02);

  for (const p of mainGridParticles) {
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    p.life -= p.decay || 0.02;

    const clampedY = Math.max(0, Math.min(maxR - 1, Math.floor(p.y)));
    const clampedX = Math.max(0, Math.min(maxC - 1, Math.floor(p.x)));
    const baseCoords = getPadCanvasCoords(clampedY, clampedX);
    const gap = (maxC === 5) ? 8 : 5;
    const padW = baseCoords.padW;
    const padH = baseCoords.padH;
    const fracX = p.x - clampedX;
    const fracY = p.y - clampedY;
    const screenX = baseCoords.x + fracX * (padW + gap);
    const screenY = baseCoords.y + fracY * (padH + gap);
    const rad = Math.max(0.6, (p.size || 2.5) * p.life);

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, rad, 0, Math.PI * 2);
    ctx.fillStyle = p.color || '#C3EA2B';
    ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life));
    ctx.shadowBlur = 10 * p.life;
    ctx.shadowColor = p.color || '#C3EA2B';
    ctx.fill();
    ctx.restore();
  }

  requestAnimationFrame(loopCanvas);
}

let headphonesCtx = null;
let discordCtx = null;
let masterAudioAnalyser = null;
let masterBassEnergy = 0.0;

function initAudioEngine() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  headphonesCtx = audioCtx;
}

function getHeadphonesCtx() {
  if (!headphonesCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    headphonesCtx = new AudioContext();
  }
  if (headphonesCtx.state === 'suspended') {
    headphonesCtx.resume();
  }
  return headphonesCtx;
}

function getMasterAudioDestination() {
  const hCtx = getHeadphonesCtx();
  if (!masterAudioAnalyser) {
    masterAudioAnalyser = hCtx.createAnalyser();
    masterAudioAnalyser.fftSize = 256;
    masterAudioAnalyser.smoothingTimeConstant = 0.75;
  }
  return masterAudioAnalyser;
}

function getDiscordCtx() {
  if (!discordCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    discordCtx = new AudioContext();
  }
  if (discordCtx.state === 'suspended') {
    discordCtx.resume();
  }
  return discordCtx;
}

async function setHeadphonesDevice(deviceId) {
  state.selectedHeadphonesId = deviceId;
  const hCtx = getHeadphonesCtx();
  if (hCtx.setSinkId && deviceId && deviceId !== 'default') {
    try { await hCtx.setSinkId(deviceId); } catch (e) { }
  }
}

async function setDiscordDevice(deviceId) {
  state.selectedDiscordId = deviceId;
  const dCtx = getDiscordCtx();
  if (dCtx.setSinkId && deviceId && deviceId !== 'default') {
    try { await dCtx.setSinkId(deviceId); } catch (e) { }
  }
}

function generateSoundFX(type, ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  let duration = 0.5;
  let buffer;

  if (type === 'skrillex_growl') {
    duration = 0.8;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const lfo = Math.sin(2 * Math.PI * 5.5 * t);
      const fmMod = Math.sin(2 * Math.PI * 110 * t) * (150 + lfo * 100);
      const carrier = Math.sin(2 * Math.PI * 55 * t + fmMod);
      const distortion = Math.tanh(carrier * (2.5 + lfo * 1.5));
      data[i] = distortion * Math.max(0, 1 - t / duration) * 0.45;
    }
  }
  else if (type === 'skrillex_bangarang') {
    duration = 0.6;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    const notes = [1046.5, 1318.5, 1567.9, 2093.0];
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.floor(t * 16) % notes.length;
      const freq = notes[noteIdx];
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.3 : -0.3;
      data[i] = square * Math.max(0, 1 - t / duration) * 0.35;
    }
  }
  else if (type === 'skrillex_omg') {
    duration = 0.7;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const pitchBend = 350 + Math.sin(t * 12) * 180;
      const vocalFormant = Math.sin(2 * Math.PI * pitchBend * t) * Math.sin(2 * Math.PI * 1400 * t);
      data[i] = Math.tanh(vocalFormant * 2) * Math.max(0, 1 - t / duration) * 0.4;
    }
  }
  else if (type === 'skrillex_call911') {
    duration = 0.9;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const sirenFreq = 1800 * Math.exp(-t * 3) + 200;
      const noise = (Math.random() * 2 - 1) * 0.2;
      data[i] = (Math.sin(2 * Math.PI * sirenFreq * t) + noise) * Math.max(0, 1 - t / duration) * 0.35;
    }
  }
  else if (type === 'skrillex_subdrop') {
    duration = 1.1;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const subFreq = 150 * Math.exp(-t * 3.5) + 30;
      const sub = Math.sin(2 * Math.PI * subFreq * t);
      data[i] = Math.tanh(sub * 1.8) * Math.max(0, 1 - t / duration) * 0.5;
    }
  }
  else if (type === 'skrillex_wobble') {
    duration = 0.8;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const wobbleLfo = (Math.sin(2 * Math.PI * 7 * t) + 1) / 2;
      const wave = Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 110 * t);
      data[i] = Math.tanh(wave * (1 + wobbleLfo * 3)) * Math.max(0, 1 - t / duration) * 0.45;
    }
  }
  else if (type === 'skrillex_snare') {
    duration = 0.35;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const body = Math.sin(2 * Math.PI * (220 * Math.exp(-t * 30)) * t);
      const snap = (Math.random() * 2 - 1) * Math.exp(-t * 18);
      data[i] = (body * 0.5 + snap * 0.7) * Math.max(0, 1 - t / duration) * 0.5;
    }
  }
  else if (type === 'skrillex_kick') {
    duration = 0.4;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const kickFreq = 160 * Math.exp(-t * 35) + 40;
      data[i] = Math.sin(2 * Math.PI * kickFreq * t) * Math.max(0, 1 - t / duration) * 0.55;
    }
  }
  else if (type === 'airhorn') {
    duration = 0.6;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 450 + Math.sin(t * 35) * 40;
      data[i] = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.3 : -0.3) * Math.max(0, 1 - t / duration);
    }
  }
  else if (type === 'jump') {
    duration = 0.3;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 150 + t * 1200;
      data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.3;
    }
  }
  else if (type === 'coin') {
    duration = 0.4;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = t < 0.1 ? 987.77 : 1318.51;
      data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.35;
    }
  }
  else if (type === 'laser') {
    duration = 0.25;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 1200 * Math.exp(-t * 20);
      data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.3;
    }
  }
  else if (type === 'boom') {
    duration = 0.8;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 120 * Math.exp(-t * 5);
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 6);
      data[i] = (Math.sin(2 * Math.PI * freq * t) * 0.6 + noise * 0.4) * (1 - t / duration);
    }
  }
  else {
    duration = 0.4;
    buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    const freq = 300 + (type * 50);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5) * 0.3;
    }
  }

  return buffer;
}

async function generatePresetAudioBuffers() {
  return;
}

async function populateAudioOutputs() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => { });

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

    const selectHeadphones = document.getElementById('select-output-headphones');
    if (selectHeadphones) {
      selectHeadphones.innerHTML = '<option value="default">Por Defecto (Audífonos)</option>';
      audioOutputs.forEach(device => {
        const opt1 = document.createElement('option');
        opt1.value = device.deviceId;
        opt1.textContent = device.label || `Salida ${device.deviceId.slice(0, 5)}`;
        selectHeadphones.appendChild(opt1);
      });
    }
  }
  catch (err) {
    console.warn('Nota de dispositivos de audio:', err);
  }
}

async function playTestSoundOnDevice(deviceId) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const testCtx = new AudioContext();

    if (testCtx.state === 'suspended') await testCtx.resume();
    if (testCtx.setSinkId && deviceId && deviceId !== 'default') {
      await testCtx.setSinkId(deviceId);
    }

    const osc = testCtx.createOscillator();
    const gain = testCtx.createGain();
    osc.frequency.value = 440;
    gain.gain.value = 0.4;
    gain.gain.exponentialRampToValueAtTime(0.001, testCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(testCtx.destination);
    osc.start();
    osc.stop(testCtx.currentTime + 0.5);
    setTimeout(() => testCtx.close(), 600);
  }
  catch (err) {
    console.warn('Error en test de dispositivo:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderGrid() {
  const gridEl = document.getElementById('pads-grid');
  gridEl.innerHTML = '';
  const pads = currentPads();

  pads.forEach((pad, index) => {
    const isFnPad = (state.fnKeyEnabled !== false) && (index === (state.gridPadCount || 64) - 1);
    const hasSound = !isFnPad && Boolean(pad.audioBuffer || pad.audioPath);
    const padEl = document.createElement('div');

    if (isFnPad) {
      padEl.className = `pad pad-fn ${state.selectedPadIndex === index ? 'selected' : ''}`;
      padEl.id = `pad-${index}`;
      padEl.style.setProperty('--pad-color', '#a855f7');
      padEl.style.setProperty('--pad-glow', '#a855f7');
      padEl.innerHTML = `
        <div class="pad-header">
          <span class="pad-num">${index + 1}</span>
          <span class="pad-fn-badge">FN</span>
        </div>
        <div class="pad-body pad-fn-content">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span class="pad-fn-label">CAPAS</span>
          <span class="pad-fn-hint">HOLD</span>
        </div>
      `;

      padEl.addEventListener('mousedown', () => {
        selectPad(index);
      });
      padEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        selectPad(index);
      });
      padEl.addEventListener('drop', (e) => {
        e.preventDefault();
        showToast('Este pad es la Tecla FN (Capas). Está reservado para el hardware.', 'info');
      });
    } else {
      padEl.className = `pad ${hasSound ? 'has-sound' : 'is-empty'} ${state.selectedPadIndex === index ? 'selected' : ''} ${pad.isPlaying ? 'playing' : ''}`;
      padEl.id = `pad-${index}`;
      padEl.style.setProperty('--pad-color', pad.color);
      padEl.style.setProperty('--pad-glow', pad.color);

      if (pad.rgb) {
        padEl.style.setProperty('--pad-rgb-str', `${pad.rgb[0]}, ${pad.rgb[1]}, ${pad.rgb[2]}`);
      }

      let modeBadgeHtml = '';
      if (hasSound && pad.mode && pad.mode !== 'oneshot') {
        const modeLabel = pad.mode === 'toggle' ? 'TO' : (pad.mode === 'loop' ? 'LO' : (pad.mode === 'hold' ? 'HO' : pad.mode.toUpperCase().slice(0, 2)));
        modeBadgeHtml = `<span class="pad-mode-badge">${modeLabel}</span>`;
      }

      const soundTitleHtml = hasSound ? `<span class="pad-label" title="${escapeHtml(pad.name)}">${escapeHtml(pad.name)}</span>` : '';

      padEl.innerHTML = `
        <div class="pad-header">
          <span class="pad-num">${index + 1}</span>
          ${modeBadgeHtml}
        </div>
        <div class="pad-body">
          ${soundTitleHtml}
        </div>
      `;

      padEl.addEventListener('mousedown', (e) => {
        if (state.appMode === 'edit' || e.button === 2 || e.altKey || e.ctrlKey || e.shiftKey) {
          selectPad(index);
          return;
        }
        selectPad(index);
        triggerPad(index, false);
      });

      padEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        selectPad(index);
      });

      padEl.addEventListener('mouseup', () => {
        if (state.appMode === 'edit') return;
        if (pad.mode === 'hold') {
          stopPad(index, true);
        }
      });

      padEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        padEl.classList.add('drag-hover');
      });
      padEl.addEventListener('dragleave', () => {
        padEl.classList.remove('drag-hover');
      });
      padEl.addEventListener('drop', (e) => {
        e.preventDefault();
        padEl.classList.remove('drag-hover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          selectPad(index);
          for (let fi = 0; fi < e.dataTransfer.files.length; fi++) {
            const targetIndex = index + fi;
            if (targetIndex < (state.gridPadCount || 64)) {
              handleAudioFileUpload(e.dataTransfer.files[fi], targetIndex);
            }
          }
        }
      });
    }

    gridEl.appendChild(padEl);
  });

  if (typeof updateLegendCounts === 'function') {
    updateLegendCounts();
  }
}

function selectPad(index) {
  recordActivity(true);
  state.selectedPadIndex = index;
  const pad = currentPads()[index];
  if (!pad) return;

  document.querySelectorAll('.pad').forEach(p => p.classList.remove('selected'));
  const padEl = document.getElementById(`pad-${index}`);
  if (padEl) padEl.classList.add('selected');

  const isFnPad = !!state.fnKeyEnabled && (index === (state.gridPadCount - 1));
  const fnControls = document.getElementById('pad-fn-controls');
  const normalControls = document.getElementById('pad-normal-controls');
  const fnCheckbox = document.getElementById('check-enable-fn-pad');

  if (fnCheckbox) {
    fnCheckbox.checked = !!state.fnKeyEnabled;
  }

  if (isFnPad) {
    if (fnControls) fnControls.style.display = 'block';
    if (normalControls) normalControls.style.display = 'none';
    const titleEl = document.getElementById('selected-pad-title');
    if (titleEl) {
      titleEl.textContent = `#${index + 1} (FN - CAMBIO DE CAPAS)`;
    }
    return;
  } else {
    if (fnControls) fnControls.style.display = 'none';
    if (normalControls) normalControls.style.display = 'flex';
  }

  document.getElementById('selected-pad-title').textContent = `#${index + 1} (Fila ${pad.row + 1}, Col ${pad.col + 1})`;
  document.getElementById('input-pad-name').value = pad.name;
  document.getElementById('select-playback-mode').value = pad.mode;

  const volPct = Math.round((pad.volume !== undefined ? pad.volume : 1.0) * 100);
  const slider = document.getElementById('slider-pad-volume');

  if (slider) slider.value = volPct;

  const label = document.getElementById('pad-vol-label');

  if (label) label.textContent = `${volPct}%`;

  document.querySelectorAll('.btn-vol-preset').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.vol, 10) === volPct);
  });

  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.hex?.toLowerCase() === pad.color?.toLowerCase());
  });

  const customColorInput = document.getElementById('input-pad-custom-color');

  if (customColorInput && pad.color) {
    customColorInput.value = pad.color;
  }

  const padPressSelect = document.getElementById('select-pad-press-effect');

  if (padPressSelect) {
    padPressSelect.value = (pad.pressEffect !== undefined && pad.pressEffect !== null)
      ? String(pad.pressEffect)
      : 'default';
  }

  const hotkeyInput = document.getElementById('input-pad-hotkey');
  if (hotkeyInput) {
    hotkeyInput.value = pad.hotkey || '';
  }

  const obsActionSelect = document.getElementById('select-pad-obs-action');
  const obsTargetContainer = document.getElementById('pad-obs-target-container');
  const obsTargetInput = document.getElementById('input-pad-obs-target');
  if (obsActionSelect) {
    obsActionSelect.value = pad.obsAction || 'none';
  }
  if (obsTargetInput) {
    obsTargetInput.value = pad.obsTarget || '';
  }
  if (obsTargetContainer) {
    obsTargetContainer.style.display = (pad.obsAction === 'scene' || pad.obsAction === 'toggle_mute') ? 'block' : 'none';
  }

  const btnTrim = document.getElementById('btn-trim-audio');
  const hasAudio = Boolean(pad.audioBuffer || pad.audioPath || pad.audioBlob);
  if (btnTrim) {
    btnTrim.style.display = hasAudio ? 'inline-flex' : 'none';
  }

  const dropText = document.getElementById('drop-zone-text');

  if (hasAudio) {
    const isTrimmed = (typeof pad.trimStart === 'number' && pad.trimStart > 0) || (typeof pad.trimEnd === 'number');
    const trimBadge = isTrimmed
      ? ` <span style="background:rgba(0,255,204,0.15);color:#00ffcc;border:1px solid rgba(0,255,204,0.3);padding:1px 5px;border-radius:3px;font-size:9.5px;font-weight:700;">RECORTADO</span>`
      : '';
    dropText.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${getIconSvg('music', 14)} <strong>${escapeHtml(pad.name)}</strong>${trimBadge}</span><br><span style="font-size:11px; color:#888;">Haz clic para cambiar audio</span>`;
  }
  else {
    dropText.innerHTML = `Arrastra un MP3 / WAV aquí o <strong>haz clic</strong>`;
  }
}

function updatePadVisual(index) {
  const pad = currentPads()[index];
  const padEl = document.getElementById(`pad-${index}`);
  if (!padEl) return;

  const hasSound = Boolean(pad.audioBuffer || pad.audioPath);
  padEl.className = `pad ${hasSound ? 'has-sound' : 'is-empty'} ${state.selectedPadIndex === index ? 'selected' : ''} ${pad.isPlaying ? 'playing' : ''}`;
  padEl.style.setProperty('--pad-color', pad.color);
  padEl.style.setProperty('--pad-glow', pad.color);
  if (pad.rgb) {
    padEl.style.setProperty('--pad-rgb-str', `${pad.rgb[0]}, ${pad.rgb[1]}, ${pad.rgb[2]}`);
  }

  const bodyEl = padEl.querySelector('.pad-body');
  if (bodyEl) {
    bodyEl.innerHTML = hasSound ? `<span class="pad-label" title="${escapeHtml(pad.name)}">${escapeHtml(pad.name)}</span>` : '';
  }

  const headerEl = padEl.querySelector('.pad-header');
  if (headerEl) {
    let modeBadgeHtml = '';
    if (hasSound && pad.mode && pad.mode !== 'oneshot') {
      const modeLabel = pad.mode === 'toggle' ? 'TO' : (pad.mode === 'loop' ? 'LO' : (pad.mode === 'hold' ? 'HO' : pad.mode.toUpperCase().slice(0, 2)));
      modeBadgeHtml = `<span class="pad-mode-badge">${modeLabel}</span>`;
    }
    headerEl.innerHTML = `
      <span class="pad-num">${index + 1}</span>
      ${modeBadgeHtml}
    `;
  }
}

function applyPadColor(hex, rgb) {
  const pad = currentPads()[state.selectedPadIndex];
  pad.color = hex;
  pad.rgb = rgb || hexToRgb(hex) || [0, 240, 255];

  updatePadVisual(state.selectedPadIndex);
  syncPadToHardware(state.selectedPadIndex);

  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.hex?.toLowerCase() === hex.toLowerCase());
  });
  const customColorInput = document.getElementById('input-pad-custom-color');
  if (customColorInput) customColorInput.value = hex;

  saveSoundboardConfig();
}

function renderPalette() {
  const paletteEl = document.getElementById('color-palette');
  if (!paletteEl) return;
  paletteEl.innerHTML = '';

  PALETTE_COLORS.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.dataset.hex = color.hex;
    swatch.style.backgroundColor = color.hex;
    swatch.title = color.name;

    swatch.addEventListener('click', () => {
      applyPadColor(color.hex, color.rgb);
    });

    paletteEl.appendChild(swatch);
  });
}

async function initBotDiscordWebSocket() {
  if (!localStorage.getItem('soundboard_bot_vps_url')) {
    try {
      const res = await fetch('vps_default.json');
      if (res.ok) {
        const d = await res.json();
        if (d && d.vpsUrl) {
          state.botDiscord.vpsUrl = d.vpsUrl;
          if (d.secretKey) state.botDiscord.secretKey = d.secretKey;
          const inputUrl = document.getElementById('input-bot-vps-url');
          const inputToken = document.getElementById('input-bot-vps-token');
          if (inputUrl) inputUrl.value = state.botDiscord.vpsUrl;
          if (inputToken) inputToken.value = state.botDiscord.secretKey;
        }
      }
    } catch (e) { }
  }

  if (state.botDiscord.ws) {
    const oldWs = state.botDiscord.ws;

    oldWs.onopen = null;
    oldWs.onclose = null;
    oldWs.onerror = null;
    oldWs.onmessage = null;

    try {
      oldWs.close();
    }
    catch (e) { }

    state.botDiscord.ws = null;
  }

  if (state.botDiscord.heartbeatTimer) {
    clearInterval(state.botDiscord.heartbeatTimer);
    state.botDiscord.heartbeatTimer = null;
  }

  const vpsUrl = state.botDiscord.vpsUrl || 'ws://localhost:3002';

  try {
    console.log(`[DISCORD] Conectando a VPS WebSocket: ${vpsUrl}`);
    const ws = new WebSocket(vpsUrl);
    state.botDiscord.ws = ws;

    ws.onopen = () => {
      if (state.botDiscord.ws !== ws) return;

      console.log(`[DISCORD] Conexión establecida con VPS`);
      state.botDiscord.connected = true;

      if (state.botDiscord.reconnectTimer) {
        clearTimeout(state.botDiscord.reconnectTimer);
        state.botDiscord.reconnectTimer = null;
      }

      if (state.botDiscord.uploadedSounds) {
        state.botDiscord.uploadedSounds.clear();
      }

      if (state.botDiscord.secretKey) {
        ws.send(JSON.stringify({
          type: 'auth',
          token: state.botDiscord.secretKey
        }));
      }

      ws.send(JSON.stringify({ type: 'get_status' }));
      ws.send(JSON.stringify({ type: 'get_voice_channels' }));

      if (!state.botDiscord.hasShownInitialToast) {
        state.botDiscord.hasShownInitialToast = true;
        showToast('Conectado al DJM BOT 24/7', 'check');
      }

      if (state.botDiscord.heartbeatTimer) clearInterval(state.botDiscord.heartbeatTimer);

      state.botDiscord.heartbeatTimer = setInterval(() => {
        if (state.botDiscord.ws && state.botDiscord.ws.readyState === WebSocket.OPEN) {
          state.botDiscord.ws.send(JSON.stringify({ type: 'get_status' }));
        }
      }, 20000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleBotDiscordMessage(msg);
      }
      catch (err) {
        console.warn('Error leyendo mensaje WebSocket del bot:', err);
      }
    };

    ws.onclose = (event) => {
      if (state.botDiscord.ws !== ws) return;
      console.warn('[DISCORD] Conexión cerrada. Código:', event?.code);
      state.botDiscord.connected = false;
      state.botDiscord.online = false;
      state.botDiscord.inVoice = false;
      updateBotDiscordUI();
      scheduleBotReconnect();
    };

    ws.onerror = (err) => {
      if (state.botDiscord.ws !== ws) return;
      console.warn('[DISCORD] WebSocket error:', err);
      state.botDiscord.connected = false;
      state.botDiscord.online = false;
      state.botDiscord.inVoice = false;
      updateBotDiscordUI();
    };
  } catch (err) {
    scheduleBotReconnect();
  }
}

function scheduleBotReconnect() {
  if (state.botDiscord.reconnectTimer) return;

  if (state.botDiscord.ws && (state.botDiscord.ws.readyState === WebSocket.OPEN || state.botDiscord.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  state.botDiscord.reconnectTimer = setTimeout(() => {
    state.botDiscord.reconnectTimer = null;
    if (!state.botDiscord.ws || state.botDiscord.ws.readyState === WebSocket.CLOSED) {
      initBotDiscordWebSocket();
    }
  }, 5000);
}

function handleBotDiscordMessage(msg) {
  if (!msg || !msg.type) return;

  if (msg.type === 'auth_ok') {
    console.log('[DISCORD] Autenticación con VPS exitosa');
  }
  else if (msg.type === 'auth_error') {
    console.error('[DISCORD] Error de autenticación VPS:', msg.message);
    showToast(`Error de clave VPS: ${msg.message}`, 'error');
  }
  else if (msg.type === 'auth_required') {
    showToast('La VPS requiere la clave de acceso configurada', 'alert');
  }
  else if (msg.type === 'voice_channels') {
    state.botDiscord.voiceChannels = msg.guilds || [];
    renderVoiceChannelsSelect();
  }
  else if (msg.type === 'status') {
    state.botDiscord.online = !!msg.online;
    state.botDiscord.botUser = msg.botUser || null;
    state.botDiscord.inVoice = !!msg.inVoice;
    state.botDiscord.channelName = msg.channelName || null;
    state.botDiscord.guildName = msg.guildName || null;
    state.botDiscord.serversCount = msg.serversCount || 0;
    updateBotDiscordUI();
  }
  else if (msg.type === 'warn') {
    showToast(msg.message, 'alert');
  }
  else if (msg.type === 'play_result') {
    if (msg.success) {
      if (msg.soundId && state.botDiscord.uploadedSounds) {
        state.botDiscord.uploadedSounds.add(msg.soundId);
      }
      if (msg.queued) {
        showToast(`Sonido encolado en Discord (#${msg.queuePosition})`, 'music');
      }
    }
    else {
      if (msg.soundId && state.botDiscord.uploadedSounds) {
        state.botDiscord.uploadedSounds.delete(msg.soundId);
      }
      console.warn('[DISCORD] Bot no pudo reproducir el audio:', msg);
      const errMsg = msg.error ? `Error bot: ${msg.error}` : 'DJM BOT no pudo reproducir el audio en Discord';
      showToast(errMsg, 'error');

      if (state.muteLocalOnDiscord && msg.soundId) {
        triggerLocalAudioFallback(msg.soundId);
      }
    }
  }
  else if (msg.type === 'queue_update') {
    console.log(`[DISCORD] Cola de sonidos en Discord: ${msg.queueLength} en espera`);
  }
  else if (msg.type === 'player_playing') {
    console.log('[DISCORD] Bot AudioPlayer: PLAYING');
  }
  else if (msg.type === 'player_idle') {
    console.log('[DISCORD] Bot AudioPlayer: IDLE');
  }
  else if (msg.type === 'player_error') {
    console.error('[DISCORD] Bot AudioPlayer ERROR:', msg.message);
    showToast(`Error de audio en Discord: ${msg.message}`, 'error');
  }
}

function triggerLocalAudioFallback(soundId) {
  const bank = state.banks[state.currentBankId];

  if (!bank) return;

  const pad = bank.find(p => p._lastSoundId === soundId || `snd_${state.currentBankId}_pad_${p.id}` === soundId);

  if (pad && pad.audioBuffer) {
    try {
      const hCtx = getHeadphonesCtx();
      const srcH = hCtx.createBufferSource();
      srcH.buffer = pad.audioBuffer;
      srcH.loop = (pad.mode === 'loop');
      const gainH = hCtx.createGain();
      gainH.gain.value = (pad.volume !== undefined ? pad.volume : 1.0) * state.masterVolume;
      srcH.connect(gainH);
      gainH.connect(getMasterAudioDestination());
      gainH.connect(hCtx.destination);
      srcH.start(0);
      pad.activeNodes.push(srcH);
      console.log(`[DISCORD] Fallback de audio local reproducido para pad ${pad.id}`);
    }
    catch (e) {
      console.warn('Error en fallback local:', e);
    }
  }
}

function renderVoiceChannelsSelect() {
  const select = document.getElementById('select-bot-voice-channel');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  const guilds = state.botDiscord.voiceChannels || [];

  if (guilds.length === 0) {
    select.innerHTML = '<option value="">Sin servidores/canales detectados</option>';
    return;
  }

  let hasSelected = false;
  guilds.forEach(guild => {
    if (!guild.channels || guild.channels.length === 0) return;
    const group = document.createElement('optgroup');
    group.label = `🌐 ${guild.name}`;

    guild.channels.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = `${guild.id}:${ch.id}`;
      const countStr = ch.membersCount > 0 ? ` (${ch.membersCount} usuario${ch.membersCount > 1 ? 's' : ''})` : '';
      opt.textContent = `🔊 ${ch.name}${countStr}`;

      if (state.botDiscord.channelName && ch.name === state.botDiscord.channelName) {
        opt.selected = true;
        hasSelected = true;
      }
      else if (opt.value === currentVal && !hasSelected) {
        opt.selected = true;
        hasSelected = true;
      }

      group.appendChild(opt);
    });

    select.appendChild(group);
  });

  updateBotDiscordControls();
}

function updateBotDiscordControls() {
  const btnJoin = document.getElementById('btn-bot-join-selected');
  const btnLeave = document.getElementById('btn-bot-leave');
  const selectChannel = document.getElementById('select-bot-voice-channel');

  const isOnline = state.botDiscord.connected && state.botDiscord.online;
  const inVoice = isOnline && !!state.botDiscord.inVoice;

  if (selectChannel) {
    selectChannel.disabled = !isOnline;
  }

  if (!btnJoin || !btnLeave) return;

  if (!isOnline) {
    btnJoin.disabled = true;
    btnLeave.disabled = true;
    btnLeave.classList.remove('btn-danger-active');
    return;
  }

  if (inVoice) {
    btnLeave.disabled = false;
    btnLeave.classList.add('btn-danger-active');

    let isDifferentChannel = false;
    if (selectChannel && selectChannel.value && selectChannel.selectedIndex >= 0) {
      const selectedOpt = selectChannel.options[selectChannel.selectedIndex];
      if (selectedOpt && state.botDiscord.channelName) {
        const optText = selectedOpt.textContent.toLowerCase();
        const currentChannel = state.botDiscord.channelName.toLowerCase();
        isDifferentChannel = !optText.includes(currentChannel);
      }
    }
    btnJoin.disabled = !isDifferentChannel;
  } else {
    btnJoin.disabled = !(selectChannel && selectChannel.value);
    btnLeave.disabled = true;
    btnLeave.classList.remove('btn-danger-active');
  }
}

function updateBotDiscordUI() {
  const usernameEl = document.getElementById('bot-username-display');
  const serversEl = document.getElementById('bot-servers-display');
  const badgeEl = document.getElementById('bot-badge-status');
  const badgeText = document.getElementById('bot-badge-text');

  if (state.botDiscord.connected && state.botDiscord.online) {
    if (usernameEl) usernameEl.textContent = state.botDiscord.botUser || 'DJM BOT 24/7';

    if (serversEl) {
      if (state.botDiscord.inVoice && state.botDiscord.channelName) {
        serversEl.textContent = `En Canal: ${state.botDiscord.channelName} (${state.botDiscord.guildName || 'Discord'})`;
      }
      else {
        serversEl.textContent = `Online • ${state.botDiscord.serversCount} servidor(es) activo(s)`;
      }
    }
    if (badgeEl) {
      badgeEl.className = 'bot-badge connected';
      if (badgeText) badgeText.textContent = state.botDiscord.inVoice ? 'EN VOZ' : 'ONLINE 24/7';
    }
  }
  else {
    if (badgeEl) {
      badgeEl.className = 'bot-badge disconnected';
      if (badgeText) badgeText.textContent = 'CONECTANDO...';
    }

    if (serversEl) serversEl.textContent = 'Conectando al Bot de Discord...';
  }

  updateBotDiscordControls();
}

function extractTrimmedAudioBuffer(ctx, buffer, startSec = 0, endSec = 0) {
  const sampleRate = buffer.sampleRate;
  const startOffset = Math.max(0, Math.floor(startSec * sampleRate));
  const maxEnd = buffer.length;
  const endOffset = (endSec > startSec) ? Math.min(maxEnd, Math.floor(endSec * sampleRate)) : maxEnd;
  const frameCount = Math.max(1, endOffset - startOffset);
  const trimmed = ctx.createBuffer(buffer.numberOfChannels, frameCount, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = trimmed.getChannelData(c);
    dest.set(src.subarray(startOffset, endOffset));
  }

  return trimmed;
}

function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);

  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

async function sendBotDiscordPlay(pad, volume = 1.0) {
  if (!state.botDiscord.ws || state.botDiscord.ws.readyState !== WebSocket.OPEN) {
    console.warn('[DISCORD] WebSocket no conectado a la VPS');

    return;
  }

  const targetVol = volume * (state.botDiscord.volume ?? 1.0);

  let soundId = `snd_${state.currentBankId}_pad_${pad.id}`;
  let ext = '.mp3';

  if (pad.audioPath) {
    const rawFileName = pad.audioPath.split('/').pop();
    const dotIdx = rawFileName.lastIndexOf('.');

    if (dotIdx !== -1) {
      soundId = rawFileName.substring(0, dotIdx).replace(/[^a-zA-Z0-9_-]/g, '_');
      ext = rawFileName.substring(dotIdx).toLowerCase();
    }
    else {
      soundId = rawFileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
  }
  else if (pad.name && pad.name.includes('.')) {
    const dotIdx = pad.name.lastIndexOf('.');
    soundId = `snd_${state.currentBankId}_pad_${pad.id}_` + pad.name.substring(0, dotIdx).replace(/[^a-zA-Z0-9_-]/g, '_');
    ext = pad.name.substring(dotIdx).toLowerCase();
  }
  else if (pad._audioBlobExt) {
    ext = pad._audioBlobExt;
  }

  const isTrimmed = (typeof pad.trimStart === 'number' && pad.trimStart > 0) || (typeof pad.trimEnd === 'number');
  if (isTrimmed) {
    const tStartMs = Math.round((pad.trimStart || 0) * 100);
    const tEndMs = Math.round((pad.trimEnd || (pad.audioBuffer ? pad.audioBuffer.duration : 0)) * 100);
    soundId += `_t${tStartMs}_${tEndMs}`;
  }

  pad._lastSoundId = soundId;

  if (state.botDiscord.uploadedSounds && state.botDiscord.uploadedSounds.has(soundId)) {
    console.log(`[DISCORD] Reproduciendo sonido en caché de VPS: ${soundId}${ext}`);

    state.botDiscord.ws.send(JSON.stringify({
      type: 'play_buffer',
      soundId: soundId,
      ext: ext,
      volume: targetVol
    }));

    return;
  }

  let blobToSend = pad.audioBlob;

  if (isTrimmed && pad.audioBuffer) {
    try {
      const hCtx = getHeadphonesCtx();
      const trimmedBuf = extractTrimmedAudioBuffer(hCtx, pad.audioBuffer, pad.trimStart || 0, pad.trimEnd || pad.audioBuffer.duration);
      blobToSend = audioBufferToWavBlob(trimmedBuf);
      ext = '.wav';
    }
    catch (e) {
      console.warn('[DISCORD] Error generando audio recortado para Discord:', e);
    }
  }

  if (!blobToSend && pad.audioPath) {
    try {
      const res = await fetch(pad.audioPath);

      if (res.ok) {
        blobToSend = await res.blob();
      }
    }
    catch (e) {
      console.warn('[DISCORD] Error obteniendo audioBlob desde audioPath:', e);
    }
  }

  if (!blobToSend && pad.audioBuffer) {
    try {
      blobToSend = audioBufferToWavBlob(pad.audioBuffer);
      ext = '.wav';
    }
    catch (e) {
      console.warn('[DISCORD] Error convirtiendo buffer a WAV Blob:', e);
    }
  }

  if (blobToSend) {
    try {
      const reader = new FileReader();

      reader.onload = () => {
        const parts = reader.result.split(',');
        const base64Data = parts[1];

        console.log(`[DISCORD] Transmitiendo audio a VPS (${soundId}${ext})...`);

        state.botDiscord.ws.send(JSON.stringify({
          type: 'play_buffer',
          soundId: soundId,
          ext: ext,
          buffer: base64Data,
          volume: targetVol
        }));
      };
      reader.readAsDataURL(blobToSend);
      return;
    }
    catch (e) {
      console.warn('[DISCORD] Error procesando FileReader de audioBlob:', e);
    }
  }

  const p = pad.audioPath || soundId;

  state.botDiscord.ws.send(JSON.stringify({
    type: 'play',
    soundPath: p,
    volume: targetVol
  }));
}

function sendBotDiscordStop() {
  if (!state.botDiscord.ws || state.botDiscord.ws.readyState !== WebSocket.OPEN) return;
  state.botDiscord.ws.send(JSON.stringify({ type: 'stop' }));
}

function sendBotDiscordJoinSelected() {
  const select = document.getElementById('select-bot-voice-channel');
  if (!select || !select.value) {
    showToast('Selecciona un canal de voz en la lista', 'alert');
    return;
  }
  const [guildId, channelId] = select.value.split(':');
  if (!guildId || !channelId) return;

  if (!state.botDiscord.ws || state.botDiscord.ws.readyState !== WebSocket.OPEN) {
    showToast('El Bot en la VPS no está conectado', 'alert');
    return;
  }

  state.botDiscord.ws.send(JSON.stringify({
    type: 'join_channel',
    guildId,
    channelId
  }));
  showToast('Conectando bot al canal seleccionado...', 'zap');
}

function sendBotDiscordLeave() {
  if (!state.botDiscord.ws || state.botDiscord.ws.readyState !== WebSocket.OPEN) return;
  state.botDiscord.ws.send(JSON.stringify({ type: 'leave' }));
}

let _serialWriter = null;
let _isWritingSerial = false;

const _serialQueue = [];

function getSerialWriter() {
  if (!state.serialPort || !state.serialPort.writable || !state.isConnected) return null;
  if (!_serialWriter) {
    try {
      _serialWriter = state.serialPort.writable.getWriter();
    }
    catch (e) {
      _serialWriter = null;
    }
  }
  return _serialWriter;
}

function resetSerialWriter() {
  if (_serialWriter) {
    try {
      _serialWriter.releaseLock();
    }
    catch (e) { }
    _serialWriter = null;
  }
  _serialQueue.length = 0;
  _isWritingSerial = false;
}

async function processSerialQueue() {
  if (_isWritingSerial || _serialQueue.length === 0) return;
  _isWritingSerial = true;
  const encoder = new TextEncoder();

  while (_serialQueue.length > 0 && state.isConnected && state.serialPort) {
    const chunk = _serialQueue.shift();
    try {
      const writer = getSerialWriter();
      if (writer) {
        await writer.write(encoder.encode(chunk + '\n'));
      }
    }
    catch (err) {
      resetSerialWriter();
      break;
    }
  }
  _isWritingSerial = false;
}

function sendSerial(msg) {
  if (!state.serialPort || !state.isConnected || !msg) return;
  if (_serialQueue.length > 25) {
    _serialQueue.splice(0, 10);
  }
  _serialQueue.push(msg);
  processSerialQueue();
}

function previewPadLocally(index) {
  recordActivity(true);
  const pad = currentPads()[index];
  if (!pad) return;

  const effectToTrigger = (pad.pressEffect !== undefined && pad.pressEffect !== null)
    ? pad.pressEffect
    : state.pressEffect;
  triggerLightEffect(pad.row, pad.col, pad.color, effectToTrigger);

  const hwLedIdx = getHwLedIndex(pad.row, pad.col);
  sendSerial(`A ${hwLedIdx} 1`);
  setTimeout(() => sendSerial(`A ${hwLedIdx} 0`), 200);

  if (!pad.audioBuffer) {
    playSynthTone(index);
    return;
  }

  stopPad(index, false);
  pad.isPlaying = true;
  updatePadVisual(index);

  try {
    const hCtx = getHeadphonesCtx();
    const srcH = hCtx.createBufferSource();
    srcH.buffer = pad.audioBuffer;

    const offset = (typeof pad.trimStart === 'number' && pad.trimStart > 0) ? pad.trimStart : 0;
    let dur = undefined;
    if (typeof pad.trimEnd === 'number' && pad.trimEnd > offset) {
      dur = pad.trimEnd - offset;
    }

    if (pad.mode === 'loop') {
      srcH.loop = true;
      srcH.loopStart = offset;
      srcH.loopEnd = (typeof pad.trimEnd === 'number' && pad.trimEnd > offset) ? pad.trimEnd : pad.audioBuffer.duration;
    } else {
      srcH.loop = false;
    }

    const gainH = hCtx.createGain();
    gainH.gain.value = (pad.volume !== undefined ? pad.volume : 1.0) * state.masterVolume;
    srcH.connect(gainH);
    gainH.connect(getMasterAudioDestination());
    gainH.connect(hCtx.destination);
    srcH.start(0, offset, dur);

    const currentNodesObj = { srcH, srcD: null, gainH, gainD: null };
    pad.activeNodes = currentNodesObj;

    const finish = () => {
      if (pad.activeNodes === currentNodesObj) {
        stopPad(index);
      }
    };

    srcH.onended = finish;
    const effectiveDur = dur !== undefined ? dur : (pad.audioBuffer.duration - offset);
    if (pad.mode !== 'loop' && effectiveDur) {
      pad.finishTimer = setTimeout(finish, (effectiveDur * 1000) + 50);
    }
  } catch (e) {
    console.warn('Error en preescucha local:', e);
    pad.isPlaying = false;
    updatePadVisual(index);
  }
}

function triggerPad(index, isFromHardware = false) {
  recordActivity(!isFromHardware);
  const pad = currentPads()[index];
  if (!pad) return;

  if (pad.obsAction && pad.obsAction !== 'none' && typeof executeObsPadAction === 'function') {
    executeObsPadAction(pad);
  }

  const effectToTrigger = (pad.pressEffect !== undefined && pad.pressEffect !== null)
    ? pad.pressEffect
    : state.pressEffect;
  triggerLightEffect(pad.row, pad.col, pad.color, effectToTrigger);
  if (typeof triggerPreviewEffect === 'function' && !isFromHardware) {
    triggerPreviewEffect(effectToTrigger, pad.row, pad.col);
  }

  const hwLedIdx = getHwLedIndex(pad.row, pad.col);
  const cols = state.gridCols || 8;
  const hwCol = (cols - 1) - pad.col;
  sendSerial(`A ${hwLedIdx} 1`);
  if (!isFromHardware) {
    sendSerial(`T ${pad.row} ${hwCol} ${effectToTrigger}`);
  }

  console.log('[DISCORD-DEBUG] triggerPad Discord section: audioPath=', pad.audioPath, 'hasBlob=', !!pad.audioBlob, 'hasBuffer=', !!pad.audioBuffer, 'connected=', state.botDiscord.connected, 'inVoice=', state.botDiscord.inVoice);
  if (pad.audioPath || pad.audioBlob || pad.audioBuffer) {
    if (!state.botDiscord.connected) {
      console.log('[DISCORD-DEBUG] Bot NOT connected - skipping');
    } else if (!state.botDiscord.inVoice) {
      console.log('[DISCORD-DEBUG] Bot connected but NOT in voice - showing toast');
      showToast('DJM BOT no está en un canal de voz. Conéctalo desde la pestaña Bot Discord.', 'alert');
    } else {
      console.log('[DISCORD-DEBUG] Bot connected AND in voice - sending play!');
      sendBotDiscordPlay(pad, pad.volume);
    }
  } else {
    console.log('[DISCORD-DEBUG] No audio source on this pad');
  }

  if (!pad.audioBuffer) {
    playSynthTone(index);
    return;
  }

  if (pad.mode === 'toggle' && pad.isPlaying) {
    stopPad(index, true);
    return;
  }

  stopPad(index, false);
  pad.isPlaying = true;
  updatePadVisual(index);

  if (pad.audioBuffer) {
    let srcH = null;
    let srcD = null;
    let gainH = null;
    let gainD = null;

    const isDiscordStreaming = state.botDiscord.connected && state.botDiscord.inVoice && (pad.audioPath || pad.audioBlob || pad.audioBuffer);
    const shouldPlayLocal = !(isDiscordStreaming && state.muteLocalOnDiscord);

    const offset = (typeof pad.trimStart === 'number' && pad.trimStart > 0) ? pad.trimStart : 0;
    let dur = undefined;
    if (typeof pad.trimEnd === 'number' && pad.trimEnd > offset) {
      dur = pad.trimEnd - offset;
    }

    try {
      const hCtx = getHeadphonesCtx();
      srcH = hCtx.createBufferSource();
      srcH.buffer = pad.audioBuffer;
      if (pad.mode === 'loop') {
        srcH.loop = true;
        srcH.loopStart = offset;
        srcH.loopEnd = (typeof pad.trimEnd === 'number' && pad.trimEnd > offset) ? pad.trimEnd : pad.audioBuffer.duration;
      } else {
        srcH.loop = false;
      }
      gainH = hCtx.createGain();
      gainH.gain.value = (pad.volume !== undefined ? pad.volume : 1.0) * state.masterVolume;
      srcH.connect(gainH);

      gainH.connect(getMasterAudioDestination());

      if (shouldPlayLocal) {
        gainH.connect(hCtx.destination);
      }

      srcH.start(0, offset, dur);
    }
    catch (e) {
      console.warn('Error audio audífonos:', e);
    }

    if (state.selectedDiscordId && shouldPlayLocal) {
      try {
        const dCtx = getDiscordCtx();
        srcD = dCtx.createBufferSource();
        srcD.buffer = pad.audioBuffer;
        if (pad.mode === 'loop') {
          srcD.loop = true;
          srcD.loopStart = offset;
          srcD.loopEnd = (typeof pad.trimEnd === 'number' && pad.trimEnd > offset) ? pad.trimEnd : pad.audioBuffer.duration;
        } else {
          srcD.loop = false;
        }
        gainD = dCtx.createGain();
        gainD.gain.value = (pad.volume !== undefined ? pad.volume : 1.0) * state.masterVolume;
        srcD.connect(gainD);
        gainD.connect(dCtx.destination);
        srcD.start(0, offset, dur);
      }
      catch (e) {
        console.warn('Error audio Discord:', e);
      }
    }

    const currentNodesObj = { srcH, srcD, gainH, gainD };
    pad.activeNodes = currentNodesObj;

    const finish = () => {
      if (pad.activeNodes === currentNodesObj) {
        stopPad(index);
      }
    };

    if (srcH) srcH.onended = finish;
    if (pad.mode !== 'loop' && pad.audioBuffer.duration) {
      pad.finishTimer = setTimeout(finish, (pad.audioBuffer.duration * 1000) + 50);
    }
  }
}

function stopPad(index, stopDiscord = false) {
  const pad = currentPads()[index];

  if (pad.activeNodes) {
    if (pad.activeNodes.srcH) {
      pad.activeNodes.srcH.onended = null;
      try { pad.activeNodes.srcH.stop(); } catch (e) { }
    }

    if (pad.activeNodes.srcD) {
      pad.activeNodes.srcD.onended = null;
      try { pad.activeNodes.srcD.stop(); } catch (e) { }
    }

    pad.activeNodes = null;
  }

  if (pad.finishTimer) {
    clearTimeout(pad.finishTimer);
    pad.finishTimer = null;
  }

  pad.isPlaying = false;
  updatePadVisual(index);
  sendSerial(`A ${getHwLedIndex(pad.row, pad.col)} 0`);

  if (stopDiscord && state.botDiscord.connected) {
    sendBotDiscordStop();
  }
}

function stopAllSounds() {
  const pads = currentPads();
  pads.forEach((_, i) => stopPad(i));
  sendSerial('X');
  if (state.botDiscord.connected) {
    sendBotDiscordStop();
  }
  setTimeout(syncAllPadsToHardware, 50);
}

async function playSynthTone(index) {
  const freqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
  const freq = freqs[index % 8];

  try {
    const hCtx = await getHeadphonesCtx();
    const oscH = hCtx.createOscillator();
    const gainH = hCtx.createGain();
    oscH.frequency.value = freq;
    oscH.type = 'triangle';
    gainH.gain.setValueAtTime(0.25 * state.masterVolume, hCtx.currentTime);
    gainH.gain.exponentialRampToValueAtTime(0.001, hCtx.currentTime + 0.25);
    oscH.connect(gainH);
    gainH.connect(getMasterAudioDestination());
    gainH.connect(hCtx.destination);
    oscH.start();
    oscH.stop(hCtx.currentTime + 0.25);
  } catch (e) { }

  if (state.discordIntegrationMode === 'virtual' && state.selectedDiscordId && state.selectedDiscordId !== 'default') {
    try {
      const dCtx = await getDiscordCtx();
      const oscD = dCtx.createOscillator();
      const gainD = dCtx.createGain();
      oscD.frequency.value = freq;
      oscD.type = 'triangle';
      gainD.gain.setValueAtTime(0.25 * state.masterVolume, dCtx.currentTime);
      gainD.gain.exponentialRampToValueAtTime(0.001, dCtx.currentTime + 0.25);
      oscD.connect(gainD);
      gainD.connect(dCtx.destination);
      oscD.start();
      oscD.stop(dCtx.currentTime + 0.25);
    } catch (e) { }
  }

  const pad = currentPads()[index];
  triggerLightEffect(pad.row, pad.col, pad.color, state.pressEffect);
  pad.isPlaying = true;
  updatePadVisual(index);
  const hwLedIdx = getHwLedIndex(pad.row, pad.col);
  sendSerial(`A ${hwLedIdx} 1`);
  setTimeout(() => {
    pad.isPlaying = false;
    updatePadVisual(index);
    sendSerial(`A ${hwLedIdx} 0`);
  }, 250);
}

function updateLegendCounts() {
  const pads = currentPads();
  let empty = 0, loaded = 0, playing = 0;
  pads.forEach(p => {
    if (p.isPlaying) playing++;
    else if (p.audioPath || p.audioBuffer || p.synthType) loaded++;
    else empty++;
  });
  const elEmpty = document.querySelector('.deck-legend-item.empty .deck-legend-text');
  const elLoaded = document.querySelector('.deck-legend-item.loaded .deck-legend-text');
  const elPlaying = document.querySelector('.deck-legend-item.playing .deck-legend-text');
  if (elEmpty) elEmpty.textContent = `Vacío (${empty})`;
  if (elLoaded) elLoaded.textContent = `Listo (${loaded})`;
  if (elPlaying) elPlaying.textContent = `Sonando (${playing})`;
}

let activeRenamingBankId = null;

function renderBankPills() {
  const container = document.getElementById('bank-pills-container');
  if (!container) return;
  container.innerHTML = '';

  const bankIds = (state.bankOrder && state.bankOrder.length > 0) ? state.bankOrder : Object.keys(state.banks);

  const layersCount = document.getElementById('deck-layers-count');
  if (layersCount) layersCount.textContent = bankIds.length;

  let inputToFocus = null;

  bankIds.forEach((bankId, idx) => {
    const name = state.bankNames?.[bankId] || `Capa ${idx + 1}`;
    const pill = document.createElement('div');
    pill.className = `pill ${bankId === state.currentBankId ? 'active' : ''}`;
    pill.dataset.bank = bankId;

    if (activeRenamingBankId === bankId) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'pill-rename-input';
      input.value = name;
      input.maxLength = 24;

      let committed = false;
      const commit = (save) => {
        if (committed) return;
        committed = true;
        const targetId = activeRenamingBankId;
        activeRenamingBankId = null;
        if (save) {
          const newName = input.value.trim();
          if (newName && newName !== name) {
            if (!state.bankNames) state.bankNames = {};
            state.bankNames[targetId] = newName;
            if (state.gridProfiles && state.gridType && state.gridProfiles[state.gridType]) {
              if (!state.gridProfiles[state.gridType].bankNames) state.gridProfiles[state.gridType].bankNames = {};
              state.gridProfiles[state.gridType].bankNames[targetId] = newName;
            }
            saveSoundboardConfig();
            showToast(`Renombrado a "${newName}"`, 'edit');
          }
        }
        renderBankPills();
      };

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          commit(false);
        }
      });

      input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });

      input.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      input.addEventListener('blur', () => {
        commit(true);
      });

      pill.appendChild(input);
      inputToFocus = input;
    } else {
      const span = document.createElement('span');
      span.className = 'pill-label';
      span.textContent = name;
      span.title = 'Clic para cambiar de capa | Doble clic para cambiar nombre';
      span.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        activeRenamingBankId = bankId;
        renderBankPills();
      });
      pill.appendChild(span);
    }

    const bankPads = state.banks[bankId] || [];
    const soundCount = bankPads.filter(p => p && (p.audioPath || p.audioBuffer || p.synthType)).length;
    const countBadge = document.createElement('span');
    countBadge.className = 'pill-sound-count';
    countBadge.textContent = `${soundCount} audios`;

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'pill-actions';
    actionsWrapper.appendChild(countBadge);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'pill-action-btn pill-rename-btn';
    renameBtn.innerHTML = getIconSvg('edit', 12);
    renameBtn.title = 'Cambiar nombre de la capa';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeRenamingBankId === bankId) {
        activeRenamingBankId = null;
      } else {
        activeRenamingBankId = bankId;
      }
      renderBankPills();
    });
    actionsWrapper.appendChild(renameBtn);

    if (bankIds.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'pill-action-btn pill-delete-btn';
      delBtn.innerHTML = getIconSvg('x', 12);
      delBtn.title = 'Eliminar capa';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeRenamingBankId) activeRenamingBankId = null;
        deleteBank(bankId);
      });
      actionsWrapper.appendChild(delBtn);
    }

    pill.appendChild(actionsWrapper);

    pill.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.closest('.pill-action-btn') || e.target.closest('.pill-rename-input')) return;
      if (activeRenamingBankId) {
        activeRenamingBankId = null;
        renderBankPills();
      }
      switchBank(bankId);
    });

    container.appendChild(pill);
  });

  if (inputToFocus) {
    setTimeout(() => {
      window.focus();
      inputToFocus.focus();
      inputToFocus.select();
    }, 30);
  }

  updateLegendCounts();
}

function showConfirmDialog(title, message, confirmText = 'ELIMINAR', cancelText = 'CANCELAR') {
  return new Promise((resolve) => {
    let modal = document.getElementById('modal-app-confirm');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-app-confirm';
      modal.className = 'modal-backdrop';
      modal.style.zIndex = '99999';
      modal.innerHTML = `
        <div class="modal modal-card" style="max-width: 360px; text-align: center; border: 1px solid rgba(255, 77, 77, 0.4); box-shadow: 0 8px 32px rgba(0,0,0,0.7);">
          <h2 class="modal-title" id="confirm-modal-title" style="justify-content: center; color: var(--color-error); font-size: 13px; font-weight: 800; letter-spacing: 0.05em;">
            ¿ELIMINAR CAPA?
          </h2>
          <p id="confirm-modal-msg" style="margin: 12px 0 20px 0; font-size: 12px; color: #bbb; line-height: 1.5;"></p>
          <div class="modal-buttons" style="justify-content: center; gap: 10px;">
            <button id="btn-confirm-cancel" class="btn btn-secondary" style="min-width: 95px;">CANCELAR</button>
            <button id="btn-confirm-ok" class="btn btn-danger" style="min-width: 95px;">ELIMINAR</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = modal.querySelector('#confirm-modal-title');
    const msgEl = modal.querySelector('#confirm-modal-msg');
    const btnOk = modal.querySelector('#btn-confirm-ok');
    const btnCancel = modal.querySelector('#btn-confirm-cancel');

    titleEl.textContent = title;
    msgEl.textContent = message;
    btnOk.textContent = confirmText;
    btnCancel.textContent = cancelText;

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup(false);
      } else if (e.key === 'Enter') {
        cleanup(true);
      }
    };

    const cleanup = (result) => {
      window.removeEventListener('keydown', handleKeydown, true);
      modal.style.display = 'none';
      btnOk.onclick = null;
      btnCancel.onclick = null;
      window.focus();
      resolve(result);
    };

    window.addEventListener('keydown', handleKeydown, true);
    btnOk.onclick = (e) => { e.stopPropagation(); cleanup(true); };
    btnCancel.onclick = (e) => { e.stopPropagation(); cleanup(false); };
    modal.style.display = 'flex';
    btnOk.focus();
  });
}

function addNewBank() {
  activeRenamingBankId = null;
  const bankIds = state.bankOrder || Object.keys(state.banks);
  const count = bankIds.length + 1;
  const newBankId = `capa_${Date.now()}`;
  const newBankName = `Capa ${count}`;

  if (!state.bankOrder) state.bankOrder = [...bankIds];
  state.bankOrder.push(newBankId);
  if (!state.bankNames) state.bankNames = {};
  state.bankNames[newBankId] = newBankName;
  state.banks[newBankId] = createEmptyBank('Pad', state.gridRows || 8, state.gridCols || 8);

  switchBank(newBankId);
  renderBankPills();
  saveSoundboardConfig();
  showToast(`${newBankName} creada`, 'plus');
}

async function deleteBank(bankId) {
  activeRenamingBankId = null;
  const bankIds = state.bankOrder || Object.keys(state.banks);
  if (bankIds.length <= 1) {
    showToast('Debes mantener al menos una capa', 'alert');
    return;
  }

  const name = state.bankNames?.[bankId] || 'esta capa';
  const confirmed = await showConfirmDialog('¿ELIMINAR CAPA?', `¿Deseas eliminar "${name}" y todos sus sonidos asignados?`);
  if (!confirmed) {
    window.focus();
    return;
  }

  delete state.banks[bankId];
  if (state.bankNames) delete state.bankNames[bankId];
  state.bankOrder = bankIds.filter(id => id !== bankId);

  if (state.currentBankId === bankId) {
    state.currentBankId = state.bankOrder[0];
  }

  switchBank(state.currentBankId);
  renderBankPills();
  saveSoundboardConfig();
  showToast(`${name} eliminada`, 'trash');
  window.focus();
}

function switchBank(bankId) {
  if (!state.banks[bankId]) return;

  stopAllSounds();

  if (!state.bankSettings) state.bankSettings = {};
  if (state.currentBankId && state.currentBankId !== bankId) {
    state.bankSettings[state.currentBankId] = {
      idleEffect: (state.idleEffect !== undefined) ? state.idleEffect : 11,
      pressEffect: (state.pressEffect !== undefined) ? state.pressEffect : 1,
      blendMode: (state.blendMode !== undefined) ? state.blendMode : 0
    };
  }

  state.currentBankId = bankId;

  const layerCfg = state.bankSettings[bankId] || {
    idleEffect: (state.idleEffect !== undefined) ? state.idleEffect : 11,
    pressEffect: (state.pressEffect !== undefined) ? state.pressEffect : 1,
    blendMode: (state.blendMode !== undefined) ? state.blendMode : 0
  };
  state.idleEffect = layerCfg.idleEffect !== undefined ? layerCfg.idleEffect : 11;
  state.pressEffect = layerCfg.pressEffect !== undefined ? layerCfg.pressEffect : 1;
  state.blendMode = layerCfg.blendMode !== undefined ? layerCfg.blendMode : 0;

  if (typeof syncBlendModeUI === 'function') syncBlendModeUI(state.blendMode);
  if (typeof syncPressEffectUI === 'function') syncPressEffectUI(state.pressEffect);
  const idleSelect = document.getElementById('select-idle-effect');
  if (idleSelect) idleSelect.value = String(state.idleEffect);

  sendSerial(`E ${state.pressEffect} ${state.idleEffect} ${state.blendMode}`);
  syncLayerInfoToHardware();

  if (state.gridProfiles && state.gridType) {
    state.gridProfiles[state.gridType] = {
      currentBankId: bankId,
      bankOrder: state.bankOrder,
      bankNames: state.bankNames,
      banks: state.banks,
      bankSettings: state.bankSettings
    };
  }

  document.querySelectorAll('#bank-pills-container .pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.bank === bankId);
  });

  renderGrid();
  selectPad(state.selectedPadIndex);
  syncAllPadsToHardware();
  if (typeof syncAllGlobalHotkeys === 'function') {
    syncAllGlobalHotkeys();
  }
}

async function doOpenSerialPort(port) {
  try {
    await port.open({ baudRate: 115200 });
    state.serialPort = port;
    state.isConnected = true;

    const btn = document.getElementById('btn-connect-hardware');
    if (btn) btn.classList.add('connected');
    const dot = document.getElementById('connection-dot');
    if (dot) dot.className = 'status-dot connected';
    const txt = document.getElementById('connection-text');
    if (txt) txt.textContent = (state.gridType === '5x5') ? 'LAUNCHPAD 5X5 CONECTADO' : 'LAUNCHPAD 8X8 CONECTADO';
    const hwStatus = document.getElementById('hw-status-text');
    if (hwStatus) hwStatus.textContent = 'MIDI SERIAL: ONLINE (115200 BAUD)';

    readSerialLoop();

    sendSerial('X');
    sendSerial('PING');
    sendSerial(`M ${state.blendMode || 0}`);
    sendSerial(`E ${state.pressEffect} ${state.idleEffect} ${state.blendMode || 0}`);
    syncLayerInfoToHardware();
    setTimeout(syncAllPadsToHardware, 200);
    return true;
  } catch (err) {
    console.warn('Error en doOpenSerialPort:', err);
    return false;
  }
}

async function connectLaunchpadHardware() {
  if (!navigator.serial) {
    showToast('Tu sistema no soporta la API WebSerial.', 'error');
    return;
  }

  if (state.isConnected && state.serialPort) return;

  try {
    let port = null;
    const existingPorts = await navigator.serial.getPorts().catch(() => []);

    if (existingPorts && existingPorts.length > 0) {
      port = existingPorts[0];
    }
    else {
      port = await navigator.serial.requestPort();
    }

    if (!port) return;

    const ok = await doOpenSerialPort(port);
    if (!ok) {
      showToast('No se pudo abrir el puerto serie.', 'error');
    }
  } catch (err) {
    console.error('Error al conectar Launchpad:', err);
  }
}

async function autoDetectLaunchpad() {
  if (!navigator.serial) return;

  try {
    const ports = await navigator.serial.getPorts().catch(() => []);
    if (ports && ports.length > 0 && !state.isConnected) {
      console.log('[AUTO] Puerto serial detectado, conectando automaticamente...');
      const ok = await doOpenSerialPort(ports[0]);
      if (ok) {
        showToast('Launchpad detectado y conectado automaticamente', 'check');
      }
    }
  } catch (err) {
    console.warn('[AUTO] No se pudo auto-conectar:', err);
  }
}

function setupSerialHotPlug() {
  if (!navigator.serial) return;

  navigator.serial.addEventListener('connect', async (e) => {
    console.log('[USB] Dispositivo serial conectado');
    if (!state.isConnected) {
      setTimeout(async () => {
        await autoDetectLaunchpad();
      }, 800);
    }
  });

  navigator.serial.addEventListener('disconnect', (e) => {
    console.log('[USB] Dispositivo serial desconectado');
    resetSerialWriter();
    if (state.isConnected) {
      state.isConnected = false;
      state.serialPort = null;
      state.serialReader = null;

      const dot = document.getElementById('connection-dot');
      if (dot) dot.className = 'status-dot disconnected';
      const txt = document.getElementById('connection-text');
      if (txt) txt.textContent = 'LAUNCHPAD DESCONECTADO';
      const btn = document.getElementById('btn-connect-hardware');
      if (btn) btn.classList.remove('connected');
      const hwStatus = document.getElementById('hw-status-text');
      if (hwStatus) hwStatus.textContent = 'MIDI SERIAL: DESCONECTADO';

      showToast('Launchpad USB desconectado', 'alert');

      setTimeout(async () => {
        if (!state.isConnected) {
          await autoDetectLaunchpad();
        }
      }, 3000);
    }
  });
}

async function requestEnterDFUMode() {
  if (!state.serialPort || !state.isConnected) {
    const wantConnect = confirm(
      'MODO DFU (FLASHEO)\n\n' +
      'El Launchpad no está conectado por USB a la aplicación en este momento.\n\n' +
      '¿Deseas seleccionarlo y conectarlo ahora para enviarle la orden DFU?\n\n' +
      '(Nota: También puedes entrar en modo DFU físicamente sin abrir el pad manteniendo presionados Pad 1 y Pad 8 juntos durante 3 segundos).'
    );
    if (wantConnect) {
      await connectLaunchpadHardware();
      if (!state.isConnected) return;
    } else {
      return;
    }
  }

  const confirmed = confirm(
    '¿REINICIAR LAUNCHPAD EN MODO DFU?\n\n' +
    'El microcontrolador STM32 entrará en modo de programación.\n' +
    'Podrás presionar "Subir" en Arduino IDE inmediatamente para grabar el nuevo código.\n\n' +
    '¿Continuar?'
  );
  if (!confirmed) return;

  try {
    showToast('Enviando orden DFU al microcontrolador...', 'zap');
    sendSerial('DFU');

    setTimeout(async () => {
      try {
        if (state.serialReader) {
          await state.serialReader.cancel();
          state.serialReader = null;
        }
        if (state.serialPort) {
          await state.serialPort.close();
          state.serialPort = null;
        }
      } catch (e) { }

      state.isConnected = false;
      const dot = document.getElementById('connection-dot');
      if (dot) dot.className = 'status-dot disconnected';
      const txt = document.getElementById('connection-text');
      if (txt) txt.textContent = 'MODO DFU ACTIVO (LISTO EN ARDUINO)';
      const btn = document.getElementById('btn-connect-hardware');
      if (btn) btn.classList.remove('connected');
      const hwStatus = document.getElementById('hw-status-text');
      if (hwStatus) hwStatus.textContent = 'DFU BOOTLOADER: LISTO PARA SUBIR';

      showToast('Modo DFU activado. Presiona "Subir" en Arduino IDE', 'zap', 6000);
    }, 1200);
  } catch (err) {
    console.error('Error al solicitar DFU:', err);
    alert('Error al enviar comando DFU: ' + err.message);
  }
}

async function readSerialLoop() {
  const textDecoder = new TextDecoderStream();
  state.serialPort.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();
  let lineBuffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop();
        for (const line of lines) {
          processHardwareMessage(line.trim());
        }
      }
    }
  } catch (err) {
    console.error('Error lectura serie:', err);
  }
}

function processHardwareMessage(msg) {
  if (!msg) return;

  if (msg === 'ENTERING_DFU_MODE') {
    showToast('Launchpad en Modo DFU. Listo para flashear en Arduino IDE', 'zap', 6000);
    const hwStatus = document.getElementById('hw-status-text');
    if (hwStatus) hwStatus.textContent = 'DFU BOOTLOADER: LISTO PARA SUBIR';
    const txt = document.getElementById('connection-text');
    if (txt) txt.textContent = 'MODO DFU ACTIVO (LISTO EN ARDUINO)';
    const dot = document.getElementById('connection-dot');
    if (dot) dot.className = 'status-dot disconnected';
    const btn = document.getElementById('btn-connect-hardware');
    if (btn) btn.classList.remove('connected');
    return;
  }

  if (msg.startsWith('BANK_SET ')) {
    const targetIdx = parseInt(msg.split(' ')[1], 10);
    if (!isNaN(targetIdx) && state.bankOrder && state.bankOrder[targetIdx]) {
      const targetBankId = state.bankOrder[targetIdx];
      switchBank(targetBankId);
      const bName = (state.bankNames && state.bankNames[targetBankId]) || `Capa ${targetIdx + 1}`;
      showToast(`Capa activada: ${bName}`, 'layers');
    }
    return;
  }

  const parts = msg.split(' ');
  const type = parts[0];
  const cols = state.gridCols || 8;
  const rows = state.gridRows || 8;
  const maxPads = cols * rows;

  if (type === 'P') {
    const row = parseInt(parts[1], 10);
    const col = parseInt(parts[2], 10);
    if (isNaN(row) || isNaN(col) || row < 0 || row >= rows || col < 0 || col >= cols) return;
    const screenCol = (cols - 1) - col;
    const padIndex = (row * cols) + screenCol;

    console.log(`[Launchpad Hardware] Presionado: Fila ${row}, Col ${col} -> Pad #${padIndex + 1}`);

    if (padIndex >= 0 && padIndex < maxPads) {
      selectPad(padIndex);
      const pad = currentPads()[padIndex];
      const eff = (pad && pad.pressEffect !== null && pad.pressEffect !== undefined) ? pad.pressEffect : (state.pressEffect ?? 1);
      if (typeof triggerPreviewEffect === 'function') {
        triggerPreviewEffect(eff, row, screenCol);
      }
      if (state.appMode === 'edit') {
        triggerLightEffect(pad.row, pad.col, pad.color, eff);
        const hwLedIdx = getHwLedIndex(pad.row, pad.col);
        sendSerial(`A ${hwLedIdx} 1`);
        setTimeout(() => sendSerial(`A ${hwLedIdx} 0`), 150);
        return;
      }
      triggerPad(padIndex, true);
    }
  } else if (type === 'R') {
    const row = parseInt(parts[1], 10);
    const col = parseInt(parts[2], 10);
    if (isNaN(row) || isNaN(col) || row < 0 || row >= rows || col < 0 || col >= cols) return;
    const screenCol = (cols - 1) - col;
    const padIndex = (row * cols) + screenCol;

    if (padIndex >= 0 && padIndex < maxPads) {
      if (state.appMode === 'edit') return;
      const pad = currentPads()[padIndex];
      if (pad && pad.mode === 'hold') {
        stopPad(padIndex, true);
      }
    }
  }
}

function syncPadToHardware(index) {
  const pad = currentPads()[index];
  if (!pad) return;
  const ledIdx = getHwLedIndex(pad.row, pad.col);
  const hasSound = Boolean(pad.audioPath || pad.synthType || pad.audioBuffer);

  if (hasSound) {
    const rgb = pad.rgb || hexToRgb(pad.color) || [195, 234, 43];
    sendSerial(`C ${ledIdx} ${rgb[0]} ${rgb[1]} ${rgb[2]} 1`);
  } else {
    sendSerial(`K ${ledIdx}`);
  }
}

let _isSyncingHardware = false;
async function syncAllPadsToHardware() {
  if (!state.serialPort || !state.isConnected) return;
  if (_isSyncingHardware) return;
  _isSyncingHardware = true;

  try {
    sendSerial('W');
    sendSerial(`M ${state.blendMode || 0}`);
    sendSerial(`E ${state.pressEffect} ${state.idleEffect} ${state.blendMode || 0}`);

    const pads = currentPads();
    for (let i = 0; i < pads.length; i++) {
      syncPadToHardware(i);
      await new Promise(r => setTimeout(r, 4));
    }
  }
  finally {
    _isSyncingHardware = false;
  }
}

function setupEventListeners() {
  const btnMinimize = document.getElementById('btn-window-minimize');
  const btnMaximize = document.getElementById('btn-window-maximize');
  const btnClose = document.getElementById('btn-window-close');
  if (ipcRenderer) {
    if (btnMinimize) btnMinimize.addEventListener('click', () => ipcRenderer.send('window-minimize'));
    if (btnMaximize) btnMaximize.addEventListener('click', () => ipcRenderer.send('window-maximize'));
    if (btnClose) btnClose.addEventListener('click', () => ipcRenderer.send('window-close'));
  }

  document.getElementById('btn-connect-hardware').addEventListener('click', connectLaunchpadHardware);
  document.getElementById('btn-stop-all').addEventListener('click', stopAllSounds);

  const btnEnterDFU = document.getElementById('btn-enter-dfu');
  if (btnEnterDFU) btnEnterDFU.addEventListener('click', requestEnterDFUMode);

  const btnEnterDFULights = document.getElementById('btn-enter-dfu-lights');
  if (btnEnterDFULights) btnEnterDFULights.addEventListener('click', requestEnterDFUMode);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      stopAllSounds();
    }
    if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
      window.location.reload();
    }
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
      if (targetId === 'tab-lights' && typeof onLightsTabActivated === 'function') {
        onLightsTabActivated();
      }
      if (targetId === 'tab-obs' && typeof window.autoDetectAndConnectObs === 'function' && !state.obs.connected) {
        window.autoDetectAndConnectObs(true);
      }
    });
  });

  const btnAddBank = document.getElementById('btn-add-bank');

  if (btnAddBank) {
    btnAddBank.addEventListener('click', addNewBank);
  }

  const inputVpsUrl = document.getElementById('input-bot-vps-url');
  const inputVpsToken = document.getElementById('input-bot-vps-token');
  const btnToggleVps = document.getElementById('btn-toggle-vps-config');
  const vpsPanel = document.getElementById('vps-config-panel');
  const btnToggleToken = document.getElementById('btn-toggle-token-visibility');
  const btnSaveVps = document.getElementById('btn-save-vps-config');
  const btnBotJoin = document.getElementById('btn-bot-join-selected');
  const btnBotLeave = document.getElementById('btn-bot-leave');
  const sliderBotVol = document.getElementById('slider-bot-discord-volume');
  const labelBotVol = document.getElementById('bot-discord-vol-label');

  if (inputVpsUrl) inputVpsUrl.value = state.botDiscord.vpsUrl || 'ws://localhost:3002';
  if (inputVpsToken) inputVpsToken.value = state.botDiscord.secretKey || 'launchpad2026';

  if (btnToggleVps && vpsPanel) {
    btnToggleVps.addEventListener('click', () => {
      vpsPanel.style.display = (vpsPanel.style.display === 'none') ? 'block' : 'none';
    });
  }

  if (btnToggleToken && inputVpsToken) {
    btnToggleToken.addEventListener('click', () => {
      inputVpsToken.type = (inputVpsToken.type === 'password') ? 'text' : 'password';
    });
  }

  if (btnSaveVps) {
    btnSaveVps.addEventListener('click', () => {
      if (inputVpsUrl) {
        state.botDiscord.vpsUrl = inputVpsUrl.value.trim() || 'ws://localhost:3002';
        localStorage.setItem('soundboard_bot_vps_url', state.botDiscord.vpsUrl);
      }
      if (inputVpsToken) {
        state.botDiscord.secretKey = inputVpsToken.value.trim() || 'launchpad2026';
        localStorage.setItem('soundboard_bot_secret_key', state.botDiscord.secretKey);
      }
      showToast('Guardando configuración y reconectando...', 'refresh');
      initBotDiscordWebSocket();
    });
  }

  if (btnBotJoin) {
    btnBotJoin.addEventListener('click', sendBotDiscordJoinSelected);
  }

  if (btnBotLeave) {
    btnBotLeave.addEventListener('click', sendBotDiscordLeave);
  }

  const selectBotVoice = document.getElementById('select-bot-voice-channel');
  if (selectBotVoice) {
    selectBotVoice.addEventListener('change', updateBotDiscordControls);
  }

  if (sliderBotVol) {
    sliderBotVol.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.botDiscord.volume = val / 100;
      if (labelBotVol) labelBotVol.textContent = `${val}%`;
    });
  }

  initBotDiscordWebSocket();

  const pressEffectSelect = document.getElementById('select-press-effect');
  const idleEffectSelect = document.getElementById('select-idle-effect');
  const blendModeSelect = document.getElementById('select-blend-mode');
  const btnForceSync = document.getElementById('btn-force-sync-hardware');

  const updateLightEffects = () => {
    state.pressEffect = pressEffectSelect ? parseInt(pressEffectSelect.value) : (state.pressEffect ?? 1);
    state.idleEffect = idleEffectSelect ? parseInt(idleEffectSelect.value) : (state.idleEffect ?? 11);
    state.blendMode = blendModeSelect ? parseInt(blendModeSelect.value) : (state.blendMode ?? 0);
    if (!state.bankSettings) state.bankSettings = {};
    if (state.currentBankId) {
      state.bankSettings[state.currentBankId] = {
        idleEffect: state.idleEffect,
        pressEffect: state.pressEffect,
        blendMode: state.blendMode
      };
    }
    if (typeof syncPressEffectUI === 'function') syncPressEffectUI(state.pressEffect);
    if (typeof syncIdleEffectUI === 'function') syncIdleEffectUI(state.idleEffect);
    if (typeof syncBlendModeUI === 'function') syncBlendModeUI(state.blendMode);
    if (typeof triggerPreviewEffect === 'function') triggerPreviewEffect(state.pressEffect);
    sendSerial(`E ${state.pressEffect} ${state.idleEffect} ${state.blendMode}`);
    saveSoundboardConfig();
  };

  if (pressEffectSelect) pressEffectSelect.addEventListener('change', updateLightEffects);
  if (idleEffectSelect) idleEffectSelect.addEventListener('change', updateLightEffects);
  if (blendModeSelect) blendModeSelect.addEventListener('change', updateLightEffects);

  const lightPresets = {
    club: { press: 1, idle: 11, blend: 0, label: 'Estilo DJ Club aplicado' },
    matrix: { press: 2, idle: 2, blend: 1, label: 'Estilo Cyber Matrix aplicado' },
    fire: { press: 6, idle: 7, blend: 0, label: 'Estilo Volcano aplicado' },
    minimal: { press: 0, idle: 0, blend: 1, label: 'Estilo Discreto aplicado' }
  };

  document.querySelectorAll('.btn-light-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      const cfg = lightPresets[presetKey];
      if (!cfg) return;

      document.querySelectorAll('.btn-light-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (pressEffectSelect) pressEffectSelect.value = String(cfg.press);
      if (idleEffectSelect) idleEffectSelect.value = String(cfg.idle);
      if (blendModeSelect) blendModeSelect.value = String(cfg.blend);

      state.pressEffect = cfg.press;
      state.idleEffect = cfg.idle;
      state.blendMode = cfg.blend;
      if (!state.bankSettings) state.bankSettings = {};
      if (state.currentBankId) {
        state.bankSettings[state.currentBankId] = {
          idleEffect: state.idleEffect,
          pressEffect: state.pressEffect,
          blendMode: state.blendMode
        };
      }

      if (typeof syncPressEffectUI === 'function') syncPressEffectUI(cfg.press);
      if (typeof syncIdleEffectUI === 'function') syncIdleEffectUI(cfg.idle);
      if (typeof syncBlendModeUI === 'function') syncBlendModeUI(cfg.blend);
      if (typeof triggerPreviewEffect === 'function') triggerPreviewEffect(cfg.press);
      sendSerial(`E ${state.pressEffect} ${state.idleEffect} ${state.blendMode}`);
      saveSoundboardConfig();
      showToast(cfg.label, 'zap');
    });
  });

  if (btnForceSync) {
    btnForceSync.addEventListener('click', async () => {
      showToast('Sincronizando luces del Launchpad...', 'refresh');
      await syncAllPadsToHardware();
      showToast('Launchpad 8x8 sincronizado al 100%', 'check');
    });
  }

  const padPressSelect = document.getElementById('select-pad-press-effect');

  if (padPressSelect) {
    padPressSelect.addEventListener('change', (e) => {
      const pad = currentPads()[state.selectedPadIndex];
      pad.pressEffect = e.target.value === 'default' ? null : parseInt(e.target.value, 10);
      saveSoundboardConfig();
    });
  }

  const btnTestHeadphones = document.getElementById('btn-test-headphones');

  if (btnTestHeadphones) {
    btnTestHeadphones.addEventListener('click', () => {
      playTestSoundOnDevice(state.selectedHeadphonesId);
    });
  }

  const chkMuteLocal = document.getElementById('chk-mute-local-on-discord');

  if (chkMuteLocal) {
    chkMuteLocal.addEventListener('change', (e) => {
      state.muteLocalOnDiscord = e.target.checked;
      saveSoundboardConfig();
    });
  }

  const selectOutputHeadphones = document.getElementById('select-output-headphones');
  if (selectOutputHeadphones) {
    selectOutputHeadphones.addEventListener('change', (e) => {
      setHeadphonesDevice(e.target.value);
    });
  }

  const btnModeLive = document.getElementById('btn-mode-live');
  if (btnModeLive) btnModeLive.addEventListener('click', () => setAppMode('live'));
  const btnModeEdit = document.getElementById('btn-mode-edit');
  if (btnModeEdit) btnModeEdit.addEventListener('click', () => setAppMode('edit'));

  const btnGrid8 = document.getElementById('btn-grid-8x8');
  if (btnGrid8) btnGrid8.addEventListener('click', () => setGridType('8x8'));
  const btnGrid5 = document.getElementById('btn-grid-5x5');
  if (btnGrid5) btnGrid5.addEventListener('click', () => setGridType('5x5'));
  const btnCopy8 = document.getElementById('btn-copy-from-8x8');
  if (btnCopy8) btnCopy8.addEventListener('click', () => copyFrom8x8To5x5());

  const btnBatchApplyEffect = document.getElementById('btn-batch-apply-effect');
  if (btnBatchApplyEffect) {
    btnBatchApplyEffect.addEventListener('click', () => {
      const effVal = document.getElementById('select-batch-press-effect')?.value ?? 'default';
      const onlyLoaded = document.getElementById('chk-batch-only-loaded')?.checked ?? false;
      applyPressEffectToAllPads(effVal, onlyLoaded);
    });
  }

  const btnBatchApplyMode = document.getElementById('btn-batch-apply-mode');
  if (btnBatchApplyMode) {
    btnBatchApplyMode.addEventListener('click', () => {
      const modeVal = document.getElementById('select-batch-playback-mode')?.value ?? 'oneshot';
      const onlyLoaded = document.getElementById('chk-batch-only-loaded')?.checked ?? false;
      applyPlaybackModeToAllPads(modeVal, onlyLoaded);
    });
  }

  document.getElementById('slider-master-volume').addEventListener('input', (e) => {
    state.masterVolume = e.target.value / 100;
    document.getElementById('master-vol-label').textContent = `${e.target.value}%`;
  });

  const sliderPadVol = document.getElementById('slider-pad-volume');
  if (sliderPadVol) {
    sliderPadVol.addEventListener('input', (e) => {
      updatePadVolume(state.selectedPadIndex, parseInt(e.target.value, 10), true);
    });
    sliderPadVol.addEventListener('change', async (e) => {
      updatePadVolume(state.selectedPadIndex, parseInt(e.target.value, 10), false);
      await saveSoundboardConfig();
      showVolumeSavedBadge();
    });
  }

  document.querySelectorAll('.btn-vol-preset').forEach(btn => {
    btn.addEventListener('click', async () => {
      const vol = parseInt(btn.dataset.vol, 10);
      updatePadVolume(state.selectedPadIndex, vol, false);
      await saveSoundboardConfig();
      showVolumeSavedBadge();
    });
  });

  const inputPadName = document.getElementById('input-pad-name');
  if (inputPadName) {
    inputPadName.addEventListener('input', (e) => {
      const pad = currentPads()[state.selectedPadIndex];
      pad.name = e.target.value || `Pad ${state.selectedPadIndex + 1}`;
      updatePadVisual(state.selectedPadIndex);
      saveSoundboardConfigDebounced(400);
    });
    inputPadName.addEventListener('change', () => {
      saveSoundboardConfig();
      showVolumeSavedBadge();
    });
  }

  document.getElementById('select-playback-mode').addEventListener('change', (e) => {
    const pad = currentPads()[state.selectedPadIndex];
    pad.mode = e.target.value;
    updatePadVisual(state.selectedPadIndex);
    saveSoundboardConfig();
  });

  const customColorInput = document.getElementById('input-pad-custom-color');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      const hex = e.target.value;
      const rgb = hexToRgb(hex);
      const pad = currentPads()[state.selectedPadIndex];
      pad.color = hex;
      pad.rgb = rgb;
      updatePadVisual(state.selectedPadIndex);
      syncPadToHardware(state.selectedPadIndex);
    });
    customColorInput.addEventListener('change', (e) => {
      applyPadColor(e.target.value);
    });
  }

  const btnTestPad = document.getElementById('btn-test-pad');
  if (btnTestPad) {
    btnTestPad.addEventListener('click', () => {
      previewPadLocally(state.selectedPadIndex);
    });
  }

  const btnTestDiscord = document.getElementById('btn-test-discord');
  if (btnTestDiscord) {
    btnTestDiscord.addEventListener('click', () => {
      triggerPad(state.selectedPadIndex);
    });
  }

  document.getElementById('btn-clear-pad').addEventListener('click', async () => {
    const pad = currentPads()[state.selectedPadIndex];
    if (pad.audioPath && pad.audioPath.startsWith('sounds/custom/')) {
      await deleteCustomAudioFile(state.currentBankId, state.selectedPadIndex);
    }
    pad.audioBuffer = null;
    pad.audioBlob = null;
    pad.audioUrl = null;
    pad.audioPath = null;
    pad.synthType = null;
    pad.trimStart = null;
    pad.trimEnd = null;
    pad.name = `Pad ${pad.id + 1}`;
    updatePadVisual(state.selectedPadIndex);
    selectPad(state.selectedPadIndex);
    syncPadToHardware(state.selectedPadIndex);
    renderBankPills();
    await saveSoundboardConfig();
    showToast(`Pad #${state.selectedPadIndex + 1} reseteado`, 'trash');
  });

  const dropZone = document.getElementById('pad-drop-zone');
  const fileInput = document.getElementById('input-audio-file');
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });
    fileInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleAudioFileUpload(e.dataTransfer.files[0], state.selectedPadIndex);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAudioFileUpload(e.target.files[0], state.selectedPadIndex);
      }
    });
  }

  const checkEnableFnPad = document.getElementById('check-enable-fn-pad');
  if (checkEnableFnPad) {
    checkEnableFnPad.addEventListener('change', async (e) => {
      state.fnKeyEnabled = Boolean(e.target.checked);
      renderGrid();
      selectPad(state.selectedPadIndex);
      syncLayerInfoToHardware();
      await saveSoundboardConfig();
      showToast(state.fnKeyEnabled ? 'Tecla FN activada' : 'Tecla FN desactivada (Pad normal)', 'layers');
    });
  }

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  setupRecorderModal();
  initLightingPreviewEngine();
  initIdleEffectsCatalog();
  initBlendModeControl();
}

const PRESS_EFFECTS_META = [
  { id: 1, title: 'RIPPLE', short: 'RIPPLE', name: 'Ripple', desc: 'Onda expansiva circular 360°', color: '#00f0ff' },
  { id: 2, title: 'CROSSHAIR', short: 'CROSS', name: 'Crosshair', desc: 'Haz láser en cruz horizontal y vertical', color: '#ff0055' },
  { id: 3, title: 'STARBURST', short: 'STARBURST', name: 'Starburst', desc: 'Explosión de partículas en 8 direcciones', color: '#ffb700' },
  { id: 4, title: 'LIGHTNING', short: 'LIGHTNING', name: 'Lightning Storm', desc: 'Chispazo eléctrico neón de alta energía', color: '#00e5ff' },
  { id: 0, title: 'DIRECT FLASH', short: 'FLASH', name: 'Direct Flash', desc: 'Destello blanco puro e instantáneo', color: '#ffffff' },
  { id: 5, title: 'DIAMOND', short: 'DIAMOND', name: 'Crystal Diamond', desc: 'Onda geométrica en diamante/rombo', color: '#a855f7' },
  { id: 6, title: 'VOLCANIC', short: 'VOLCANIC', name: 'Volcanic Shockwave', desc: 'Onda de choque incandescente y ardiente', color: '#ff4500' },
  { id: 7, title: 'VORTEX', short: 'VORTEX', name: 'Vortex Spiral', desc: 'Giro cósmico centrífugo de plasma', color: '#38bdf8' },
  { id: 8, title: 'HYPER PULSE', short: 'PULSE', name: 'Hyper Neon Pulse', desc: 'Anillo concéntrico neón de doble pulso', color: '#00ff88' },
  { id: 9, title: 'QUANTUM', short: 'QUANTUM', name: 'Quantum Prism', desc: 'Dispersión prismática cromática arcoíris', color: '#ec4899' },
  { id: 10, title: 'SUPERNOVA', short: 'SUPERNOVA', name: 'Supernova Shockwave', desc: 'Doble anillo cuántico súper expansivo', color: '#facc15' },
  { id: 11, title: 'SPIRAL', short: 'SPIRAL', name: 'Spiral Dimension', desc: 'Ráfaga de plasma en espiral rotatoria', color: '#c084fc' },
  { id: 12, title: 'TESLA ARC', short: 'TESLA', name: 'Tesla Arc', desc: 'Descargas y arcos voltaicos bifurcados', color: '#38bdf8' }
];

const IDLE_EFFECTS_META = [
  // Audio
  { id: 16, category: 'audio', name: 'Audio Pulse', badge: 'RITMO', desc: 'Reactivo a bajos y ritmo del audio' },
  // Psicodelicos
  { id: 11, category: 'psycho', name: 'Acid Mandala', badge: 'FRACTAL', desc: 'Caleidoscopio psicodélico fractal' },
  { id: 12, category: 'psycho', name: 'Cyber DMT', badge: 'TUNNEL', desc: 'Túnel hiperdimensional infinito' },
  { id: 13, category: 'psycho', name: 'Neon Lava', badge: 'LAVA', desc: 'Fluido metaballs dinámico neón' },
  { id: 14, category: 'psycho', name: 'Quantum Vortex', badge: 'VORTEX', desc: 'Vórtice espiral acelerado' },
  { id: 15, category: 'psycho', name: 'Psy Aurora', badge: 'AURORA', desc: 'Aurora boreal lisérgica' },
  // Fluidos y Ambiente
  { id: 1, category: 'fluid', name: 'Rainbow Wave', badge: 'RAINBOW', desc: 'Onda cromática fluyente 60FPS' },
  { id: 2, category: 'fluid', name: 'Matrix Rain', badge: 'MATRIX', desc: 'Lluvia digital verde Matrix' },
  { id: 3, category: 'fluid', name: 'Nebula', badge: 'NEBULA', desc: 'Aurora cósmica espacial' },
  { id: 4, category: 'fluid', name: 'Breathing', badge: 'BREATHE', desc: 'Respiración glow pulsada' },
  { id: 6, category: 'fluid', name: 'Ocean Waves', badge: 'OCEAN', desc: 'Olas de océano aqua y azul profundo' },
  // Alta Energia
  { id: 7, category: 'energy', name: 'Inferno Flames', badge: 'FUEGO', desc: 'Llamas de fuego ardiente' },
  { id: 8, category: 'energy', name: 'Cyber Spectrum', badge: 'EQ', desc: 'Ecualizador neón reactivo' },
  { id: 9, category: 'energy', name: 'Plasma', badge: 'PLASMA', desc: 'Esferas de energía plasmática' },
  { id: 5, category: 'energy', name: 'Fireworks', badge: 'BURST', desc: 'Explosión de fuegos artificiales' },
  { id: 10, category: 'energy', name: 'Hyperspace', badge: 'WARP', desc: 'Viaje estelar y túnel warp' },
  // Modo Simple
  { id: 0, category: 'simple', name: 'Estático', badge: 'OFF', desc: 'Sin animación continua (solo pads)' }
];

const BLEND_MODES_META = {
  0: { title: 'FUSIÓN NEÓN', desc: 'La animación de fondo resalta tus botones sin tapar sus colores.' },
  1: { title: 'BOTONES PUROS', desc: 'Tus pads mantienen su color al 100% y el fondo solo corre en casillas vacías.' },
  2: { title: 'FONDO TOTAL', desc: 'Animación al 100% en toda la grilla; los botones se revelan al tocarlos.' }
};

let activePreviewEffects = [];
let previewParticles = [];
let lastPreviewInteraction = performance.now();
let previewCanvas = null;
let previewCtx = null;
let previewAnimId = null;

function hslToRgb(h, s, l) {
  if (isNaN(h)) h = 0;
  if (isNaN(s)) s = 1;
  if (isNaN(l)) l = 0.5;
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
    Math.max(0, Math.min(255, Math.round((r + m) * 255))),
    Math.max(0, Math.min(255, Math.round((g + m) * 255))),
    Math.max(0, Math.min(255, Math.round((b + m) * 255)))
  ];
}

function computeIdleLedColor(r, c, idleMode, now, rows = 8, cols = 8) {
  try {
    if (idleMode === 0) return [0, 0, 0];
    const t = now * 0.001;
    const centerR = (rows - 1) / 2;
    const centerC = (cols - 1) / 2;
    const scale = cols === 5 ? 0.625 : 1.0;

    switch (idleMode) {
      case 1: {
        const step = cols === 5 ? 50 : 32;
        const hue = (t * 98.9 + (r * step) + (c * step)) % 360;
        return hslToRgb(hue, 1.0, 0.5);
      }
      case 2: {
        const speeds = [0.85, 1.15, 0.75, 1.25, 0.70, 1.05, 0.90, 1.20];
        const sp = speeds[c % speeds.length];
        const colOffsets = (cols === 5)
          ? [0.0, 3.8, 1.4, 5.2, 2.6]
          : [0.0, 6.2, 2.1, 8.4, 4.3, 1.2, 7.5, 5.1];
        const offset = colOffsets[c % colOffsets.length];
        const wrapLen = rows + 3.2;
        const dropPos = ((t * (cols === 5 ? 5.5 : 7.8) * sp + offset) % wrapLen);
        const diff = r - dropPos;
        if (Math.abs(diff) < 0.6) return [220, 255, 220];
        if (diff < 0 && diff > -2.2) return [0, 220, 60];
        if (diff < 0 && diff > -4.5) return [0, 80, 20];
        return [0, 12, 6];
      }
      case 3: {
        const cx = centerC + Math.sin(t * 1.2) * (1.8 * scale);
        const cy = centerR + Math.cos(t * 0.9) * (1.8 * scale);
        const dist = Math.hypot(r - cy, c - cx);
        const norm = Math.max(0, Math.min(1, dist / (4.6 * scale)));
        return [
          Math.round((1.0 - norm) * 230),
          Math.round(norm * 160),
          240
        ];
      }
      case 4: {
        const phase = Math.sin(t * 2.0) * 0.5 + 0.5;
        const br = Math.round(40 + phase * 200);
        return [0, Math.round(br * 0.9), br];
      }
      case 5: {
        const maxDist = Math.hypot(centerR, centerC) + 0.6;
        const cycleLen = maxDist + 0.8;
        const speed = (cols === 5) ? 2.2 : 2.8;
        const d1 = ((t * speed) % cycleLen);
        const d2 = ((t * speed + cycleLen * 0.5) % cycleLen);
        const dist = Math.hypot(r - centerR, c - centerC);
        const thr = (cols === 5) ? 0.85 : 1.1;
        const diff1 = Math.abs(dist - d1);
        const diff2 = Math.abs(dist - d2);

        if (diff1 < thr || diff2 < thr) {
          const activeD = diff1 < thr ? d1 : d2;
          const activeDiff = diff1 < thr ? diff1 : diff2;
          const fade = Math.max(0, 1.0 - activeD / maxDist) * (1.0 - activeDiff / thr);
          const hue = (Math.floor(t * 0.6) * 65 + (r + c) * (cols === 5 ? 28 : 18)) % 360;
          const [cr, cg, cb] = hslToRgb(hue, 1.0, 0.5);
          return [Math.round(cr * fade), Math.round(cg * fade), Math.round(cb * fade)];
        }
        return [5, 5, 14];
      }
      case 6: {
        const oceanPhase = t * 120.0;
        const wave = Math.round((Math.sin((oceanPhase + c * (cols === 5 ? 56 : 35)) * 0.02454) + 1.0) * 127.5);
        return [0, Math.round(wave * 0.6), wave];
      }
      case 7: {
        const flicker = Math.sin(t * 3.5 + c * 1.8) * (cols === 5 ? 0.8 : 0.9);
        const h = (rows - 1 - r) + flicker;
        const thr4 = cols === 5 ? 3.4 : 5.2;
        const thr3 = cols === 5 ? 2.0 : 3.2;
        const thr2 = cols === 5 ? 0.8 : 1.2;
        if (h > thr4) return [255, 230, 60];
        if (h > thr3) return [255, 120, 0];
        if (h > thr2) return [220, 25, 0];
        if (h >= 0.0) return [80, 8, 0];
        return [15, 2, 0];
      }
      case 8: {
        const barVal = (Math.sin(t * 2.5 + c * (cols === 5 ? 1.3 : 1.1)) * 0.5 + 0.5) * (rows - 0.4);
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
      case 9: {
        const freq = cols === 5 ? 1.2 : 0.8;
        const v = Math.sin(r * freq + t * 2.0) +
          Math.sin(c * freq + t * 2.6) +
          Math.sin((r + c) * 0.5 + t * 1.8);
        const hue = Math.round(((v + 3.0) * 60 + t * 40) % 360);
        return hslToRgb(hue, 1.0, 0.5);
      }
      case 10: {
        const maxRing = cols === 5 ? 3.8 : 5.2;
        const ring1 = ((t * 3.5) % maxRing);
        const ring2 = ((t * 3.5 + maxRing * 0.5) % maxRing);
        const dist = Math.hypot(r - centerR, c - centerC);
        const d1 = Math.abs(dist - ring1);
        const d2 = Math.abs(dist - ring2);
        if (d1 < 0.85) {
          const b1 = Math.round((1.0 - (d1 / 0.85)) * 240);
          return [b1, b1, 255];
        }
        if (d2 < 0.85) {
          const b2 = Math.round((1.0 - (d2 / 0.85)) * 200);
          return [Math.round(b2 * 0.4), b2, 255];
        }
        return [5, 6, 18];
      }
      case 11: {
        const fx = Math.abs(c - centerC);
        const fy = Math.abs(r - centerR);
        const pTime = t * 2.5;
        const fScale = cols === 5 ? 2.5 : 1.7;
        const mand = Math.sin(fx * fScale + pTime) * Math.cos(fy * fScale - pTime) + Math.sin((fx + fy) * (fScale * 0.65) + pTime * 1.4);
        const hue = Math.round(((mand + 2.0) * 85 + t * 76.9) % 360);
        return hslToRgb(hue, 1.0, 0.55);
      }
      case 12: {
        const dx = c - centerC;
        const dy = r - centerR;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const tunnel = (((t * 1.6 - (1.0 / (dist + 0.2)) * (3.5 * scale)) % 1) + 1) % 1;
        const hue = Math.round(((angle / Math.PI + 1.0) * 180 + t * 65) % 360);
        const br = Math.sin(tunnel * Math.PI * 2) * 0.5 + 0.5;
        return hslToRgb(hue, 1.0, Math.max(0.08, br * 0.55));
      }
      case 13: {
        const pTime = t * 1.6;
        const m1x = centerC + Math.sin(pTime * 1.1) * (2.0 * scale);
        const m1y = centerR + Math.cos(pTime * 1.4) * (2.0 * scale);
        const m2x = centerC + Math.cos(pTime * 0.9) * (2.2 * scale);
        const m2y = centerR + Math.sin(pTime * 1.5) * (2.2 * scale);
        const m3x = centerC + Math.sin(pTime * 1.7 + 1.0) * (1.8 * scale);
        const m3y = centerR + Math.cos(pTime * 1.2 + 1.0) * (1.8 * scale);

        const field = (1.0 / (Math.pow(c - m1x, 2) + Math.pow(r - m1y, 2) + 0.45 * scale))
          + (1.0 / (Math.pow(c - m2x, 2) + Math.pow(r - m2y, 2) + 0.45 * scale))
          + (1.0 / (Math.pow(c - m3x, 2) + Math.pow(r - m3y, 2) + 0.45 * scale));
        const hue = Math.round((field * 140 + t * 50) % 360);
        const br = Math.min(1.0, field * 0.55);
        return hslToRgb(hue, 1.0, br * 0.55);
      }
      case 14: {
        const dx = c - centerC;
        const dy = r - centerR;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const spiral = angle * 2.0 + dist * (1.7 / scale) - t * 3.2;
        const hue = Math.round((spiral * (180 / Math.PI) + 720) % 360);
        const pulse = Math.sin(spiral * 2.0) * 0.5 + 0.5;
        return hslToRgb(hue, 1.0, Math.max(0.1, pulse * 0.55));
      }
      case 15: {
        const pTime = t * 1.6;
        const wave1 = Math.sin(c * (cols === 5 ? 1.1 : 0.7) + pTime * 1.8) * (1.7 * scale);
        const wave2 = Math.cos(c * (cols === 5 ? 1.7 : 1.1) - pTime * 1.4) * (1.1 * scale);
        const targetY = centerR + wave1 + wave2;
        const distY = Math.abs(r - targetY);
        const intensity = Math.max(0, 1.0 - distY / (2.7 * scale));
        const hue = Math.round((c * (cols === 5 ? 45 : 30) + r * (cols === 5 ? 35 : 22) + t * 70) % 360);
        return hslToRgb(hue, 1.0, intensity * 0.6);
      }
      case 16: {
        const bass = (typeof masterBassEnergy === 'number') ? masterBassEnergy : 0.0;
        const dist = Math.hypot(r - centerR, c - centerC);
        const maxDist = cols === 5 ? 3.4 : 5.4;
        const normDist = Math.max(0, 1.0 - (dist / maxDist));
        const pulse = Math.min(1.0, normDist * (0.18 + bass * 0.92));
        const hue = Math.round((t * 50 + dist * 35 + bass * 120) % 360);
        return hslToRgb(hue, 1.0, Math.max(0.04, pulse * 0.8));
      }
      default: {
        const hue = (t * 30 + (r * 25) + (c * 20)) % 360;
        return hslToRgb(hue, 0.9, 0.4);
      }
    }
  } catch (e) {
    return [12, 18, 30];
  }
}

function syncPressEffectUI(effectId) {
  const meta = PRESS_EFFECTS_META.find(e => e.id === effectId) || PRESS_EFFECTS_META[0];
  const titleTag = document.getElementById('preview-effect-title');
  const descTag = document.getElementById('preview-effect-desc');
  if (titleTag) titleTag.textContent = meta.title;
  if (descTag) descTag.textContent = meta.desc;

  const chipsContainer = document.getElementById('effect-quick-chips');
  if (chipsContainer) {
    chipsContainer.querySelectorAll('.effect-chip').forEach(chip => {
      if (chip.dataset.effectId === String(effectId)) {
        chip.classList.add('active');
        try {
          chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        } catch (e) { }
      } else {
        chip.classList.remove('active');
      }
    });
  }
}

function selectPressEffect(effectId) {
  state.pressEffect = effectId;
  const pressSelect = document.getElementById('select-press-effect');
  if (pressSelect) pressSelect.value = String(effectId);
  syncPressEffectUI(effectId);
  sendSerial(`E ${state.pressEffect} ${state.idleEffect || 11} ${state.blendMode || 0}`);
  saveSoundboardConfig();
  triggerPreviewEffect(effectId);
}

function triggerPreviewEffect(effectId, row = null, col = null) {
  lastPreviewInteraction = performance.now();
  const rows = state.gridRows || 8;
  const cols = state.gridCols || 8;
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  const targetR = (row !== null && row !== undefined) ? row : centerR;
  const targetC = (col !== null && col !== undefined) ? col : centerC;

  const meta = PRESS_EFFECTS_META.find(e => e.id === effectId) || PRESS_EFFECTS_META[0];
  let dur = 900;
  if (effectId === 0) dur = 380;
  else if (effectId === 4 || effectId === 12) dur = 650;
  else if (effectId === 10 || effectId === 11) dur = 1200;

  activePreviewEffects.push({
    id: effectId,
    r: targetR,
    c: targetC,
    startTime: performance.now(),
    duration: dur,
    color: meta.color,
    seed: Math.random()
  });

  if (activePreviewEffects.length > 6) activePreviewEffects.shift();

  if (effectId === 3 || effectId === 10 || effectId === 6 || effectId === 4 || effectId === 12) {
    const count = effectId === 10 ? 24 : (effectId === 3 ? 18 : 12);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = (cols === 5 ? 0.022 : 0.035) + Math.random() * (cols === 5 ? 0.03 : 0.045);
      previewParticles.push({
        x: targetC,
        y: targetR,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: effectId === 6 ? (Math.random() > 0.5 ? '#ff3b00' : '#ffaa00') : meta.color,
        size: (cols === 5 ? 1.4 : 1.8) + Math.random() * (cols === 5 ? 1.6 : 2.2),
        life: 1.0,
        decay: (cols === 5 ? 0.024 : 0.018) + Math.random() * 0.022
      });
    }
  }
}

function onLightsTabActivated() {
  if (previewCanvas) {
    const rect = previewCanvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (previewCanvas.parentElement?.clientWidth || 320);
    const h = rect.height > 0 ? rect.height : 335;
    const dpr = window.devicePixelRatio || 1;
    previewCanvas.width = Math.round(w * dpr);
    previewCanvas.height = Math.round(h * dpr);
  }
  const currentEff = state.pressEffect !== undefined ? state.pressEffect : 1;
  syncPressEffectUI(currentEff);
  syncIdleEffectUI(state.idleEffect ?? 11);
  syncBlendModeUI(state.blendMode ?? 0);
  triggerPreviewEffect(currentEff);
}

function syncIdleEffectUI(idleId) {
  const meta = IDLE_EFFECTS_META.find(e => e.id === idleId) || IDLE_EFFECTS_META.find(e => e.id === 11) || IDLE_EFFECTS_META[0];
  const nameEl = document.getElementById('idle-active-name');
  const descEl = document.getElementById('idle-active-desc');
  if (nameEl) nameEl.textContent = meta.name;
  if (descEl) descEl.textContent = meta.desc;

  const sel = document.getElementById('select-idle-effect');
  if (sel) sel.value = String(idleId);

  const grid = document.getElementById('idle-effects-grid');
  if (grid) {
    grid.querySelectorAll('.idle-chip').forEach(chip => {
      if (chip.dataset.idleId === String(idleId)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }
}

function selectIdleEffect(idleId) {
  state.idleEffect = idleId;
  syncIdleEffectUI(idleId);
  sendSerial(`E ${state.pressEffect || 1} ${state.idleEffect} ${state.blendMode || 0}`);
  saveSoundboardConfig();
}

function syncBlendModeUI(modeId) {
  const meta = BLEND_MODES_META[modeId] || BLEND_MODES_META[0];
  const descEl = document.getElementById('blend-mode-desc-text');
  if (descEl) descEl.textContent = meta.desc;

  const sel = document.getElementById('select-blend-mode');
  if (sel) sel.value = String(modeId);

  const control = document.getElementById('blend-segmented-control');
  if (control) {
    control.querySelectorAll('.blend-segment-btn').forEach(btn => {
      if (btn.dataset.blend === String(modeId)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

function selectBlendMode(modeId) {
  state.blendMode = modeId;
  syncBlendModeUI(modeId);
  sendSerial(`E ${state.pressEffect || 1} ${state.idleEffect || 11} ${state.blendMode}`);
  saveSoundboardConfig();
}

function initIdleEffectsCatalog() {
  const grid = document.getElementById('idle-effects-grid');
  const pillsContainer = document.getElementById('idle-category-pills');
  if (!grid) return;

  let currentCategory = 'all';

  const renderGrid = () => {
    grid.innerHTML = '';
    const filtered = (currentCategory === 'all')
      ? IDLE_EFFECTS_META
      : IDLE_EFFECTS_META.filter(item => item.category === currentCategory);

    filtered.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `idle-chip ${item.id === (state.idleEffect ?? 11) ? 'active' : ''}`;
      chip.dataset.idleId = String(item.id);
      chip.title = `${item.name}: ${item.desc}`;
      chip.innerHTML = `
        <span class="idle-chip-name">${item.name}</span>
        <span class="idle-chip-tag">${item.badge}</span>
      `;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        selectIdleEffect(item.id);
      });
      grid.appendChild(chip);
    });
  };

  if (pillsContainer) {
    pillsContainer.querySelectorAll('.idle-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pillsContainer.querySelectorAll('.idle-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.dataset.category || 'all';
        renderGrid();
      });
    });
  }

  renderGrid();
  syncIdleEffectUI(state.idleEffect ?? 11);
}

function initBlendModeControl() {
  const control = document.getElementById('blend-segmented-control');
  if (!control) return;

  control.querySelectorAll('.blend-segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modeId = parseInt(btn.dataset.blend, 10);
      selectBlendMode(modeId);
    });
  });

  syncBlendModeUI(state.blendMode ?? 0);
}

function getLightingPreviewMetrics(cw, ch, cols, rows) {
  const is5x3 = (cols === 5);

  const padSize = is5x3 ? 38 : 27;
  const gap = is5x3 ? 7 : 4.5;
  const radius = is5x3 ? 6 : 5;

  const totalGridW = cols * padSize + (cols - 1) * gap;
  const totalGridH = rows * padSize + (rows - 1) * gap;
  const gridX0 = (cw - totalGridW) / 2;

  const topClearance = is5x3 ? 54 : 52;
  const gridY0 = Math.max(topClearance, (ch - totalGridH + 20) / 2);

  return { padSize, gap, radius, totalGridW, totalGridH, gridX0, gridY0 };
}

function initLightingPreviewEngine() {
  previewCanvas = document.getElementById('effect-preview-canvas');
  if (!previewCanvas) return;
  previewCtx = previewCanvas.getContext('2d');

  const previewScreen = document.querySelector('.effect-preview-screen');
  const chipsContainer = document.getElementById('effect-quick-chips');
  const btnTestPad = document.getElementById('btn-preview-press-effect');
  const pressSelect = document.getElementById('select-press-effect');

  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    PRESS_EFFECTS_META.forEach(meta => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `effect-chip ${meta.id === (state.pressEffect ?? 1) ? 'active' : ''}`;
      chip.textContent = meta.short;
      chip.title = `${meta.name}: ${meta.desc}`;
      chip.dataset.effectId = String(meta.id);
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPressEffect(meta.id);
      });
      chipsContainer.appendChild(chip);
    });
  }

  syncPressEffectUI(state.pressEffect ?? 1);

  const resizeCanvas = () => {
    if (!previewCanvas) return;
    const rect = previewCanvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (previewCanvas.parentElement?.clientWidth || 320);
    const h = rect.height > 0 ? rect.height : 335;
    const dpr = window.devicePixelRatio || 1;
    previewCanvas.width = Math.round(w * dpr);
    previewCanvas.height = Math.round(h * dpr);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const screenPosToGrid = (clientX, clientY) => {
    const rect = previewCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(260, previewCanvas.width / dpr);
    const ch = Math.max(200, previewCanvas.height / dpr);

    const cols = state.gridCols || 8;
    const rows = state.gridRows || 8;
    const { padSize, gap, gridX0, gridY0 } = getLightingPreviewMetrics(cw, ch, cols, rows);

    const relX = (clientX - rect.left) - gridX0;
    const relY = (clientY - rect.top) - gridY0;

    let col = relX / (padSize + gap);
    let row = relY / (padSize + gap);
    col = Math.max(0, Math.min(cols - 1, col));
    row = Math.max(0, Math.min(rows - 1, row));
    return { r: row, c: col };
  };

  if (previewScreen) {
    previewScreen.addEventListener('pointerdown', (e) => {
      recordActivity(true);
      const coords = screenPosToGrid(e.clientX, e.clientY);
      const eff = state.pressEffect ?? 1;
      triggerPreviewEffect(eff, coords.r, coords.c);

      if (state.isConnected) {
        const cols = state.gridCols || 8;
        const hwCol = (cols - 1) - Math.round(coords.c);
        sendSerial(`T ${Math.round(coords.r)} ${hwCol} ${eff}`);
      }
    });
  }

  if (btnTestPad) {
    btnTestPad.addEventListener('click', (e) => {
      e.stopPropagation();
      const eff = state.pressEffect ?? 1;
      const centerR = ((state.gridRows || 8) - 1) / 2;
      const centerC = ((state.gridCols || 8) - 1) / 2;
      triggerPreviewEffect(eff, centerR, centerC);

      if (state.isConnected) {
        sendSerial(`T ${Math.round(centerR)} ${Math.round(centerC)} ${eff}`);
        showToast(`Disparado efecto #${eff} en Launchpad USB`, 'check');
      } else {
        showToast('Efecto animado en preview (Conecta USB para probar en pad físico)', 'info');
      }
    });
  }

  if (pressSelect) {
    pressSelect.addEventListener('change', () => {
      const eff = parseInt(pressSelect.value, 10);
      const centerR = ((state.gridRows || 8) - 1) / 2;
      const centerC = ((state.gridCols || 8) - 1) / 2;
      syncPressEffectUI(eff);
      triggerPreviewEffect(eff, centerR, centerC);
    });
  }

  if (previewAnimId) cancelAnimationFrame(previewAnimId);
  function renderLoop(now) {
    try {
      renderPreviewCanvasFrame(now);
    } catch (err) {
      console.warn('[Preview Visualizer Error]:', err);
    } finally {
      previewAnimId = requestAnimationFrame(renderLoop);
    }
  }
  previewAnimId = requestAnimationFrame(renderLoop);
}

function renderPreviewCanvasFrame(now) {
  if (!previewCtx || !previewCanvas) return;

  const tabLights = document.getElementById('tab-lights');
  const isLightsVisible = tabLights && tabLights.classList.contains('active');
  const cols = state.gridCols || 8;
  const rows = state.gridRows || 8;
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;

  if (isLightsVisible && (now - lastPreviewInteraction > 15000) && state.blendMode !== 2) {
    triggerPreviewEffect(state.pressEffect ?? 1, centerR, centerC);
  }

  const dpr = window.devicePixelRatio || 1;
  const cw = Math.max(260, previewCanvas.width / dpr);
  const ch = Math.max(200, previewCanvas.height / dpr);

  const ctx = previewCtx;
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cw, ch);

  const bgGrad = ctx.createRadialGradient(cw / 2, ch / 2, 10, cw / 2, ch / 2, cw / 1.4);
  bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
  bgGrad.addColorStop(1, 'rgba(4, 7, 14, 0.98)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;

  for (let x = 0; x < cw; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }

  const { padSize, gap, radius, totalGridW, totalGridH, gridX0, gridY0 } = getLightingPreviewMetrics(cw, ch, cols, rows);

  ctx.fillStyle = 'rgba(10, 14, 22, 0.96)';
  ctx.strokeStyle = 'rgba(195, 234, 43, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(gridX0 - 8, gridY0 - 8, totalGridW + 16, totalGridH + 16, 8);
  ctx.fill();
  ctx.stroke();

  activePreviewEffects = activePreviewEffects.filter(eff => (now - eff.startTime) < (eff.duration || 900));

  const currentBankPads = (state.banks && state.banks[state.currentBankId]) || [];
  const idleMode = state.idleEffect !== undefined ? state.idleEffect : 11;
  const blendMode = state.blendMode !== undefined ? state.blendMode : 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = gridX0 + c * (padSize + gap);
      const py = gridY0 + r * (padSize + gap);
      const padIdx = r * cols + c;
      const padData = currentBankPads[padIdx];

      const idleRgb = computeIdleLedColor(r, c, idleMode, now, rows, cols);
      const isSoundPad = padData && (padData.audioPath || padData.synthType) && padData.rgb;

      let baseR = 14, baseG = 20, baseB = 32;

      const isScreensaver = (blendMode === 2) && ((Date.now() - (state.lastActivityTime || 0)) > 15000);

      if (isScreensaver) {
        baseR = idleRgb[0];
        baseG = idleRgb[1];
        baseB = idleRgb[2];
      }
      else if (blendMode === 0 || blendMode === 2) {
        if (isSoundPad) {
          const animEnergy = (idleRgb[0] * 0.299 + idleRgb[1] * 0.587 + idleRgb[2] * 0.114) / 255.0;
          const boost = 0.82 + animEnergy * 0.28;
          baseR = Math.min(255, Math.round(padData.rgb[0] * boost));
          baseG = Math.min(255, Math.round(padData.rgb[1] * boost));
          baseB = Math.min(255, Math.round(padData.rgb[2] * boost));
        }
        else {
          baseR = idleRgb[0];
          baseG = idleRgb[1];
          baseB = idleRgb[2];
        }
      }
      else if (blendMode === 1) {
        if (isSoundPad) {
          baseR = padData.rgb[0];
          baseG = padData.rgb[1];
          baseB = padData.rgb[2];
        }
        else {
          baseR = idleRgb[0];
          baseG = idleRgb[1];
          baseB = idleRgb[2];
        }
      }

      let effIntensity = 0;
      let effColor = null;

      for (const eff of activePreviewEffects) {
        const rawT = (now - eff.startTime) / (eff.duration || 900);
        const t = Math.max(0, Math.min(1, isNaN(rawT) ? 0 : rawT));
        const dr = r - eff.r;
        const dc = c - eff.c;
        const dist = Math.hypot(dr, dc);

        let intensity = 0;
        let col = eff.color;

        switch (eff.id) {
          case 0: {
            const radPoint = cols === 5 ? 0.55 : 0.6;
            const radSpread = cols === 5 ? 1.4 : 1.8;
            if (dist < radPoint) intensity = Math.max(0, 1 - t * 2.5);
            else if (dist < radSpread) intensity = Math.max(0, 0.45 * (1 - dist / radSpread) * (1 - t * 2));
            col = '#ffffff';
            break;
          }

          case 1: {
            const maxWaveR = cols === 5 ? 6.2 : 9.5;
            const waveR = t * maxWaveR;
            const diff = Math.abs(dist - waveR);
            if (diff < 1.3) intensity = Math.max(0, (1 - diff / 1.3) * (1 - t * 0.8));
            break;
          }

          case 2: {
            const inCross = Math.abs(dr) < 0.6 || Math.abs(dc) < 0.6;
            const laserDist = Math.max(Math.abs(dr), Math.abs(dc));
            const maxLaser = cols === 5 ? 6.2 : 10.0;
            if (inCross && laserDist <= t * maxLaser) {
              intensity = Math.max(0, (1 - t * 0.95));
            }
            break;
          }

          case 3: {
            const maxStarR = cols === 5 ? 5.2 : 8.0;
            const starR = t * maxStarR;
            const angles = [0, 45, 90, 135, 180, 225, 270, 315];
            const ptAngle = (Math.atan2(dr, dc) * 180 / Math.PI + 360) % 360;
            for (const a of angles) {
              let diffA = Math.abs(ptAngle - a);
              if (diffA > 180) diffA = 360 - diffA;
              if (diffA < 18 && Math.abs(dist - starR) < 1.2) {
                intensity = Math.max(0, (1 - diffA / 18) * (1 - Math.abs(dist - starR) / 1.2) * (1 - t));
                break;
              }
            }
            break;
          }

          case 4: {
            const flicker = Math.sin(t * 35 + (eff.seed || 0.5) * 20) > 0.0;
            const maxSparkDist = cols === 5 ? 2.5 : 3.8;
            if (flicker && (dist < maxSparkDist)) {
              const hash = Math.sin(r * 12.9898 + c * 78.233 + Math.floor(t * 12)) * 43758.5453;
              if ((hash - Math.floor(hash)) > 0.55) {
                intensity = Math.max(0, (1 - t * 0.8));
              }
            }
            break;
          }

          case 5: {
            const manhattan = Math.abs(dr) + Math.abs(dc);
            const maxDiaR = cols === 5 ? 8.2 : 12.5;
            const diaR = t * maxDiaR;
            const diff = Math.abs(manhattan - diaR);
            if (diff < 1.2) intensity = Math.max(0, (1 - diff / 1.2) * (1 - t * 0.85));
            break;
          }

          case 6: {
            const maxFireR = cols === 5 ? 5.8 : 9.0;
            const waveR = t * maxFireR;
            const diff = Math.abs(dist - waveR);
            if (diff < 1.4) {
              intensity = Math.max(0, (1 - diff / 1.4) * (1 - t * 0.85));
              col = t < 0.4 ? '#ffcc00' : '#ff4500';
            }
            break;
          }

          case 7: {
            const angle = Math.atan2(dr, dc);
            const maxSpiral = cols === 5 ? 5.2 : 8.0;
            const expectedDist = ((angle + t * Math.PI * 5 + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2) * maxSpiral;
            const diff = Math.abs(dist - expectedDist);
            if (diff < 1.4) intensity = Math.max(0, (1 - diff / 1.4) * (1 - t * 0.9));
            break;
          }

          case 8: {
            const maxShockR = cols === 5 ? 6.4 : 10.0;
            const r1 = t * maxShockR;
            const r2 = Math.max(0, (t - 0.22) * maxShockR);
            const diff1 = Math.abs(dist - r1);
            const diff2 = Math.abs(dist - r2);
            let p1 = diff1 < 1.2 ? Math.max(0, (1 - diff1 / 1.2) * (1 - t)) : 0;
            let p2 = diff2 < 1.2 ? Math.max(0, (1 - diff2 / 1.2) * (1 - t)) : 0;
            intensity = Math.max(p1, p2);
            break;
          }

          case 9: {
            const maxRainR = cols === 5 ? 5.8 : 9.0;
            const waveR = t * maxRainR;
            const diff = Math.abs(dist - waveR);
            if (diff < 1.3) {
              intensity = Math.max(0, (1 - diff / 1.3) * (1 - t * 0.85));
              const hue = Math.round((t * 360 + Math.atan2(dr, dc) * (180 / Math.PI) + 360) % 360);
              col = `hsl(${hue}, 100%, 65%)`;
            }
            break;
          }

          case 10: {
            const maxW1 = cols === 5 ? 4.8 : 7.5;
            const maxW2 = cols === 5 ? 7.2 : 11.0;
            const wave1 = t * maxW1;
            const wave2 = t * maxW2;
            const d1 = Math.abs(dist - wave1);
            const d2 = Math.abs(dist - wave2);
            const coreRad = cols === 5 ? 1.0 : 1.5;
            const pCore = (dist < coreRad && t < 0.35) ? (1 - t / 0.35) : 0;
            const p1 = d1 < 1.2 ? (1 - d1 / 1.2) * (1 - t) : 0;
            const p2 = d2 < 1.2 ? (1 - d2 / 1.2) * (1 - t) : 0;
            intensity = Math.max(pCore, Math.max(p1, p2));
            col = t < 0.25 ? '#ffffff' : '#facc15';
            break;
          }

          case 11: {
            const angle = Math.atan2(dr, dc);
            const maxArm = cols === 5 ? 5.2 : 8.0;
            const arm1 = ((angle + t * 10) % (Math.PI * 2)) / (Math.PI * 2) * maxArm;
            const arm2 = ((angle + Math.PI + t * 10) % (Math.PI * 2)) / (Math.PI * 2) * maxArm;
            const diff1 = Math.abs(dist - arm1);
            const diff2 = Math.abs(dist - arm2);
            intensity = Math.max(
              diff1 < 1.3 ? (1 - diff1 / 1.3) * (1 - t) : 0,
              diff2 < 1.3 ? (1 - diff2 / 1.3) * (1 - t) : 0
            );
            break;
          }

          case 12: {
            const seed = (eff.seed || 0.5) * 100;
            const maxArcDist = cols === 5 ? 2.8 : 4.2;
            const inArc = ((Math.sin(dist * 3.5 + t * 25 + seed) > 0.4) && dist < maxArcDist);
            if (inArc) {
              intensity = Math.max(0, (1 - t * 0.9));
              col = (t * 20 % 2 > 1) ? '#ffffff' : '#38bdf8';
            }
            break;
          }
        }

        if (intensity > effIntensity) {
          effIntensity = intensity;
          effColor = col;
        }
      }

      ctx.beginPath();
      ctx.roundRect(px, py, padSize, padSize, radius);

      if (effIntensity > 0.05 && effColor) {
        ctx.fillStyle = effColor;
        ctx.globalAlpha = Math.max(0, Math.min(1, effIntensity));
        ctx.shadowBlur = 12 * effIntensity;
        ctx.shadowColor = effColor;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
      else {
        ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
        ctx.fill();

        const br = (baseR + baseG + baseB) / 3;

        if (br > 45) {
          ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 0.55)`;
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
          ctx.lineWidth = 0.6;
        }

        ctx.stroke();
      }
    }
  }

  previewParticles = previewParticles.filter(p => p.life > 0.02);

  for (const p of previewParticles) {
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    p.life -= p.decay || 0.02;

    const screenX = gridX0 + p.x * (padSize + gap) + padSize / 2;
    const screenY = gridY0 + p.y * (padSize + gap) + padSize / 2;
    const rad = Math.max(0.1, p.size || 1.8);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color || '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color || '#00f0ff';
    ctx.beginPath();
    ctx.arc(screenX, screenY, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const eff of activePreviewEffects) {
    const rawT = (now - eff.startTime) / (eff.duration || 900);
    const t = Math.max(0, Math.min(1, isNaN(rawT) ? 0 : rawT));
    const centerScreenX = gridX0 + eff.c * (padSize + gap) + padSize / 2;
    const centerScreenY = gridY0 + eff.r * (padSize + gap) + padSize / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, (1 - t) * 0.85);
    ctx.strokeStyle = eff.color || '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = eff.color || '#00f0ff';

    if (eff.id === 1 || eff.id === 8 || eff.id === 9 || eff.id === 10) {
      const rPx = Math.max(0.1, t * (totalGridW * 0.68));
      ctx.lineWidth = Math.max(1.2, 3.0 * (1 - t));
      ctx.beginPath();
      ctx.arc(centerScreenX, centerScreenY, rPx, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (eff.id === 2) {
      const reach = Math.max(0.1, t * (totalGridW * 0.72));
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(centerScreenX - reach, centerScreenY);
      ctx.lineTo(centerScreenX + reach, centerScreenY);
      ctx.moveTo(centerScreenX, centerScreenY - reach);
      ctx.lineTo(centerScreenX, centerScreenY + reach);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

async function handleAudioFileUpload(file, padIndex) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const pad = currentPads()[padIndex];
    pad.audioBuffer = audioBuffer;
    pad.audioBlob = file;
    pad.audioUrl = URL.createObjectURL(file);
    pad.name = file.name.replace(/\.[^/.]+$/, "");
    pad.synthType = null;
    pad.trimStart = null;
    pad.trimEnd = null;

    const relativePath = await saveCustomAudioFile(state.currentBankId, padIndex, file.name, arrayBuffer);

    if (relativePath) {
      pad.audioPath = relativePath;
    }

    updatePadVisual(padIndex);
    selectPad(padIndex);
    syncPadToHardware(padIndex);
    renderBankPills();

    await saveSoundboardConfig();

    showToast(`"${pad.name}" guardado permanentemente`, 'check');
  }
  catch (err) {
    console.error('Error cargando el audio:', err);
    alert('Error cargando el audio. Asegúrate de usar un archivo MP3, WAV u OGG válido.');
  }
}

function setupRecorderModal() {
  let mediaRecorder = null;
  let audioChunks = [];
  let recordTimerInterval = null;
  let recordSeconds = 0;

  const modal = document.getElementById('record-modal');
  const btnOpen = document.getElementById('btn-record-mic');
  const btnStart = document.getElementById('btn-start-record');
  const btnStop = document.getElementById('btn-stop-record');
  const btnCancel = document.getElementById('btn-cancel-record');
  const timerEl = document.getElementById('record-timer');

  btnOpen.addEventListener('click', () => {
    modal.style.display = 'flex';
    btnStart.style.display = 'inline-flex';
    btnStop.style.display = 'none';
    timerEl.textContent = '00:00';
    recordSeconds = 0;
  });

  btnCancel.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    clearInterval(recordTimerInterval);
    modal.style.display = 'none';
  });

  btnStart.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

        const padIndex = state.selectedPadIndex;
        const pad = currentPads()[padIndex];
        pad.audioBuffer = audioBuffer;
        pad.audioBlob = audioBlob;
        pad.audioUrl = URL.createObjectURL(audioBlob);
        pad.name = `Voz ${pad.id + 1}`;
        pad.synthType = null;

        const relativePath = await saveCustomAudioFile(state.currentBankId, padIndex, `grabacion_${padIndex + 1}.ogg`, arrayBuffer);
        if (relativePath) {
          pad.audioPath = relativePath;
        }

        updatePadVisual(padIndex);
        selectPad(padIndex);
        syncPadToHardware(padIndex);
        renderBankPills();
        await saveSoundboardConfig();

        showToast(`Grabación guardada en Pad #${padIndex + 1}`, 'mic');

        modal.style.display = 'none';
      };

      mediaRecorder.start();
      btnStart.style.display = 'none';
      btnStop.style.display = 'inline-flex';

      recordSeconds = 0;
      recordTimerInterval = setInterval(() => {
        recordSeconds++;
        const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
        const secs = String(recordSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }, 1000);

    } catch (err) {
      alert('No se pudo acceder al micrófono.');
    }
  });

  btnStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      clearInterval(recordTimerInterval);
    }
  });
}

function updateSaveIndicator(status) {
  const pill = document.getElementById('save-status-pill');
  const txt = document.getElementById('save-status-text');

  if (!pill || !txt) return;

  if (status === 'saving') {
    pill.className = 'save-status-pill saving';
    txt.textContent = 'GUARDANDO...';
  }
  else if (status === 'saved') {
    pill.className = 'save-status-pill saved';
    txt.textContent = 'GUARDADO EN DISCO';
    setTimeout(() => {
      if (pill.classList.contains('saved')) {
        txt.textContent = 'AUTO-SAVE ACTIVO';
      }
    }, 2000);
  }
}

function showToast(message, iconType = 'info', duration = 2400) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  if (typeof iconType === 'number') {
    duration = iconType;
    iconType = 'info';
  }

  container.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast toast-${iconType}`;

  const iconHtml = getIconSvg(iconType, 16);
  toast.innerHTML = `<span class="toast-icon">${iconHtml}</span><span class="toast-text">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 15);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

async function saveCustomAudioFile(bankId, padIndex, fileName, arrayBuffer) {
  updateSaveIndicator('saving');
  if (ipcRenderer) {
    try {
      const res = await ipcRenderer.invoke('save-custom-audio', {
        bankId,
        padIndex,
        fileName,
        buffer: arrayBuffer
      });
      if (res && res.success) {
        return res.relativePath;
      }
    }
    catch (e) {
      console.error('Error al guardar audio custom via IPC:', e);
    }
  }
  else {
    try {
      const base64 = arrayBufferToBase64(arrayBuffer);
      const res = await fetch('/api/save-custom-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId, padIndex, fileName, data: base64 })
      });
      const data = await res.json();
      if (data && data.success) {
        return data.relativePath;
      }
    }
    catch (e) {
      console.error('Error al guardar audio custom via HTTP:', e);
    }
  }

  return null;
}

async function deleteCustomAudioFile(bankId, padIndex) {
  if (ipcRenderer) {
    try {
      await ipcRenderer.invoke('delete-custom-audio', { bankId, padIndex });
    }
    catch (e) { }
  }
  else {
    try {
      await fetch('/api/delete-custom-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId, padIndex })
      });
    }
    catch (e) { }
  }
}

function serializeBankPads(bankPads) {
  return bankPads.map(pad => ({
    id: pad.id,
    row: pad.row,
    col: pad.col,
    name: pad.name,
    color: pad.color,
    rgb: pad.rgb,
    pressEffect: (pad.pressEffect !== undefined && pad.pressEffect !== null) ? pad.pressEffect : null,
    mode: pad.mode,
    volume: pad.volume,
    audioPath: pad.audioPath || null,
    synthType: pad.synthType || null,
    obsAction: pad.obsAction || 'none',
    obsTarget: pad.obsTarget || '',
    hotkey: pad.hotkey || null,
    trimStart: typeof pad.trimStart === 'number' ? pad.trimStart : null,
    trimEnd: typeof pad.trimEnd === 'number' ? pad.trimEnd : null
  }));
}

function getSoundboardConfig() {
  if (!state.bankSettings) state.bankSettings = {};
  if (state.currentBankId) {
    state.bankSettings[state.currentBankId] = {
      idleEffect: state.idleEffect,
      pressEffect: state.pressEffect,
      blendMode: state.blendMode !== undefined ? state.blendMode : 0
    };
  }

  if (!state.gridProfiles) state.gridProfiles = {};
  state.gridProfiles[state.gridType] = {
    currentBankId: state.currentBankId,
    bankOrder: state.bankOrder || Object.keys(state.banks),
    bankNames: state.bankNames || {},
    bankSettings: state.bankSettings || {},
    banks: state.banks
  };

  const config = {
    version: 2,
    gridType: state.gridType || '8x8',
    lastSaved: new Date().toISOString(),
    fnKeyEnabled: state.fnKeyEnabled !== undefined ? state.fnKeyEnabled : true,
    currentBankId: state.currentBankId,
    bankOrder: state.bankOrder || Object.keys(state.banks),
    bankNames: state.bankNames || {},
    bankSettings: state.bankSettings || {},
    masterVolume: state.masterVolume,
    botDiscordVolume: state.botDiscord.volume,
    pressEffect: state.pressEffect,
    idleEffect: state.idleEffect,
    blendMode: state.blendMode !== undefined ? state.blendMode : 0,
    selectedHeadphonesId: state.selectedHeadphonesId,
    selectedDiscordId: state.selectedDiscordId,
    muteLocalOnDiscord: state.muteLocalOnDiscord,
    gridProfiles: {},
    banks: {}
  };

  for (const bankId of Object.keys(state.banks)) {
    config.banks[bankId] = serializeBankPads(state.banks[bankId]);
  }

  for (const gType of Object.keys(state.gridProfiles)) {
    const prof = state.gridProfiles[gType];
    config.gridProfiles[gType] = {
      currentBankId: prof.currentBankId,
      bankOrder: prof.bankOrder || [],
      bankNames: prof.bankNames || {},
      bankSettings: prof.bankSettings || (state.gridType === gType ? state.bankSettings : {}),
      banks: {}
    };

    for (const bId of Object.keys(prof.banks || {})) {
      config.gridProfiles[gType].banks[bId] = serializeBankPads(prof.banks[bId]);
    }
  }

  return config;
}

function updateSaveIndicator(status) {
  // Silent indicator
}

let saveDebounceTimer = null;
function saveSoundboardConfigDebounced(delay = 400) {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    await saveSoundboardConfig();
    showVolumeSavedBadge();
  }, delay);
}

async function saveSoundboardConfig() {
  const config = getSoundboardConfig();

  try {
    localStorage.setItem('launchpad_soundboard_config', JSON.stringify(config));
  }
  catch (e) { }

  if (ipcRenderer) {
    try {
      await ipcRenderer.invoke('save-soundboard-config', config);
    }
    catch (e) {
      console.warn('Error guardando soundboard_config via IPC:', e);
    }
  }
  else {
    try {
      await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    }
    catch (e) {
      console.warn('Error guardando soundboard_config via HTTP:', e);
    }
  }
}

async function loadOrInitSoundboard() {
  let savedConfig = null;

  if (ipcRenderer) {
    try {
      const res = await ipcRenderer.invoke('load-soundboard-config');
      if (res && res.success && res.config) {
        savedConfig = res.config;
      }
    }
    catch (e) {
      console.warn('Error leyendo config via IPC:', e);
    }
  }

  if (!savedConfig) {
    try {
      const res = await fetch('/api/load-config');

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) savedConfig = data.config;
      }
    }
    catch (e) { }
  }

  if (!savedConfig) {
    try {
      const stored = localStorage.getItem('launchpad_soundboard_config');
      if (stored) savedConfig = JSON.parse(stored);
    }
    catch (e) { }
  }

  if (savedConfig && (savedConfig.banks || savedConfig.gridProfiles)) {
    console.log(' [Config] Configuración guardada detectada. Restaurando bancos y sonidos...');
    await restoreFromConfig(savedConfig);
  }
  else {
    console.log(' [Config] No se detectó configuración previa. Inicializando presets de fábrica...');
    await generatePresetAudioBuffers();
    await saveSoundboardConfig();
  }
}

async function restoreFromConfig(savedConfig) {
  if (savedConfig.masterVolume !== undefined) {
    state.masterVolume = savedConfig.masterVolume;
    const sMaster = document.getElementById('slider-master-volume');
    if (sMaster) sMaster.value = Math.round(state.masterVolume * 100);
    const lMaster = document.getElementById('master-vol-label');
    if (lMaster) lMaster.textContent = `${Math.round(state.masterVolume * 100)}%`;
  }

  if (savedConfig.botDiscordVolume !== undefined) {
    state.botDiscord.volume = savedConfig.botDiscordVolume;
    const sBot = document.getElementById('slider-bot-discord-volume');
    const lBot = document.getElementById('bot-discord-vol-label');
    if (sBot) sBot.value = String(Math.round(state.botDiscord.volume * 100));
    if (lBot) lBot.textContent = `${Math.round(state.botDiscord.volume * 100)}%`;
  }

  if (savedConfig.muteLocalOnDiscord !== undefined) {
    state.muteLocalOnDiscord = !!savedConfig.muteLocalOnDiscord;
  } else {
    state.muteLocalOnDiscord = true;
  }
  const chkMuteLocal = document.getElementById('chk-mute-local-on-discord');
  if (chkMuteLocal) chkMuteLocal.checked = state.muteLocalOnDiscord;

  if (savedConfig.fnKeyEnabled !== undefined) {
    state.fnKeyEnabled = Boolean(savedConfig.fnKeyEnabled);
  } else {
    state.fnKeyEnabled = true;
  }
  const chkFnPad = document.getElementById('check-enable-fn-pad');
  if (chkFnPad) chkFnPad.checked = state.fnKeyEnabled;

  if (savedConfig.pressEffect !== undefined) {
    state.pressEffect = savedConfig.pressEffect;
    const sel = document.getElementById('select-press-effect');
    if (sel) sel.value = String(state.pressEffect);
    if (typeof syncPressEffectUI === 'function') syncPressEffectUI(state.pressEffect);
  }

  if (savedConfig.idleEffect !== undefined) {
    state.idleEffect = savedConfig.idleEffect;
    const sel = document.getElementById('select-idle-effect');
    if (sel) sel.value = String(state.idleEffect);
    if (typeof syncIdleEffectUI === 'function') syncIdleEffectUI(state.idleEffect);
  }

  if (savedConfig.blendMode !== undefined) {
    state.blendMode = savedConfig.blendMode;
    const sel = document.getElementById('select-blend-mode');
    if (sel) sel.value = String(state.blendMode);
    if (typeof syncBlendModeUI === 'function') syncBlendModeUI(state.blendMode);
  }

  const targetGridType = (savedConfig.gridType === '5x5') ? '5x5' : '8x8';
  state.gridType = targetGridType;
  state.gridRows = (targetGridType === '5x5') ? 5 : 8;
  state.gridCols = (targetGridType === '5x5') ? 5 : 8;
  state.gridPadCount = state.gridRows * state.gridCols;

  state.gridProfiles = {};

  if (savedConfig.gridProfiles && typeof savedConfig.gridProfiles === 'object') {
    for (const gType of ['8x8', '5x5']) {
      const gProf = savedConfig.gridProfiles[gType];
      if (gProf && gProf.banks) {
        const gRows = (gType === '5x5') ? 5 : 8;
        const gCols = (gType === '5x5') ? 5 : 8;
        const profBanks = {};
        for (const bId of Object.keys(gProf.banks)) {
          profBanks[bId] = createEmptyBank('Pad', gRows, gCols);
          const savedP = gProf.banks[bId];
          if (Array.isArray(savedP)) {
            savedP.forEach((sp, idx) => {
              if (idx >= gRows * gCols) return;
              const pad = profBanks[bId][idx];
              pad.name = sp.name || pad.name;
              pad.color = sp.color || pad.color;
              pad.rgb = sp.rgb || hexToRgb(pad.color);
              pad.mode = sp.mode || 'oneshot';
              pad.volume = (sp.volume !== undefined) ? sp.volume : 1.0;
              pad.pressEffect = (sp.pressEffect !== undefined && sp.pressEffect !== null) ? sp.pressEffect : null;
              pad.audioPath = sp.audioPath || null;
              pad.synthType = sp.synthType || null;
              pad.obsAction = sp.obsAction || 'none';
              pad.obsTarget = sp.obsTarget || '';
              pad.hotkey = sp.hotkey || null;
              pad.trimStart = (typeof sp.trimStart === 'number') ? sp.trimStart : null;
              pad.trimEnd = (typeof sp.trimEnd === 'number') ? sp.trimEnd : null;
            });
          }
        }
        state.gridProfiles[gType] = {
          currentBankId: gProf.currentBankId || 'capa_1',
          bankOrder: gProf.bankOrder || Object.keys(profBanks),
          bankNames: gProf.bankNames || {},
          bankSettings: gProf.bankSettings || {},
          banks: profBanks
        };
      }
    }
  }

  if (!state.gridProfiles['8x8']) {
    const banks8 = {};
    const srcBanks = savedConfig.banks || { 'capa_1': [] };
    for (const bId of Object.keys(srcBanks)) {
      banks8[bId] = createEmptyBank('Pad', 8, 8);
      const savedP = srcBanks[bId];
      if (Array.isArray(savedP)) {
        savedP.forEach((sp, idx) => {
          if (idx >= 64) return;
          const pad = banks8[bId][idx];
          pad.name = sp.name || pad.name;
          pad.color = sp.color || pad.color;
          pad.rgb = sp.rgb || hexToRgb(pad.color);
          pad.mode = sp.mode || 'oneshot';
          pad.volume = (sp.volume !== undefined) ? sp.volume : 1.0;
          pad.pressEffect = (sp.pressEffect !== undefined && sp.pressEffect !== null) ? sp.pressEffect : null;
          pad.audioPath = sp.audioPath || null;
          pad.synthType = sp.synthType || null;
          pad.obsAction = sp.obsAction || 'none';
          pad.obsTarget = sp.obsTarget || '';
          pad.hotkey = sp.hotkey || null;
          pad.trimStart = (typeof sp.trimStart === 'number') ? sp.trimStart : null;
          pad.trimEnd = (typeof sp.trimEnd === 'number') ? sp.trimEnd : null;
        });
      }
    }
    state.gridProfiles['8x8'] = {
      currentBankId: savedConfig.currentBankId || 'capa_1',
      bankOrder: (savedConfig.bankOrder && savedConfig.bankOrder.length > 0) ? savedConfig.bankOrder : Object.keys(banks8),
      bankNames: savedConfig.bankNames || { 'capa_1': 'Capa 1' },
      bankSettings: savedConfig.bankSettings || {},
      banks: banks8
    };
  }

  if (!state.gridProfiles['5x5']) {
    state.gridProfiles['5x5'] = {
      currentBankId: 'capa_1',
      bankOrder: ['capa_1'],
      bankNames: { 'capa_1': 'Capa 1' },
      bankSettings: {},
      banks: {
        'capa_1': createEmptyBank('Pad', 5, 5)
      }
    };
  }

  const activeProf = state.gridProfiles[targetGridType];
  state.currentBankId = activeProf.currentBankId || 'capa_1';
  state.bankOrder = (activeProf.bankOrder && activeProf.bankOrder.length > 0) ? activeProf.bankOrder : ['capa_1'];
  state.bankNames = activeProf.bankNames || { 'capa_1': 'Capa 1' };
  state.bankSettings = activeProf.bankSettings || savedConfig.bankSettings || {};
  state.banks = activeProf.banks;

  if (state.bankSettings && state.bankSettings[state.currentBankId]) {
    const activeLayerCfg = state.bankSettings[state.currentBankId];
    if (activeLayerCfg.idleEffect !== undefined) state.idleEffect = activeLayerCfg.idleEffect;
    if (activeLayerCfg.pressEffect !== undefined) state.pressEffect = activeLayerCfg.pressEffect;
    if (activeLayerCfg.blendMode !== undefined) state.blendMode = activeLayerCfg.blendMode;
    const selPress = document.getElementById('select-press-effect');
    if (selPress) selPress.value = String(state.pressEffect);
    const selIdle = document.getElementById('select-idle-effect');
    if (selIdle) selIdle.value = String(state.idleEffect);
    const selBlend = document.getElementById('select-blend-mode');
    if (selBlend) selBlend.value = String(state.blendMode);
    if (typeof syncPressEffectUI === 'function') syncPressEffectUI(state.pressEffect);
    if (typeof syncIdleEffectUI === 'function') syncIdleEffectUI(state.idleEffect);
    if (typeof syncBlendModeUI === 'function') syncBlendModeUI(state.blendMode);
  }

  const audioLoadPromises = [];
  for (const gType of Object.keys(state.gridProfiles)) {
    const prof = state.gridProfiles[gType];
    for (const bId of Object.keys(prof.banks || {})) {
      prof.banks[bId].forEach((pad, idx) => {
        if (pad.audioPath) {
          audioLoadPromises.push((async () => {
            try {
              const res = await fetch(pad.audioPath);
              if (res.ok) {
                const blob = await res.blob();
                pad.audioBlob = blob;
                const arrayBuf = await blob.arrayBuffer();
                pad.audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
                if (state.gridType === gType && state.currentBankId === bId) {
                  updatePadVisual(idx);
                }
              }
            } catch (err) {
              console.warn(`Audio no encontrado (${pad.audioPath}):`, err);
            }
          })());
        } else if (pad.synthType) {
          try {
            pad.audioBuffer = generateSoundFX(pad.synthType, audioCtx);
          } catch (e) { }
        }
      });
    }
  }

  const btn8 = document.getElementById('btn-grid-8x8');
  const btn5 = document.getElementById('btn-grid-5x5');
  const btnCopy = document.getElementById('btn-copy-from-8x8');
  if (btn8) btn8.classList.toggle('active', targetGridType === '8x8');
  if (btn5) btn5.classList.toggle('active', targetGridType === '5x5');
  if (btnCopy) btnCopy.style.display = (targetGridType === '5x5') ? 'inline-flex' : 'none';

  const hwLabel = document.getElementById('hardware-model-label');
  if (hwLabel) {
    hwLabel.textContent = (targetGridType === '5x5') ? 'LAUNCHPAD 5X5 MINI' : 'LAUNCHPAD 8X8 PRO';
  }

  const gridEl = document.getElementById('pads-grid');
  if (gridEl) {
    gridEl.classList.toggle('grid-5x5', targetGridType === '5x5');
    gridEl.style.setProperty('--grid-cols', state.gridCols);
    gridEl.style.setProperty('--grid-rows', state.gridRows);
  }

  resizeCanvas();
  renderBankPills();
  renderGrid();
  selectPad(state.selectedPadIndex);

  Promise.allSettled(audioLoadPromises).then(() => {
    renderGrid();
    selectPad(state.selectedPadIndex);
    if (state.isConnected) {
      sendSerial(`M ${state.blendMode || 0}`);
      sendSerial(`E ${state.pressEffect} ${state.idleEffect} ${state.blendMode || 0}`);
      syncAllPadsToHardware();
      syncLayerInfoToHardware();
    }
    if (typeof syncAllGlobalHotkeys === 'function') {
      syncAllGlobalHotkeys();
    }
  });
}

function initAudioVisualizerEngine() {
  try {
    getMasterAudioDestination();
  } catch (e) { }

  const vuLeft = document.getElementById('vu-meter-left');
  const vuRight = document.getElementById('vu-meter-right');
  const vuDb = document.getElementById('vu-meter-db');

  let decayLeft = 0;
  let decayRight = 0;

  function renderVisualizerLoop() {
    try {
      if (masterAudioAnalyser) {
        const binCount = masterAudioAnalyser.frequencyBinCount;
        const timeArray = new Uint8Array(binCount);
        const freqArray = new Uint8Array(binCount);

        masterAudioAnalyser.getByteTimeDomainData(timeArray);
        masterAudioAnalyser.getByteFrequencyData(freqArray);

        let sumSquares = 0;
        let peakSample = 0;

        for (let i = 0; i < binCount; i++) {
          const val = (timeArray[i] - 128) / 128;
          sumSquares += val * val;
          const absVal = Math.abs(val);
          if (absVal > peakSample) peakSample = absVal;
        }

        const rms = Math.sqrt(sumSquares / binCount);

        let bassSum = 0;
        const bassBins = Math.min(6, binCount);
        for (let b = 1; b <= bassBins; b++) {
          bassSum += freqArray[b];
        }
        masterBassEnergy = Math.min(1.0, (bassSum / (bassBins * 255)) * 1.55);

        const targetLeft = Math.min(100, peakSample * 125);
        const targetRight = Math.min(100, rms * 175);

        decayLeft = Math.max(targetLeft, decayLeft * 0.88);
        decayRight = Math.max(targetRight, decayRight * 0.90);

        if (vuLeft && vuRight) {
          vuLeft.style.width = `${decayLeft.toFixed(1)}%`;
          vuRight.style.width = `${decayRight.toFixed(1)}%`;
          if (vuDb) {
            if (peakSample < 0.005) {
              vuDb.textContent = '-inf';
            } else {
              const db = Math.round(20 * Math.log10(peakSample));
              vuDb.textContent = `${db}dB`;
            }
          }
        }
      }
    } catch (e) { }

    requestAnimationFrame(renderVisualizerLoop);
  }

  requestAnimationFrame(renderVisualizerLoop);
}

function initBatchDragAndDropEngine() {
  const launchpadFrame = document.getElementById('launchpad-frame');
  const dropOverlay = document.getElementById('drop-overlay');
  if (!launchpadFrame || !dropOverlay) return;

  let dragCounter = 0;

  launchpadFrame.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.add('active');
  });

  launchpadFrame.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  launchpadFrame.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropOverlay.classList.remove('active');
    }
  });

  launchpadFrame.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove('active');

    const files = Array.from(e.dataTransfer.files || []).filter(f =>
      f.name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i)
    );

    if (files.length === 0) {
      showToast('No se detectaron archivos de audio válidos (MP3, WAV, OGG)', 'alert');
      return;
    }

    const rect = launchpadFrame.getBoundingClientRect();
    const cols = state.gridCols || 8;
    const rows = state.gridRows || 8;
    const padCount = cols * rows;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const colIdx = Math.max(0, Math.min(cols - 1, Math.floor((relX / rect.width) * cols)));
    const rowIdx = Math.max(0, Math.min(rows - 1, Math.floor((relY / rect.height) * rows)));
    let startPad = rowIdx * cols + colIdx;

    if (startPad >= padCount) startPad = 0;

    showToast(`Asignando ${files.length} archivos de audio en lote...`, 'refresh');

    let loadedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const targetPad = (startPad + i) % padCount;
      try {
        await handleAudioFileUpload(files[i], targetPad);
        loadedCount++;
      } catch (err) {
        console.warn(`Error cargando archivo #${i}:`, err);
      }
    }

    showToast(`¡${loadedCount} audios asignados correctamente a los pads!`, 'check');
  });
}

function initObsWebSocketEngine() {
  state.obs = {
    connected: false,
    ws: null,
    scenes: [],
    currentScene: '',
    isStreaming: false,
    isRecording: false
  };

  const btnConnect = document.getElementById('btn-obs-connect');
  const btnDisconnect = document.getElementById('btn-obs-disconnect');
  const inputUrl = document.getElementById('input-obs-url');
  const inputPassword = document.getElementById('input-obs-password');
  const badgeStatus = document.getElementById('obs-badge-status');
  const badgeText = document.getElementById('obs-badge-text');
  const tagScene = document.getElementById('obs-current-scene-tag');
  const selectScenes = document.getElementById('select-obs-scenes');
  const btnSwitchScene = document.getElementById('btn-obs-switch-scene');
  const btnToggleStream = document.getElementById('btn-obs-toggle-stream');
  const btnToggleRecord = document.getElementById('btn-obs-toggle-record');
  const padObsStatus = document.getElementById('pad-obs-status');
  const obsStatusFeedback = document.getElementById('obs-status-feedback');
  const obsFeedbackText = document.getElementById('obs-feedback-text');
  const obsFeedbackIcon = document.getElementById('obs-feedback-icon');
  const obsConnectionSubtext = document.getElementById('obs-connection-subtext');
  const btnToggleObsAdvanced = document.getElementById('btn-toggle-obs-advanced');
  const obsAdvancedPanel = document.getElementById('obs-advanced-panel');

  const setObsFeedback = (type, htmlMessage) => {
    if (!obsStatusFeedback) return;
    if (type === 'none' || !htmlMessage) {
      obsStatusFeedback.className = 'obs-status-feedback hidden';
      return;
    }
    obsStatusFeedback.className = `obs-status-feedback ${type}`;
    if (obsFeedbackIcon) {
      obsFeedbackIcon.textContent = type === 'error' ? '!' : (type === 'warning' ? '!' : '✓');
    }
    if (obsFeedbackText) {
      obsFeedbackText.innerHTML = htmlMessage;
    }
  };

  const updateObsUI = (connected, statusText = null) => {
    state.obs.connected = connected;
    if (badgeStatus) {
      badgeStatus.className = `bot-badge ${connected ? 'connected' : 'disconnected'}`;
    }
    if (badgeText) {
      badgeText.textContent = connected ? 'CONECTADO' : (statusText || 'DESCONECTADO');
    }
    if (btnConnect) {
      btnConnect.disabled = connected;
      btnConnect.textContent = connected ? 'CONECTADO' : 'AUTODETECTAR Y CONECTAR';
    }
    if (btnDisconnect) {
      btnDisconnect.disabled = !connected;
    }
    if (padObsStatus) {
      padObsStatus.textContent = connected ? 'OBS Conectado' : 'OBS Inactivo';
      padObsStatus.className = `obs-status-indicator ${connected ? 'connected' : ''}`;
    }
  };

  if (btnToggleObsAdvanced && obsAdvancedPanel) {
    btnToggleObsAdvanced.addEventListener('click', () => {
      const isHidden = obsAdvancedPanel.style.display === 'none';
      obsAdvancedPanel.style.display = isHidden ? 'block' : 'none';
      btnToggleObsAdvanced.textContent = isHidden
        ? '- Ocultar ajustes avanzados'
        : '+ Ajustes avanzados (IP o puerto personalizado)';
    });
  }

  const btnToggleObsPassword = document.getElementById('btn-toggle-obs-password');
  if (btnToggleObsPassword && inputPassword) {
    btnToggleObsPassword.addEventListener('click', () => {
      inputPassword.type = inputPassword.type === 'password' ? 'text' : 'password';
    });
  }

  try {
    const savedUrl = localStorage.getItem('soundboard_obs_url');
    const savedPass = localStorage.getItem('soundboard_obs_password');
    if (savedUrl && inputUrl) {
      inputUrl.value = savedUrl;
      if (savedUrl !== 'ws://127.0.0.1:4455' && obsAdvancedPanel && btnToggleObsAdvanced) {
        obsAdvancedPanel.style.display = 'block';
        btnToggleObsAdvanced.textContent = '- Ocultar ajustes avanzados';
      }
    } else if (inputUrl && !inputUrl.value) {
      inputUrl.value = 'ws://127.0.0.1:4455';
    }
    if (savedPass && inputPassword) {
      inputPassword.value = savedPass;
    }
  } catch (e) { }

  if (inputUrl) {
    inputUrl.addEventListener('change', () => {
      try { localStorage.setItem('soundboard_obs_url', inputUrl.value.trim()); } catch (e) { }
    });
  }
  if (inputPassword) {
    inputPassword.addEventListener('change', () => {
      try { localStorage.setItem('soundboard_obs_password', inputPassword.value); } catch (e) { }
    });
  }

  async function sha256Base64(str) {
    const enc = new TextEncoder().encode(str);
    const hash = await window.crypto.subtle.digest('SHA-256', enc);
    const bin = String.fromCharCode(...new Uint8Array(hash));
    return btoa(bin);
  }

  let connectionTimeoutTimer = null;
  let isConnecting = false;
  let autoDetectIndex = 0;
  let autoDetectCandidates = [];

  const cleanupConnectingState = () => {
    if (connectionTimeoutTimer) {
      clearTimeout(connectionTimeoutTimer);
      connectionTimeoutTimer = null;
    }
    isConnecting = false;
    if (btnConnect) {
      btnConnect.disabled = state.obs.connected;
      btnConnect.textContent = state.obs.connected ? 'CONECTADO' : 'AUTODETECTAR Y CONECTAR';
    }
  };

  const tryProbeCandidate = (isSilent = false) => {
    if (state.obs.connected) return;

    if (autoDetectIndex >= autoDetectCandidates.length) {
      cleanupConnectingState();
      updateObsUI(false, 'OBS NO INICIADO');
      if (obsConnectionSubtext) {
        obsConnectionSubtext.textContent = 'No se detectó OBS en ejecución';
      }
      setObsFeedback('error', '<strong>OBS Studio no está iniciado o el servidor WebSocket está apagado.</strong><br>Abre OBS Studio en tu computadora y ve a <em>Herramientas -&gt; Ajustes del servidor WebSocket</em> para verificar que esté marcada la opción <em>"Habilitar el servidor WebSocket"</em> (puerto 4455).');
      if (!isSilent) {
        showToast('OBS Studio no está iniciado o no responde en el puerto 4455.', 'alert');
      }
      return;
    }

    const currentUrl = autoDetectCandidates[autoDetectIndex];
    const password = (inputPassword && inputPassword.value) || '';

    isConnecting = true;
    if (btnConnect) {
      btnConnect.disabled = true;
      btnConnect.textContent = 'DETECTANDO...';
    }
    if (badgeStatus) {
      badgeStatus.className = 'bot-badge connecting';
    }
    if (badgeText) {
      badgeText.textContent = 'DETECTANDO...';
    }
    if (obsConnectionSubtext) {
      obsConnectionSubtext.textContent = `Probando conexión en ${currentUrl}...`;
    }
    setObsFeedback('warning', `Buscando servidor OBS en <code>${currentUrl}</code>...`);

    let wasOpened = false;
    let wasIdentified = false;

    if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
    connectionTimeoutTimer = setTimeout(() => {
      if (isConnecting && !state.obs.connected) {
        console.warn(`[OBS] Tiempo límite agotado probando ${currentUrl}`);
        if (state.obs.ws) {
          try {
            state.obs.ws.onopen = null;
            state.obs.ws.onmessage = null;
            state.obs.ws.onerror = null;
            state.obs.ws.onclose = null;
            state.obs.ws.close();
          } catch (e) { }
          state.obs.ws = null;
        }
        autoDetectIndex++;
        tryProbeCandidate(isSilent);
      }
    }, 1800);

    try {
      if (state.obs.ws) {
        try {
          state.obs.ws.onopen = null;
          state.obs.ws.onmessage = null;
          state.obs.ws.onerror = null;
          state.obs.ws.onclose = null;
          state.obs.ws.close();
        } catch (e) { }
        state.obs.ws = null;
      }

      const ws = new WebSocket(currentUrl);
      state.obs.ws = ws;

      ws.onopen = () => {
        wasOpened = true;
        console.log(`[OBS] WebSocket abierto hacia ${currentUrl}`);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.op === 0) {
            const d = msg.d || {};
            let authResponse = undefined;

            if (d.authentication) {
              const secret = await sha256Base64(password + d.authentication.salt);
              authResponse = await sha256Base64(secret + d.authentication.challenge);
            }

            const identifyPayload = {
              op: 1,
              d: {
                rpcVersion: 1,
                eventSubscriptions: 33
              }
            };

            if (authResponse) {
              identifyPayload.d.authentication = authResponse;
            }

            ws.send(JSON.stringify(identifyPayload));
          } else if (msg.op === 2) {
            wasIdentified = true;
            cleanupConnectingState();
            state.obs.connectedUrl = currentUrl;
            try { localStorage.setItem('soundboard_obs_url', currentUrl); } catch (e) { }
            console.log(`[OBS] Autenticado e identificado con éxito en ${currentUrl}`);
            updateObsUI(true);
            if (obsConnectionSubtext) {
              obsConnectionSubtext.textContent = `Conectado a OBS Studio (${currentUrl})`;
            }
            setObsFeedback('success', `<strong>Conectado a OBS Studio con éxito.</strong> Escenas y controles activos.`);
            if (!isSilent) {
              showToast('Conectado a OBS Studio con éxito.', 'check');
            }

            ws.send(JSON.stringify({
              op: 6,
              d: {
                requestType: 'GetSceneList',
                requestId: 'req_scenes'
              }
            }));
            ws.send(JSON.stringify({
              op: 6,
              d: {
                requestType: 'GetStreamStatus',
                requestId: 'req_stream'
              }
            }));
            ws.send(JSON.stringify({
              op: 6,
              d: {
                requestType: 'GetRecordStatus',
                requestId: 'req_record'
              }
            }));
          } else if (msg.op === 7) {
            const d = msg.d || {};
            if (d.requestId === 'req_scenes' && d.responseData) {
              const scenes = d.responseData.scenes || [];
              state.obs.scenes = scenes.map(s => s.sceneName || s);
              state.obs.currentScene = d.responseData.currentProgramSceneName || '';
              if (tagScene) tagScene.textContent = `ESCENA: ${state.obs.currentScene || 'N/A'}`;

              if (selectScenes) {
                selectScenes.innerHTML = '';
                state.obs.scenes.forEach(sName => {
                  const opt = document.createElement('option');
                  opt.value = sName;
                  opt.textContent = sName;
                  if (sName === state.obs.currentScene) opt.selected = true;
                  selectScenes.appendChild(opt);
                });
              }
            } else if (d.requestId === 'req_stream' && d.responseData) {
              state.obs.isStreaming = Boolean(d.responseData.outputActive);
              if (btnToggleStream) {
                btnToggleStream.classList.toggle('active', state.obs.isStreaming);
              }
            } else if (d.requestId === 'req_record' && d.responseData) {
              state.obs.isRecording = Boolean(d.responseData.outputActive);
              if (btnToggleRecord) {
                btnToggleRecord.classList.toggle('active', state.obs.isRecording);
              }
            }
          } else if (msg.op === 5) {
            const d = msg.d || {};
            if (d.eventType === 'CurrentProgramSceneChanged') {
              state.obs.currentScene = d.eventData?.sceneName || '';
              if (tagScene) tagScene.textContent = `ESCENA: ${state.obs.currentScene}`;
              if (selectScenes) selectScenes.value = state.obs.currentScene;
            } else if (d.eventType === 'StreamStateChanged') {
              state.obs.isStreaming = Boolean(d.eventData?.outputActive);
              if (btnToggleStream) btnToggleStream.classList.toggle('active', state.obs.isStreaming);
            } else if (d.eventType === 'RecordStateChanged') {
              state.obs.isRecording = Boolean(d.eventData?.outputActive);
              if (btnToggleRecord) btnToggleRecord.classList.toggle('active', state.obs.isRecording);
            }
          }
        } catch (err) {
          console.warn('[OBS] Error parseando mensaje:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn(`[OBS] Fallo de conexión hacia ${currentUrl}:`, err);
      };

      ws.onclose = (event) => {
        console.log(`[OBS] WebSocket cerrado en ${currentUrl}. Código: ${event.code}`);
        if (connectionTimeoutTimer) {
          clearTimeout(connectionTimeoutTimer);
          connectionTimeoutTimer = null;
        }

        if (wasIdentified) {
          cleanupConnectingState();
          updateObsUI(false);
          setObsFeedback('warning', 'Conexión con OBS Studio finalizada.');
          showToast('Conexión con OBS Studio finalizada.', 'info');
          return;
        }

        if (event.code === 4009) {
          cleanupConnectingState();
          updateObsUI(false, 'CLAVE INCORRECTA');
          setObsFeedback('error', '<strong>Contraseña incorrecta:</strong> La clave configurada en OBS Studio no coincide. Revisa en OBS <em>Herramientas -&gt; Ajustes del servidor WebSocket</em>.');
          showToast('Contraseña de OBS incorrecta.', 'alert');
          return;
        }

        if (event.code === 4005) {
          cleanupConnectingState();
          updateObsUI(false, 'CLAVE REQUERIDA');
          setObsFeedback('warning', '<strong>Contraseña requerida:</strong> El servidor WebSocket de OBS tiene autenticación activada. Copia la contraseña desde OBS y escríbela arriba.');
          showToast('OBS requiere contraseña de acceso.', 'alert');
          return;
        }

        if (!wasOpened) {
          autoDetectIndex++;
          tryProbeCandidate(isSilent);
        } else {
          cleanupConnectingState();
          updateObsUI(false, 'OBS NO INICIADO');
          setObsFeedback('error', '<strong>OBS Studio se desconectó de forma inesperada.</strong>');
        }
      };
    } catch (e) {
      console.warn(`[OBS] Excepción al probar ${currentUrl}:`, e);
      autoDetectIndex++;
      tryProbeCandidate(isSilent);
    }
  };

  const autoDetectAndConnectObs = (isSilent = false) => {
    if (state.obs.connected || isConnecting) return;

    const customUrl = (inputUrl && inputUrl.value.trim()) || '';
    const defaultCandidates = ['ws://127.0.0.1:4455', 'ws://localhost:4455', 'ws://127.0.0.1:4444'];

    autoDetectCandidates = [];
    if (customUrl && customUrl !== 'ws://127.0.0.1:4455') {
      let formatted = customUrl;
      if (!formatted.startsWith('ws://') && !formatted.startsWith('wss://')) formatted = 'ws://' + formatted;
      autoDetectCandidates.push(formatted);
    }
    defaultCandidates.forEach(c => {
      if (!autoDetectCandidates.includes(c)) autoDetectCandidates.push(c);
    });

    autoDetectIndex = 0;
    if (!isSilent) {
      showToast('Detectando OBS Studio automáticamente...', 'refresh');
    }
    tryProbeCandidate(isSilent);
  };

  window.autoDetectAndConnectObs = autoDetectAndConnectObs;

  if (btnConnect) btnConnect.addEventListener('click', () => autoDetectAndConnectObs(false));
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
      cleanupConnectingState();
      if (state.obs.ws) {
        try {
          state.obs.ws.onclose = null;
          state.obs.ws.close();
        } catch (e) { }
        state.obs.ws = null;
      }
      updateObsUI(false);
      if (obsConnectionSubtext) {
        obsConnectionSubtext.textContent = 'Detección automática en puerto local 4455';
      }
      setObsFeedback('none');
      showToast('Desconectado de OBS Studio.', 'info');
    });
  }

  if (btnSwitchScene && selectScenes) {
    btnSwitchScene.addEventListener('click', () => {
      const target = selectScenes.value;
      if (target && state.obs.ws && state.obs.connected) {
        state.obs.ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'SetCurrentProgramScene',
            requestId: 'req_manual_switch',
            requestData: { sceneName: target }
          }
        }));
        showToast(`Escena OBS cambiada a "${target}"`, 'check');
      }
    });
  }

  if (btnToggleStream) {
    btnToggleStream.addEventListener('click', () => {
      if (state.obs.ws && state.obs.connected) {
        state.obs.ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'ToggleStream',
            requestId: 'req_toggle_stream'
          }
        }));
      } else {
        showToast('Conecta OBS Studio primero', 'alert');
      }
    });
  }

  if (btnToggleRecord) {
    btnToggleRecord.addEventListener('click', () => {
      if (state.obs.ws && state.obs.connected) {
        state.obs.ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'ToggleRecord',
            requestId: 'req_toggle_record'
          }
        }));
      } else {
        showToast('Conecta OBS Studio primero', 'alert');
      }
    });
  }

  const selectObsAction = document.getElementById('select-pad-obs-action');
  const inputObsTarget = document.getElementById('input-pad-obs-target');
  const targetContainer = document.getElementById('pad-obs-target-container');

  if (selectObsAction) {
    selectObsAction.addEventListener('change', () => {
      const pad = currentPads()[state.selectedPadIndex];
      if (!pad) return;
      pad.obsAction = selectObsAction.value;
      if (targetContainer) {
        targetContainer.style.display = (pad.obsAction === 'scene' || pad.obsAction === 'toggle_mute') ? 'block' : 'none';
      }
      saveSoundboardConfigDebounced(300);
    });
  }

  if (inputObsTarget) {
    inputObsTarget.addEventListener('input', () => {
      const pad = currentPads()[state.selectedPadIndex];
      if (!pad) return;
      pad.obsTarget = inputObsTarget.value.trim();
      saveSoundboardConfigDebounced(400);
    });
  }
}

function executeObsPadAction(pad) {
  if (!pad || !pad.obsAction || pad.obsAction === 'none') return;
  if (!state.obs || !state.obs.connected || !state.obs.ws) {
    return;
  }

  const ws = state.obs.ws;
  try {
    switch (pad.obsAction) {
      case 'scene': {
        const sName = pad.obsTarget || state.obs.currentScene;
        if (sName) {
          ws.send(JSON.stringify({
            op: 6,
            d: {
              requestType: 'SetCurrentProgramScene',
              requestId: `pad_scene_${pad.id}`,
              requestData: { sceneName: sName }
            }
          }));
        }
        break;
      }
      case 'toggle_mute': {
        const inputName = pad.obsTarget || 'Mic/Aux';
        ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'ToggleInputMute',
            requestId: `pad_mute_${pad.id}`,
            requestData: { inputName }
          }
        }));
        break;
      }
      case 'toggle_record': {
        ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'ToggleRecord',
            requestId: `pad_rec_${pad.id}`
          }
        }));
        break;
      }
      case 'toggle_stream': {
        ws.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'ToggleStream',
            requestId: `pad_stream_${pad.id}`
          }
        }));
        break;
      }
    }
  } catch (err) {
    console.warn('[OBS] Error enviando acción de pad:', err);
  }
}

function initGlobalHotkeysEngine() {
  if (typeof ipcRenderer !== 'undefined' && ipcRenderer) {
    ipcRenderer.on('global-hotkey-pressed', (event, { action, padIndex }) => {
      if (action === 'stop_all') {
        stopAllPads();
        showToast('Audio silenciado vía Atajo Global', 'stop');
      } else if (padIndex !== undefined && padIndex !== null) {
        triggerPad(padIndex);
      }
    });
  }

  const btnRecordHotkey = document.getElementById('btn-record-hotkey');
  const inputHotkey = document.getElementById('input-pad-hotkey');
  const btnClearHotkey = document.getElementById('btn-clear-pad-hotkey');

  let isRecordingHotkey = false;

  if (btnRecordHotkey) {
    btnRecordHotkey.addEventListener('click', () => {
      isRecordingHotkey = !isRecordingHotkey;
      btnRecordHotkey.classList.toggle('recording', isRecordingHotkey);
      btnRecordHotkey.textContent = isRecordingHotkey ? 'PRESIONA...' : 'CAPTURAR';
      if (isRecordingHotkey) {
        showToast('Presiona la combinación de teclas para este pad...', 'keyboard');
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!isRecordingHotkey) return;
    e.preventDefault();
    e.stopPropagation();

    const parts = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Command');

    let key = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      return;
    }

    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);
    const accelerator = parts.join('+');

    const pad = currentPads()[state.selectedPadIndex];
    if (pad) {
      pad.hotkey = accelerator;
      if (inputHotkey) inputHotkey.value = accelerator;
      saveSoundboardConfigDebounced(300);
      syncAllGlobalHotkeys();
      showToast(`Atajo global "${accelerator}" asignado a Pad #${pad.id + 1}`, 'check');
    }

    isRecordingHotkey = false;
    if (btnRecordHotkey) {
      btnRecordHotkey.classList.remove('recording');
      btnRecordHotkey.textContent = 'CAPTURAR';
    }
  });

  if (btnClearHotkey) {
    btnClearHotkey.addEventListener('click', () => {
      const pad = currentPads()[state.selectedPadIndex];
      if (pad) {
        delete pad.hotkey;
        if (inputHotkey) inputHotkey.value = '';
        saveSoundboardConfigDebounced(300);
        syncAllGlobalHotkeys();
        showToast(`Atajo eliminado de Pad #${pad.id + 1}`, 'info');
      }
    });
  }
}

async function syncAllGlobalHotkeys() {
  if (typeof ipcRenderer === 'undefined' || !ipcRenderer) return;

  const hotkeyList = [
    { id: 'panic_stop', accelerator: 'Control+Shift+Space', action: 'stop_all' }
  ];

  const pads = currentPads() || [];
  pads.forEach((pad, idx) => {
    if (pad.hotkey) {
      hotkeyList.push({
        id: `pad_${idx}`,
        accelerator: pad.hotkey,
        padIndex: idx
      });
    }
  });

  try {
    await ipcRenderer.invoke('register-global-hotkeys', hotkeyList);
  } catch (err) {
    console.warn('Error sincronizando atajos globales:', err);
  }
}

function initSoundpackEngine() {
  const btnExport = document.getElementById('btn-export-soundpack');
  const btnImport = document.getElementById('btn-import-soundpack');

  if (btnExport) {
    btnExport.addEventListener('click', exportCurrentSoundpack);
  }

  if (btnImport) {
    btnImport.addEventListener('click', importSoundpackFile);
  }
}

function cleanFileName(str) {
  return String(str || 'audio').trim().replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
}

async function exportCurrentSoundpack() {
  try {
    let JSZip;
    try {
      JSZip = require('jszip');
    } catch (e) {
      showToast('Error cargando módulo de compresión ZIP', 'error');
      return;
    }

    const currentBank = state.banks[state.currentBankId];
    if (!currentBank) {
      showToast('No hay una capa activa seleccionada', 'alert');
      return;
    }

    const bankName = (state.bankNames && state.bankNames[state.currentBankId]) || 'Capa';
    showToast(`Empaquetando "${bankName}"...`, 'refresh');

    const zip = new JSZip();
    const soundsFolder = zip.folder('sounds');

    const cleanPads = [];
    for (let i = 0; i < currentBank.length; i++) {
      const pad = currentBank[i];
      const padMeta = {
        id: pad.id,
        name: pad.name,
        color: pad.color,
        rgb: pad.rgb,
        mode: pad.mode,
        volume: pad.volume,
        pressEffect: pad.pressEffect,
        synthType: pad.synthType,
        obsAction: pad.obsAction,
        obsTarget: pad.obsTarget,
        hotkey: pad.hotkey,
        trimStart: typeof pad.trimStart === 'number' ? pad.trimStart : null,
        trimEnd: typeof pad.trimEnd === 'number' ? pad.trimEnd : null,
        audioFile: null
      };

      if (pad.audioPath) {
        try {
          const res = await fetch(pad.audioPath);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const fileName = `pad_${i}_${Date.now()}_${cleanFileName(pad.name || 'audio')}.mp3`;
            soundsFolder.file(fileName, arrayBuf);
            padMeta.audioFile = `sounds/${fileName}`;
          }
        } catch (e) {
          console.warn('No se pudo empaquetar audio de pad:', pad.audioPath, e);
        }
      }

      cleanPads.push(padMeta);
    }

    const manifest = {
      format: 'soundboard_pack',
      version: '1.0',
      bankName,
      gridRows: state.gridRows || 8,
      gridCols: state.gridCols || 8,
      pads: cleanPads
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    if (typeof ipcRenderer !== 'undefined' && ipcRenderer) {
      const defaultName = `${cleanFileName(bankName)}_soundpack.soundpack`;
      const dialogRes = await ipcRenderer.invoke('show-save-soundpack-dialog', defaultName);
      if (dialogRes && !dialogRes.canceled && dialogRes.filePath) {
        await ipcRenderer.invoke('save-binary-file', {
          filePath: dialogRes.filePath,
          buffer: zipBuffer
        });
        showToast(`¡Soundpack "${bankName}" exportado con éxito!`, 'check');
      }
    } else {
      const blob = new Blob([zipBuffer], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${cleanFileName(bankName)}_soundpack.soundpack`;
      a.click();
      showToast(`¡Soundpack "${bankName}" descargado!`, 'check');
    }
  } catch (err) {
    console.error('Error exportando soundpack:', err);
    showToast(`Error exportando soundpack: ${err.message}`, 'error');
  }
}

async function importSoundpackFile() {
  try {
    let JSZip;
    try {
      JSZip = require('jszip');
    } catch (e) {
      showToast('Error cargando módulo de descompresión ZIP', 'error');
      return;
    }

    let arrayBuffer = null;

    if (typeof ipcRenderer !== 'undefined' && ipcRenderer) {
      const dialogRes = await ipcRenderer.invoke('show-open-soundpack-dialog');
      if (dialogRes && !dialogRes.canceled && dialogRes.filePaths && dialogRes.filePaths[0]) {
        const fileData = await ipcRenderer.invoke('read-binary-file', { filePath: dialogRes.filePaths[0] });
        if (fileData && fileData.success && fileData.data) {
          arrayBuffer = fileData.data;
        }
      } else {
        return;
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.soundpack,.zip';
      const file = await new Promise(resolve => {
        input.onchange = () => resolve(input.files[0]);
        input.click();
      });
      if (!file) return;
      arrayBuffer = await file.arrayBuffer();
    }

    if (!arrayBuffer) {
      showToast('No se seleccionó ningún archivo', 'alert');
      return;
    }

    showToast('Desempaquetando Soundpack...', 'refresh');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      showToast('El paquete no contiene un archivo manifest.json válido', 'error');
      return;
    }

    const manifestText = await manifestFile.async('string');
    const manifest = JSON.parse(manifestText);

    const newBankId = `pack_${Date.now()}`;
    const newBankName = manifest.bankName || 'Pack Importado';

    const rows = state.gridRows || 8;
    const cols = state.gridCols || 8;
    const newPads = createEmptyBank('Pad', rows, cols);

    const importedPads = manifest.pads || [];
    for (let i = 0; i < Math.min(newPads.length, importedPads.length); i++) {
      const src = importedPads[i];
      if (!src) continue;
      newPads[i].name = src.name || `Pad ${i + 1}`;
      newPads[i].color = src.color || '#20304a';
      newPads[i].rgb = src.rgb || hexToRgb(newPads[i].color);
      newPads[i].mode = src.mode || 'oneshot';
      newPads[i].volume = src.volume !== undefined ? src.volume : 1.0;
      newPads[i].pressEffect = src.pressEffect;
      newPads[i].synthType = src.synthType;
      newPads[i].obsAction = src.obsAction;
      newPads[i].obsTarget = src.obsTarget;
      newPads[i].hotkey = src.hotkey;
      newPads[i].trimStart = typeof src.trimStart === 'number' ? src.trimStart : null;
      newPads[i].trimEnd = typeof src.trimEnd === 'number' ? src.trimEnd : null;

      if (src.audioFile && zip.file(src.audioFile)) {
        try {
          const soundBuf = await zip.file(src.audioFile).async('arraybuffer');
          const fileName = `${cleanFileName(newPads[i].name)}.mp3`;
          const savedRelPath = await saveCustomAudioFile(newBankId, i, fileName, soundBuf);
          if (savedRelPath) {
            newPads[i].audioPath = savedRelPath;
            newPads[i].audioBuffer = await audioCtx.decodeAudioData(soundBuf.slice(0));
          }
        } catch (e) {
          console.warn(`Error extrayendo audio para pad #${i}:`, e);
        }
      }
    }

    if (!state.bankOrder) state.bankOrder = Object.keys(state.banks);
    state.bankOrder.push(newBankId);
    if (!state.bankNames) state.bankNames = {};
    state.bankNames[newBankId] = newBankName;
    state.banks[newBankId] = newPads;

    activeRenamingBankId = null;
    switchBank(newBankId);
    renderBankPills();
    saveSoundboardConfig();
    showToast(`¡Soundpack "${newBankName}" importado exitosamente!`, 'check');
  } catch (err) {
    console.error('Error importando soundpack:', err);
    showToast(`Error importando soundpack: ${err.message}`, 'error');
  }
}

/* ==========================================================================
   MOTOR DEL CORTADOR DE AUDIO (AUDIO TRIMMER NO DESTRUCTIVO)
   ========================================================================== */
function initAudioTrimmerEngine() {
  const modal = document.getElementById('modal-audio-trimmer');
  const btnOpen = document.getElementById('btn-trim-audio');
  const btnClose = document.getElementById('btn-close-trimmer-modal');
  const btnCancel = document.getElementById('btn-trim-cancel');
  const btnSave = document.getElementById('btn-trim-save');
  const btnReset = document.getElementById('btn-trim-reset');
  const btnPreview = document.getElementById('btn-trim-preview');
  const btnPreviewText = document.getElementById('btn-trim-preview-text');

  const canvas = document.getElementById('trimmer-waveform-canvas');
  const wrapper = document.getElementById('trimmer-canvas-wrapper');
  const dimmerLeft = document.getElementById('trimmer-dimmer-left');
  const dimmerRight = document.getElementById('trimmer-dimmer-right');
  const handleStart = document.getElementById('trimmer-handle-start');
  const handleEnd = document.getElementById('trimmer-handle-end');
  const playhead = document.getElementById('trimmer-playhead');

  const inputStart = document.getElementById('input-trim-start');
  const inputEnd = document.getElementById('input-trim-end');
  const labelDuration = document.getElementById('label-trim-duration');
  const labelTotal = document.getElementById('label-trim-total');
  const titleEl = document.getElementById('trimmer-modal-title');

  if (!modal || !btnOpen || !canvas) return;

  let currentPad = null;
  let audioBuffer = null;
  let totalDuration = 0;
  let trimStart = 0;
  let trimEnd = 0;

  let isPlaying = false;
  let previewSourceNode = null;
  let previewAnimId = null;
  let previewStartTime = 0;
  let previewStartOffset = 0;

  let draggingHandle = null;

  function stopPreview() {
    if (previewSourceNode) {
      try {
        previewSourceNode.onended = null;
        previewSourceNode.stop();
      } catch (e) {}
      previewSourceNode = null;
    }
    if (previewAnimId) {
      cancelAnimationFrame(previewAnimId);
      previewAnimId = null;
    }
    isPlaying = false;
    if (playhead) playhead.style.display = 'none';
    if (btnPreviewText) btnPreviewText.textContent = 'PROBAR SELECCIÓN';
  }

  function formatSec(sec) {
    return Number(sec).toFixed(2) + 's';
  }

  function updateVisuals(syncInputs = true) {
    if (totalDuration <= 0) return;

    if (trimStart < 0) trimStart = 0;
    if (trimEnd > totalDuration) trimEnd = totalDuration;
    if (trimStart > trimEnd - 0.05) trimStart = Math.max(0, trimEnd - 0.05);

    const startPct = (trimStart / totalDuration) * 100;
    const endPct = (trimEnd / totalDuration) * 100;

    if (dimmerLeft) dimmerLeft.style.width = `${startPct}%`;
    if (dimmerRight) dimmerRight.style.width = `${100 - endPct}%`;

    if (handleStart) handleStart.style.left = `${startPct}%`;
    if (handleEnd) handleEnd.style.left = `${endPct}%`;

    const currentSelectedDuration = Math.max(0, trimEnd - trimStart);
    if (labelDuration) labelDuration.textContent = formatSec(currentSelectedDuration);
    if (labelTotal) labelTotal.textContent = `de ${formatSec(totalDuration)}`;

    if (syncInputs) {
      if (inputStart) inputStart.value = trimStart.toFixed(2);
      if (inputEnd) inputEnd.value = trimEnd.toFixed(2);
    }
  }

  function drawWaveform(buffer) {
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(300, Math.floor(rect.width || wrapper.clientWidth || 600));
    const h = Math.max(80, Math.floor(rect.height || wrapper.clientHeight || 130));

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Fondo
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, w, h);

    // Linea central
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / w);
    const amp = (h / 2) * 0.85;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#C3EA2B');
    grad.addColorStop(0.5, '#E4FF6E');
    grad.addColorStop(1, '#C3EA2B');
    ctx.fillStyle = grad;

    for (let x = 0; x < w; x++) {
      let min = 1.0;
      let max = -1.0;
      const startIdx = x * step;
      const endIdx = Math.min(startIdx + step, data.length);

      for (let j = startIdx; j < endIdx; j++) {
        const val = data[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      if (max < min) { min = 0; max = 0; }

      const barHeight = Math.max(1.5, (max - min) * amp);
      const barY = (h / 2) - (max * amp);

      ctx.fillRect(x, barY, 1.2, barHeight);
    }
  }

  btnOpen.addEventListener('click', async () => {
    stopPreview();
    const pad = currentPads()[state.selectedPadIndex];
    if (!pad) return;
    currentPad = pad;

    if (!pad.audioBuffer && pad.audioPath) {
      showToast('Cargando forma de onda del audio...', 'music');
      try {
        const res = await fetch(pad.audioPath);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          pad.audioBuffer = await audioCtx.decodeAudioData(ab);
        }
      } catch (err) {
        console.warn('Error decodificando audio para cortador:', err);
      }
    }

    if (!pad.audioBuffer) {
      showToast('No hay un archivo de audio decodificable en este botón.', 'alert');
      return;
    }

    audioBuffer = pad.audioBuffer;
    totalDuration = audioBuffer.duration;

    trimStart = (typeof pad.trimStart === 'number' && pad.trimStart >= 0) ? Math.min(pad.trimStart, totalDuration) : 0;
    trimEnd = (typeof pad.trimEnd === 'number' && pad.trimEnd > trimStart) ? Math.min(pad.trimEnd, totalDuration) : totalDuration;

    if (titleEl) {
      titleEl.textContent = `Recortar Sonido - Pad #${pad.id + 1} (${pad.name || 'Sin Nombre'})`;
    }

    if (inputStart) {
      inputStart.max = totalDuration.toFixed(2);
      inputStart.value = trimStart.toFixed(2);
    }
    if (inputEnd) {
      inputEnd.max = totalDuration.toFixed(2);
      inputEnd.value = trimEnd.toFixed(2);
    }

    modal.classList.add('modal-active');

    setTimeout(() => {
      drawWaveform(audioBuffer);
      updateVisuals(true);
    }, 60);
  });

  function closeModal() {
    stopPreview();
    modal.classList.remove('modal-active');
  }
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal-active')) {
      closeModal();
    }
  });

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      stopPreview();
      trimStart = 0;
      trimEnd = totalDuration;
      updateVisuals(true);
      showToast('Marcadores restablecidos al audio completo', 'check');
    });
  }

  if (btnPreview) {
    btnPreview.addEventListener('click', () => {
      if (isPlaying) {
        stopPreview();
        return;
      }

      if (!audioBuffer) return;
      stopPreview();

      const hCtx = getHeadphonesCtx();
      previewSourceNode = hCtx.createBufferSource();
      previewSourceNode.buffer = audioBuffer;

      const gain = hCtx.createGain();
      gain.gain.value = (currentPad && currentPad.volume !== undefined ? currentPad.volume : 1.0) * state.masterVolume;
      previewSourceNode.connect(gain);
      gain.connect(hCtx.destination);

      const dur = Math.max(0.05, trimEnd - trimStart);
      previewStartOffset = trimStart;
      previewStartTime = hCtx.currentTime;

      previewSourceNode.onended = () => {
        stopPreview();
      };

      previewSourceNode.start(0, trimStart, dur);
      isPlaying = true;
      if (btnPreviewText) btnPreviewText.textContent = 'DETENER';
      if (playhead) playhead.style.display = 'block';

      function updatePlayhead() {
        if (!isPlaying) return;
        const elapsed = hCtx.currentTime - previewStartTime;
        const curSec = previewStartOffset + elapsed;
        if (curSec > trimEnd) {
          stopPreview();
          return;
        }

        const pct = (curSec / totalDuration) * 100;
        if (playhead) playhead.style.left = `${pct}%`;
        previewAnimId = requestAnimationFrame(updatePlayhead);
      }
      updatePlayhead();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!currentPad) return;
      stopPreview();

      const isDefault = (trimStart <= 0.01 && trimEnd >= (totalDuration - 0.01));

      if (isDefault) {
        currentPad.trimStart = null;
        currentPad.trimEnd = null;
      } else {
        currentPad.trimStart = Number(trimStart.toFixed(2));
        currentPad.trimEnd = Number(trimEnd.toFixed(2));
      }

      currentPad._lastSoundId = null;
      await saveSoundboardConfig();
      selectPad(state.selectedPadIndex);
      updatePadVisual(state.selectedPadIndex);

      showToast(isDefault ? 'Audio restaurado al original' : `Recorte guardado en Pad #${currentPad.id + 1} (${formatSec(trimEnd - trimStart)})`, 'check');
      closeModal();
    });
  }

  if (inputStart) {
    inputStart.addEventListener('input', (e) => {
      stopPreview();
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        trimStart = Math.max(0, Math.min(val, trimEnd - 0.05));
        updateVisuals(false);
      }
    });
  }

  if (inputEnd) {
    inputEnd.addEventListener('input', (e) => {
      stopPreview();
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        trimEnd = Math.min(totalDuration, Math.max(val, trimStart + 0.05));
        updateVisuals(false);
      }
    });
  }

  function getTimeFromX(clientX) {
    const rect = wrapper.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (clampedX / rect.width) * totalDuration;
  }

  if (handleStart) {
    handleStart.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      draggingHandle = 'start';
      stopPreview();
    });
  }

  if (handleEnd) {
    handleEnd.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      draggingHandle = 'end';
      stopPreview();
    });
  }

  if (wrapper) {
    wrapper.addEventListener('mousedown', (e) => {
      if (e.target === handleStart || e.target === handleEnd) return;
      stopPreview();
      const clickTime = getTimeFromX(e.clientX);
      const distStart = Math.abs(clickTime - trimStart);
      const distEnd = Math.abs(clickTime - trimEnd);

      if (distStart <= distEnd) {
        trimStart = Math.max(0, Math.min(clickTime, trimEnd - 0.05));
        draggingHandle = 'start';
      } else {
        trimEnd = Math.min(totalDuration, Math.max(clickTime, trimStart + 0.05));
        draggingHandle = 'end';
      }
      updateVisuals(true);
    });
  }

  window.addEventListener('mousemove', (e) => {
    if (!draggingHandle || totalDuration <= 0) return;
    const time = getTimeFromX(e.clientX);

    if (draggingHandle === 'start') {
      trimStart = Math.max(0, Math.min(time, trimEnd - 0.05));
    } else if (draggingHandle === 'end') {
      trimEnd = Math.min(totalDuration, Math.max(time, trimStart + 0.05));
    }
    updateVisuals(true);
  });

  window.addEventListener('mouseup', () => {
    draggingHandle = null;
  });
}

