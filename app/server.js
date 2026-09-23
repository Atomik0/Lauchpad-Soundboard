const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = 3000;
const CUSTOM_SOUNDS_DIR = path.join(__dirname, 'public', 'sounds', 'custom');
const CONFIG_FILE_PATH = path.join(__dirname, 'public', 'soundboard_config.json');
function resolveMobileAppDir() {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'mobile_app') : null,
    path.join(__dirname, 'mobile_app'),
    path.resolve(__dirname, '..', 'mobile_app')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(__dirname, '..', 'mobile_app');
}

const MOBILE_APP_DIR = resolveMobileAppDir();

if (!fs.existsSync(CUSTOM_SOUNDS_DIR)) {
  fs.mkdirSync(CUSTOM_SOUNDS_DIR, { recursive: true });
}

let activeMainWindow = null;
let httpServer = null;
let wss = null;
const connectedMobileClients = new Set();

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const ifaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: ifaceName,
          address: iface.address
        });
      }
    }
  }

  return addresses;
}

function getPrimaryLocalIp() {
  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    return ips[0].address;
  }
  return '127.0.0.1';
}

function readCurrentConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[SERVER] Could not read soundboard_config.json:', err.message);
  }
  return null;
}

function broadcastToMobile(type, payload) {
  if (!wss) return;

  const message = JSON.stringify({ type, payload });
  for (const client of connectedMobileClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.warn('[SERVER] Error broadcasting to mobile client:', err.message);
      }
    }
  }
}

function getConnectedMobileCount() {
  return connectedMobileClients.size;
}

