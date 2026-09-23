// Main Application Orchestrator for Launchpad Studio Mobile
// Full-Bleed Studio Matrix with Live Procedural Animations

document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const statusLabel = document.getElementById('status-label');
  const bankBar = document.getElementById('bank-bar');
  const padGridEl = document.getElementById('pad-grid');
  const canvasEl = document.getElementById('lightshow-canvas');
  const stopAllBtn = document.getElementById('stop-all-btn');
  const activeBankTitle = document.getElementById('active-bank-title');
  const settingsModal = document.getElementById('settings-modal');
  const iosModal = document.getElementById('ios-fullscreen-modal');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const closeIosModalBtn = document.getElementById('close-ios-modal-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const serverUrlInput = document.getElementById('server-url-input');
  const hapticSelect = document.getElementById('haptic-select');
  const wakelockToggle = document.getElementById('wakelock-toggle');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const toastBanner = document.getElementById('toast-banner');

  let currentConfig = {
    bankOrder: [],
    bankNames: {},
    currentBankId: null,
    gridType: '8x8',
    idleEffect: 1,
    pressEffect: 1,
    blendMode: 0,
    bankSettings: {},
    banks: {}
  };

  if (window.lightingEngine && canvasEl) {
    window.lightingEngine.init(canvasEl);
  }
  window.padGrid.init(padGridEl);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('[PWA] Service Worker registration failed:', err.message);
    });
  }

  function showToast(message, duration = 2500) {
    if (!toastBanner) return;
    toastBanner.textContent = message;
    toastBanner.classList.add('show');
    setTimeout(() => {
      toastBanner.classList.remove('show');
    }, duration);
  }

  function renderBankPills() {
    if (!bankBar) return;
    bankBar.innerHTML = '';

    const order = currentConfig.bankOrder && currentConfig.bankOrder.length > 0
      ? currentConfig.bankOrder
      : Object.keys(currentConfig.banks || {});

    if (order.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'bank-pill active';
      placeholder.textContent = 'Banco Principal';
      bankBar.appendChild(placeholder);
      return;
    }

    order.forEach((bankId) => {
      const pill = document.createElement('button');
      pill.className = 'bank-pill';
      if (bankId === currentConfig.currentBankId) {
        pill.classList.add('active');
      }
      const bName = (currentConfig.bankNames && currentConfig.bankNames[bankId]) || bankId;
      pill.textContent = bName;

      pill.addEventListener('click', () => {
        if (window.HapticsManager) window.HapticsManager.trigger('light');
        currentConfig.currentBankId = bankId;
        renderBankPills();
        updateActiveBankLighting(bankId);
        window.padGrid.setBank(bankId);
        window.remoteClient.sendSwitchBank(bankId);
      });

      bankBar.appendChild(pill);
    });

    if (activeBankTitle) {
      const curName = (currentConfig.bankNames && currentConfig.bankNames[currentConfig.currentBankId]) || 'BANCO';
      activeBankTitle.textContent = curName;
    }
  }

  function updateActiveBankLighting(bankId) {
    if (!window.lightingEngine) return;
    const bSettings = currentConfig.bankSettings && currentConfig.bankSettings[bankId];
    const idleEff = (bSettings && bSettings.idleEffect !== undefined) ? bSettings.idleEffect : currentConfig.idleEffect;
    const pressEff = (bSettings && bSettings.pressEffect !== undefined) ? bSettings.pressEffect : currentConfig.pressEffect;
    const blend = (bSettings && bSettings.blendMode !== undefined) ? bSettings.blendMode : currentConfig.blendMode;

    window.lightingEngine.setSettings({
      idleEffect: idleEff,
      pressEffect: pressEff,
      blendMode: blend
    });
  }

  window.remoteClient.on('status_change', (status) => {
    if (!statusPill || !statusLabel) return;
    statusPill.className = `status-pill ${status}`;

    if (status === 'connected') {
      statusLabel.textContent = 'ONLINE';
      showToast('Conectado a Launchpad Studio');
      if (window.WakeLockManager) window.WakeLockManager.request();
    } else if (status === 'connecting') {
      statusLabel.textContent = 'ENLAZANDO...';
    } else {
      statusLabel.textContent = 'OFFLINE';
    }
  });

  window.remoteClient.on('initial_state', (payload) => {
    console.log('[App] Received state snapshot:', payload);
    if (!payload) return;

    if (payload.gridType) currentConfig.gridType = payload.gridType;
    if (payload.bankOrder) currentConfig.bankOrder = payload.bankOrder;
    if (payload.bankNames) currentConfig.bankNames = payload.bankNames;
    if (payload.currentBankId) currentConfig.currentBankId = payload.currentBankId;
    if (payload.idleEffect !== undefined) currentConfig.idleEffect = payload.idleEffect;
    if (payload.pressEffect !== undefined) currentConfig.pressEffect = payload.pressEffect;
    if (payload.blendMode !== undefined) currentConfig.blendMode = payload.blendMode;
    if (payload.bankSettings) currentConfig.bankSettings = payload.bankSettings;
    if (payload.banks) currentConfig.banks = payload.banks;

    renderBankPills();
    updateActiveBankLighting(currentConfig.currentBankId);
    window.padGrid.setData(currentConfig);
  });

  window.remoteClient.on('bank_changed', (payload) => {
    if (payload && payload.bankId) {
      currentConfig.currentBankId = payload.bankId;
      renderBankPills();
      updateActiveBankLighting(payload.bankId);
      window.padGrid.setBank(payload.bankId);
    }
  });

  window.remoteClient.on('pad_state_changed', (payload) => {
    if (payload && payload.padIndex !== undefined) {
      window.padGrid.setPadPlaying(payload.padIndex, !!payload.isPlaying);
    }
  });

  window.remoteClient.on('trigger_light', (payload) => {
    if (window.lightingEngine && payload) {
      window.lightingEngine.trigger(payload.row, payload.col, payload.colorHex, payload.effectType);
    }
  });

  window.remoteClient.on('stop_all', () => {
    window.padGrid.clearAllPlaying();
  });

  if (stopAllBtn) {
    stopAllBtn.addEventListener('click', () => {
      if (window.HapticsManager) window.HapticsManager.trigger('strong');
      window.padGrid.clearAllPlaying();
      window.remoteClient.sendStopAll();
      showToast('Audio silenciado de inmediato');
    });
  }

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            if (isIos && iosModal) iosModal.classList.add('active');
          });
        } else {
          document.exitFullscreen().catch(() => { });
        }
      } else {
        if (iosModal) iosModal.classList.add('active');
      }
    });
  }

  if (closeIosModalBtn && iosModal) {
    closeIosModalBtn.addEventListener('click', () => {
      iosModal.classList.remove('active');
    });
  }

  if (openSettingsBtn && settingsModal) {
    openSettingsBtn.addEventListener('click', () => {
      serverUrlInput.value = window.remoteClient.serverUrl;
      hapticSelect.value = window.HapticsManager.getIntensity();
      wakelockToggle.checked = window.WakeLockManager.isEnabled();
      settingsModal.classList.add('active');
    });
  }

  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });
  }

  if (saveSettingsBtn && settingsModal) {
    saveSettingsBtn.addEventListener('click', () => {
      const newUrl = serverUrlInput.value.trim();
      const newHaptic = hapticSelect.value;
      const newWakeLock = wakelockToggle.checked;

      window.HapticsManager.setIntensity(newHaptic);
      window.WakeLockManager.setEnabled(newWakeLock);

      if (newUrl && newUrl !== window.remoteClient.serverUrl) {
        window.remoteClient.setServerUrl(newUrl);
        showToast('Reconectando al servidor...');
      }

      settingsModal.classList.remove('active');
      showToast('Configuración aplicada');
    });
  }

  [settingsModal, iosModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  });

  window.remoteClient.connect();
});
