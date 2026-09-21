let websocket = null;
let uuid = null;
let currentAction = null;
let settings = {};
let globalSettings = {};

function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
  uuid = inPropertyInspectorUUID;

  const actionInfo = JSON.parse(inActionInfo);

  currentAction = actionInfo.action;
  settings = (actionInfo.payload && actionInfo.payload.settings) || {};

  if (currentAction === 'cl.soundbot.launchpad.stop') {
    document.getElementById('soundFields').style.display = 'none';
  }

  websocket = new WebSocket('ws://127.0.0.1:' + inPort);

  websocket.onopen = () => {
    websocket.send(JSON.stringify({ event: inRegisterEvent, uuid: inPropertyInspectorUUID }));
    websocket.send(JSON.stringify({ event: 'getGlobalSettings', context: inPropertyInspectorUUID }));
    applySettingsToUI();
  };

  websocket.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);

    if (msg.event === 'didReceiveGlobalSettings') {
      globalSettings = msg.payload.settings || {};
      applyGlobalSettingsToUI();
    }
  };
}

function applySettingsToUI() {
  document.getElementById('volume').value = settings.volume ?? 100;
  document.getElementById('volumeLabel').textContent = settings.volume ?? 100;
  document.getElementById('audioFileName').textContent = settings.audioPath || 'Ningún archivo seleccionado';
}

function applyGlobalSettingsToUI() {
  document.getElementById('wsUrl').value = globalSettings.wsUrl || '';
  document.getElementById('authToken').value = globalSettings.authToken || '';
}

function saveSettings() {
  websocket.send(JSON.stringify({ event: 'setSettings', context: uuid, payload: settings }));
}

function saveGlobalSettings() {
  websocket.send(JSON.stringify({ event: 'setGlobalSettings', context: uuid, payload: globalSettings }));
}

document.getElementById('audioFile').addEventListener('change', (e) => {
  const file = e.target.files[0];

  if (!file) return;

  let filePath = file.path || file.name;

  if (/%[0-9A-Fa-f]{2}/.test(filePath)) {
    try {
      filePath = decodeURIComponent(filePath);
    }
    catch (err) {
      // Si falla la decodificación, seguimos con el valor original
    }
  }

  settings.audioPath = filePath;
  document.getElementById('audioFileName').textContent = filePath;

  const statusEl = document.getElementById('status');
  const looksAbsolute = /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith('/');

  if (!looksAbsolute) {
    statusEl.textContent = 'Aviso: no se detectó la ruta completa del archivo. Prueba seleccionándolo de nuevo.';
    statusEl.className = 'status err';
  }
  else {
    statusEl.textContent = '';
  }

  saveSettings();
});

document.getElementById('volume').addEventListener('input', (e) => {
  settings.volume = parseInt(e.target.value, 10);
  document.getElementById('volumeLabel').textContent = settings.volume;
});

document.getElementById('volume').addEventListener('change', saveSettings);

document.getElementById('wsUrl').addEventListener('change', (e) => {
  globalSettings.wsUrl = e.target.value.trim();
  saveGlobalSettings();
});

document.getElementById('authToken').addEventListener('change', (e) => {
  globalSettings.authToken = e.target.value;
  saveGlobalSettings();
});