function initServer(mainWindow = null) {
  if (httpServer) {
    if (mainWindow) activeMainWindow = mainWindow;
    return {
      httpServer,
      port: PORT,
      broadcastToMobile,
      getConnectedMobileCount,
      getLocalIpAddresses,
      getPrimaryLocalIp
    };
  }

  activeMainWindow = mainWindow;
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  if (fs.existsSync(MOBILE_APP_DIR)) {
    const staticOpts = {
      setHeaders: (res) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    };
    app.use('/mobile', express.static(MOBILE_APP_DIR, staticOpts));
    app.use('/remote', express.static(MOBILE_APP_DIR, staticOpts));
  }

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', (req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    const isMobile = /mobile|iphone|ipad|android|touch/i.test(ua);
    if (isMobile && fs.existsSync(MOBILE_APP_DIR)) {
      return res.redirect('/mobile');
    }
    next();
  });

  app.get('/api/load-config', (req, res) => {
    try {
      const config = readCurrentConfig();
      if (config) {
        return res.json({ success: true, config });
      }
      return res.json({ success: false, reason: 'not_found' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/save-config', (req, res) => {
    try {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(req.body, null, 2), 'utf8');
      broadcastToMobile('initial_state', req.body);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/save-custom-audio', (req, res) => {
    try {
      const { bankId, padIndex, fileName, data } = req.body;

      if (!fs.existsSync(CUSTOM_SOUNDS_DIR)) {
        fs.mkdirSync(CUSTOM_SOUNDS_DIR, { recursive: true });
      }

      const prefix = `${bankId}_pad_${padIndex}_`;
      const existing = fs.readdirSync(CUSTOM_SOUNDS_DIR);

      for (const f of existing) {
        if (f.startsWith(prefix)) {
          try { fs.unlinkSync(path.join(CUSTOM_SOUNDS_DIR, f)); } catch (e) { }
        }
      }

      const ext = path.extname(fileName) || '.mp3';
      const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeFileName = `${prefix}${Date.now()}_${baseName}${ext}`;
      const targetFilePath = path.join(CUSTOM_SOUNDS_DIR, safeFileName);

      fs.writeFileSync(targetFilePath, Buffer.from(data, 'base64'));

      return res.json({ success: true, relativePath: `sounds/custom/${safeFileName}` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/delete-custom-audio', (req, res) => {
    try {
      const { bankId, padIndex } = req.body;

      if (fs.existsSync(CUSTOM_SOUNDS_DIR)) {
        const prefix = `${bankId}_pad_${padIndex}_`;
        const existing = fs.readdirSync(CUSTOM_SOUNDS_DIR);

        for (const f of existing) {
          if (f.startsWith(prefix)) {
            try { fs.unlinkSync(path.join(CUSTOM_SOUNDS_DIR, f)); } catch (e) { }
          }
        }
      }

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  httpServer = http.createServer(app);

  wss = new WebSocketServer({ server: httpServer, path: '/ws-remote' });

  wss.on('connection', (ws, req) => {
    connectedMobileClients.add(ws);
    console.log(`[MOBILE-WS] Client connected. Total active: ${connectedMobileClients.size}`);

    if (activeMainWindow && !activeMainWindow.isDestroyed()) {
      activeMainWindow.webContents.send('mobile-client-count', connectedMobileClients.size);
    }

    const currentConfig = readCurrentConfig();
    if (currentConfig) {
      ws.send(JSON.stringify({
        type: 'initial_state',
        payload: {
          gridType: currentConfig.gridType || '8x8',
          bankOrder: currentConfig.bankOrder || [],
          bankNames: currentConfig.bankNames || {},
          currentBankId: currentConfig.currentBankId || null,
          idleEffect: currentConfig.idleEffect !== undefined ? currentConfig.idleEffect : 1,
          pressEffect: currentConfig.pressEffect !== undefined ? currentConfig.pressEffect : 1,
          blendMode: currentConfig.blendMode !== undefined ? currentConfig.blendMode : 0,
          bankSettings: currentConfig.bankSettings || {},
          banks: currentConfig.banks || {}
        }
      }));
    }

    ws.on('message', (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw);

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (msg.type === 'request_state') {
          const cfg = readCurrentConfig();
          if (cfg) {
            ws.send(JSON.stringify({
              type: 'initial_state',
              payload: {
                gridType: cfg.gridType || '8x8',
                bankOrder: cfg.bankOrder || [],
                bankNames: cfg.bankNames || {},
                currentBankId: cfg.currentBankId || null,
                idleEffect: cfg.idleEffect !== undefined ? cfg.idleEffect : 1,
                pressEffect: cfg.pressEffect !== undefined ? cfg.pressEffect : 1,
                blendMode: cfg.blendMode !== undefined ? cfg.blendMode : 0,
                bankSettings: cfg.bankSettings || {},
                banks: cfg.banks || {}
              }
            }));
          }
          return;
        }

        if (activeMainWindow && !activeMainWindow.isDestroyed()) {
          if (msg.type === 'trigger_pad') {
            activeMainWindow.webContents.send('remote-pad-pressed', {
              bankId: msg.bankId,
              padIndex: msg.padIndex
            });
          } else if (msg.type === 'switch_bank') {
            activeMainWindow.webContents.send('remote-switch-bank', {
              bankId: msg.bankId
            });
          } else if (msg.type === 'stop_all') {
            activeMainWindow.webContents.send('remote-stop-all');
          }
        }
      } catch (err) {
        console.warn('[MOBILE-WS] Error handling incoming client message:', err.message);
      }
    });

    ws.on('close', () => {
      connectedMobileClients.delete(ws);
      console.log(`[MOBILE-WS] Client disconnected. Remaining active: ${connectedMobileClients.size}`);
      if (activeMainWindow && !activeMainWindow.isDestroyed()) {
        activeMainWindow.webContents.send('mobile-client-count', connectedMobileClients.size);
      }
    });

    ws.on('error', (err) => {
      console.warn('[MOBILE-WS] Socket error:', err.message);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(` LAUNCHPAD STUDIO PRO SERVER + REMOTE PAD`);
    console.log(` Local:   http://localhost:${PORT}/mobile`);
    const ips = getLocalIpAddresses();
    ips.forEach(ip => {
      console.log(` LAN IP:  http://${ip.address}:${PORT}/mobile (${ip.interface})`);
    });
    console.log(`=============================================================`);
  });

  return {
    httpServer,
    port: PORT,
    broadcastToMobile,
    getConnectedMobileCount,
    getLocalIpAddresses,
    getPrimaryLocalIp
  };
}

module.exports = {
  initServer,
  broadcastToMobile,
  getConnectedMobileCount,
  getLocalIpAddresses,
  getPrimaryLocalIp
};

if (require.main === module) {
  initServer();
}
