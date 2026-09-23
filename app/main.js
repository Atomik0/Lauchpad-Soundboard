const { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const JSZip = require('jszip');
let QRCode = null;
try {
  QRCode = require('./lib/qrcode');
} catch (e) {
  try {
    QRCode = require('qrcode');
  } catch (e2) {
    QRCode = null;
    console.warn('[MAIN] Modulo QRCode no disponible:', e2.message);
  }
}
const { initServer, broadcastToMobile, getConnectedMobileCount, getLocalIpAddresses, getPrimaryLocalIp } = require('./server');

const CUSTOM_SOUNDS_DIR = path.join(__dirname, 'public', 'sounds', 'custom');
const CONFIG_FILE_PATH = path.join(__dirname, 'public', 'soundboard_config.json');

if (!fs.existsSync(CUSTOM_SOUNDS_DIR)) {
  fs.mkdirSync(CUSTOM_SOUNDS_DIR, { recursive: true });
}

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

ipcMain.handle('register-global-hotkeys', async (event, shortcutsList) => {
  try {
    globalShortcut.unregisterAll();

    if (!Array.isArray(shortcutsList)) return { success: true, registeredCount: 0 };

    let count = 0;

    for (const sc of shortcutsList) {
      if (!sc.accelerator) continue;

      try {
        const ok = globalShortcut.register(sc.accelerator, () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-hotkey-pressed', {
              id: sc.id,
              action: sc.action,
              padIndex: sc.padIndex
            });
          }
        });
        if (ok) count++;
      }
      catch (e) {
        console.warn(`[HOTKEYS] Error registrando atajo ${sc.accelerator}:`, e.message);
      }
    }

    return { success: true, registeredCount: count };
  }
  catch (err) {
    console.error('Error en register-global-hotkeys:', err);

    return { success: false, error: err.message };
  }
});

ipcMain.handle('unregister-all-hotkeys', async () => {
  try {
    globalShortcut.unregisterAll();

    return { success: true };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-save-soundpack-dialog', async (event, defaultName = 'soundpack.soundpack') => {
  try {
    if (!mainWindow) return { canceled: true };

    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar Soundpack',
      defaultPath: defaultName,
      filters: [
        { name: 'Soundboard Pack (*.soundpack, *.zip)', extensions: ['soundpack', 'zip'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    });

    return res;
  }
  catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('show-open-soundpack-dialog', async () => {
  try {
    if (!mainWindow) return { canceled: true };

    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar Soundpack',
      filters: [
        { name: 'Soundboard Pack (*.soundpack, *.zip)', extensions: ['soundpack', 'zip'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    return res;
  }
  catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('save-binary-file', async (event, { filePath, buffer }) => {
  try {
    let buf;

    if (Buffer.isBuffer(buffer)) {
      buf = buffer;
    }
    else if (buffer instanceof ArrayBuffer) {
      buf = Buffer.from(buffer);
    }
    else if (ArrayBuffer.isView(buffer)) {
      buf = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    else {
      buf = Buffer.from(buffer);
    }

    fs.writeFileSync(filePath, buf);

    return { success: true };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-binary-file', async (event, { filePath }) => {
  try {
    const data = fs.readFileSync(filePath);

    return { success: true, data: data.buffer };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-custom-audio', async (event, { bankId, padIndex, fileName, buffer }) => {
  try {
    if (!fs.existsSync(CUSTOM_SOUNDS_DIR)) {
      fs.mkdirSync(CUSTOM_SOUNDS_DIR, { recursive: true });
    }

    const prefix = `${bankId}_pad_${padIndex}_`;
    const existingFiles = fs.readdirSync(CUSTOM_SOUNDS_DIR);

    for (const f of existingFiles) {
      if (f.startsWith(prefix)) {
        try {
          fs.unlinkSync(path.join(CUSTOM_SOUNDS_DIR, f));
        }
        catch (e) { }
      }
    }

    const ext = path.extname(fileName) || '.mp3';
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = `${prefix}${Date.now()}_${baseName}${ext}`;
    const targetFilePath = path.join(CUSTOM_SOUNDS_DIR, safeFileName);

    let fileBuffer;

    if (Buffer.isBuffer(buffer)) {
      fileBuffer = buffer;
    }
    else if (buffer instanceof ArrayBuffer) {
      fileBuffer = Buffer.from(buffer);
    }
    else if (ArrayBuffer.isView(buffer)) {
      fileBuffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    else {
      fileBuffer = Buffer.from(buffer);
    }

    fs.writeFileSync(targetFilePath, fileBuffer);
    console.log(`[SAVE] Audio guardado en disco: ${safeFileName}`);

    return {
      success: true,
      relativePath: `sounds/custom/${safeFileName}`,
      fileName: safeFileName
    };
  }
  catch (err) {
    console.error('Error guardando audio custom:', err);

    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-custom-audio', async (event, { bankId, padIndex }) => {
  try {
    if (fs.existsSync(CUSTOM_SOUNDS_DIR)) {
      const prefix = `${bankId}_pad_${padIndex}_`;
      const existingFiles = fs.readdirSync(CUSTOM_SOUNDS_DIR);

      for (const f of existingFiles) {
        if (f.startsWith(prefix)) {
          try {
            fs.unlinkSync(path.join(CUSTOM_SOUNDS_DIR, f));
          }
          catch (e) { }
        }
      }
    }

    return { success: true };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
});

function getAppVersion() {
  try {
    const versionFile = path.join(__dirname, 'public', 'version.json');
    if (fs.existsSync(versionFile)) {
      const vData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      if (vData && vData.version) return vData.version;
    }
  } catch (e) {}

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (pkg && pkg.version) return pkg.version;
  } catch (e) {}

  try {
    if (app && typeof app.getVersion === 'function') {
      const appVer = app.getVersion();
      if (appVer && appVer !== '0.0.0') return appVer;
    }
  } catch (e) {}

  return '1.0.0';
}

ipcMain.handle('get-app-version', () => {
  return getAppVersion();
});

const GITHUB_REPO = 'Atomik0/Launchpad-Soundboard';

function compareSemver(v1, v2) {
  const p1 = (v1 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Launchpad-Soundboard-Updater',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout comprobando actualizaciones'));
    });
  });
}

function downloadBinary(url, onProgress) {
  return new Promise((resolve, reject) => {
    const handleResponse = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'Launchpad-Soundboard-Updater' } }, handleResponse).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} al descargar actualizacion`));
      }
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      const chunks = [];

      res.on('data', chunk => {
        chunks.push(chunk);
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && typeof onProgress === 'function') {
          const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
          onProgress(percent, downloadedBytes, totalBytes);
        }
      });

      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    };

    https.get(url, { headers: { 'User-Agent': 'Launchpad-Soundboard-Updater' } }, handleResponse).on('error', reject);
  });
}

ipcMain.handle('check-app-update', async () => {
  try {
    const currentVersion = getAppVersion();

    const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const releaseData = await fetchJson(releaseUrl);

    if (!releaseData || !releaseData.tag_name) {
      return { updateAvailable: false, currentVersion };
    }

    const tagNameLower = releaseData.tag_name.toLowerCase();
    // Si el release es exclusivamente de firmware, la app de escritorio no debe hacer nada
    if (tagNameLower.startsWith('firmware') || tagNameLower.startsWith('fw-') || tagNameLower.startsWith('hw-')) {
      return { updateAvailable: false, currentVersion };
    }

    const latestVersion = releaseData.tag_name.replace(/^v/, '');
    const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

    let appUpdateAsset = null;
    let fullInstallerAsset = null;

    if (Array.isArray(releaseData.assets)) {
      appUpdateAsset = releaseData.assets.find(a => a.name && a.name.includes('app-update') && a.name.endsWith('.zip'));
      const isWin = process.platform === 'win32';
      fullInstallerAsset = releaseData.assets.find(a =>
        a.name && (isWin ? (a.name.endsWith('.zip') || a.name.endsWith('.exe')) : (a.name.endsWith('.tar.gz') || a.name.endsWith('.AppImage')))
      );
    }

    // Solo considerar actualizacion si existe el asset especifico para la aplicacion
    if (!appUpdateAsset && !fullInstallerAsset) {
      return { updateAvailable: false, currentVersion };
    }

    return {
      updateAvailable: hasUpdate && Boolean(appUpdateAsset),
      currentVersion,
      latestVersion,
      releaseTitle: releaseData.name || `Version ${latestVersion}`,
      releaseNotes: releaseData.body || '',
      releaseHtmlUrl: releaseData.html_url,
      updateAssetUrl: appUpdateAsset ? appUpdateAsset.browser_download_url : null,
      fullAssetUrl: fullInstallerAsset ? fullInstallerAsset.browser_download_url : null
    };
  } catch (err) {
    return { updateAvailable: false, error: err.message };
  }
});

ipcMain.handle('apply-app-update', async (event, downloadUrl) => {
  if (!downloadUrl) {
    return { success: false, error: 'URL de descarga invalida' };
  }

  try {
    const zipBuffer = await downloadBinary(downloadUrl, (percent, dl, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', { percent, dl, total });
      }
    });

    const backupConfig = fs.existsSync(CONFIG_FILE_PATH) ? fs.readFileSync(CONFIG_FILE_PATH, 'utf8') : null;
    const backupVps = fs.existsSync(ROOT_VPS_CREDS_PATH) ? fs.readFileSync(ROOT_VPS_CREDS_PATH, 'utf8') : null;

    const zip = await JSZip.loadAsync(zipBuffer);

    const protectedPaths = [
      'public/soundboard_config.json',
      'public/vps_default.json',
      '../vps_credentials.json',
      'vps_credentials.json'
    ];

    const entries = Object.keys(zip.files);
    for (const rawFilename of entries) {
      const file = zip.files[rawFilename];

      // Sanitizar ruta para prevenir path traversal
      const cleanRelativePath = path.normalize(rawFilename).replace(/^(\.\.[\/\\])+/, '');

      // Solo permitir archivos que pertenezcan a la app (prohibir firmware, bot_discord, etc.)
      if (cleanRelativePath.startsWith('firmware') || cleanRelativePath.startsWith('bot_discord')) {
        continue;
      }

      if (cleanRelativePath.includes('public/sounds/custom/') && !cleanRelativePath.endsWith('.gitkeep')) {
        continue;
      }
      if (protectedPaths.some(p => cleanRelativePath.endsWith(p))) {
        continue;
      }

      const destPath = path.join(__dirname, cleanRelativePath);

      // Asegurar que el destino este estrictamente dentro de la aplicacion
      if (!destPath.startsWith(__dirname)) {
        continue;
      }

      if (file.dir) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
      } else {
        const fileDir = path.dirname(destPath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        const content = await file.async('nodebuffer');
        fs.writeFileSync(destPath, content);
      }
    }

    if (backupConfig && fs.existsSync(CONFIG_FILE_PATH)) {
      fs.writeFileSync(CONFIG_FILE_PATH, backupConfig, 'utf8');
    }
    if (backupVps && fs.existsSync(ROOT_VPS_CREDS_PATH)) {
      fs.writeFileSync(ROOT_VPS_CREDS_PATH, backupVps, 'utf8');
    }

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1000);

    return { success: true };
  } catch (err) {
    console.error('Error aplicando actualizacion:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-release-url', async (event, url) => {
  try {
    const target = url || `https://github.com/${GITHUB_REPO}/releases/latest`;
    await shell.openExternal(target);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

const ROOT_VPS_CREDS_PATH = path.join(__dirname, '..', 'vps_credentials.json');

ipcMain.handle('save-vps-credentials', async (event, creds) => {
  try {
    const jsonStr = JSON.stringify(creds, null, 2);

    fs.writeFileSync(ROOT_VPS_CREDS_PATH, jsonStr, 'utf8');

    return { success: true };
  }
  catch (err) {
    console.error('Error guardando vps_credentials.json:', err);

    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-vps-credentials', async () => {
  try {
    if (fs.existsSync(ROOT_VPS_CREDS_PATH)) {
      const data = fs.readFileSync(ROOT_VPS_CREDS_PATH, 'utf8');

      return { success: true, credentials: JSON.parse(data) };
    }

    return { success: false };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-soundboard-config', async (event, config) => {
  try {
    const jsonStr = JSON.stringify(config, null, 2);

    fs.writeFileSync(CONFIG_FILE_PATH, jsonStr, 'utf8');
    broadcastToMobile('initial_state', config);

    return { success: true };
  }
  catch (err) {
    console.error('Error guardando soundboard_config.json:', err);

    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-soundboard-config', async () => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const config = JSON.parse(data);

      return { success: true, config };
    }
    return { success: false, reason: 'not_found' };
  }
  catch (err) {
    console.error('Error cargando soundboard_config.json:', err);

    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-mobile-remote-info', async () => {
  try {
    const ips = getLocalIpAddresses();
    const primaryIp = getPrimaryLocalIp();
    const port = 3000;
    const url = `http://${primaryIp}:${port}/mobile`;
    let qrDataUrl = '';
    if (QRCode && typeof QRCode.toDataURL === 'function') {
      try {
        qrDataUrl = await QRCode.toDataURL(url, {
          color: {
            dark: '#0A0A0C',
            light: '#FFFFFF'
          },
          width: 260,
          margin: 2
        });
      } catch (qrErr) {
        console.warn('[MAIN] Error generando codigo QR:', qrErr.message);
      }
    }

    return {
      success: true,
      ips,
      primaryIp,
      port,
      url,
      qrDataUrl,
      connectedCount: getConnectedMobileCount()
    };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('mobile-broadcast', (event, { type, payload }) => {
  broadcastToMobile(type, payload);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    title: 'Launchpad 8x8 Soundboard Pro',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0a0c',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  initServer(mainWindow);

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();

    if (portList && portList.length > 0) {
      console.log(`[USB] Conectando automaticamente al puerto COM: ${portList[0].portName || portList[0].portId}`);

      callback(portList[0].portId);
    }
    else {
      console.warn('[USB] No se detecto ningun puerto serie / Launchpad USB conectado.');

      callback('');
    }
  });

  mainWindow.webContents.session.setPermissionCheckHandler(() => true);
  mainWindow.webContents.session.setDevicePermissionHandler(() => true);

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  if (process.argv.includes('--take-screenshots')) {
    mainWindow.webContents.on('did-finish-load', async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

      await sleep(1500);

      const outDir = path.join(__dirname, '..', 'docs', 'screenshots');

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const captureTab = async (tabId, fileName) => {
        await mainWindow.webContents.executeJavaScript(`
          (function() {
            localStorage.setItem('soundboard_setup_completed', 'true');
            const wizard = document.getElementById('modal-onboarding-wizard');
            if (wizard) wizard.style.display = 'none';

            document.querySelectorAll('.tab-btn').forEach(b => {
              b.classList.toggle('active', b.dataset.tab === '${tabId}');
            });
            document.querySelectorAll('.tab-content').forEach(c => {
              c.classList.toggle('active', c.id === '${tabId}');
            });
            if ('${tabId}' === 'tab-lights' && typeof onLightsTabActivated === 'function') {
              try { onLightsTabActivated(); } catch (e) { }
            }
          })();
        `);

        await sleep(600);

        const image = await mainWindow.capturePage();

        fs.writeFileSync(path.join(outDir, fileName), image.toPNG());

        console.log(`[CAPTURA] Guardada: ${fileName}`);
      };

      await captureTab('tab-inspector', '01_soundboard_principal.png');
      await captureTab('tab-lights', '02_luces_efectos.png');
      await captureTab('tab-discord', '03_bot_discord.png');
      await captureTab('tab-obs', '04_obs_studio.png');

      console.log('[CAPTURA] Todas las capturas generadas exitosamente.');

      app.quit();
    });
  }

  if (process.argv.includes('--record-gif')) {
    mainWindow.webContents.on('did-finish-load', async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

      await sleep(1500);

      const framesDir = '/tmp/soundboard_gif_frames';

      if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });

      fs.mkdirSync(framesDir, { recursive: true });

      await mainWindow.webContents.executeJavaScript(`
        (function() {
          localStorage.setItem('soundboard_setup_completed', 'true');
          const wizard = document.getElementById('modal-onboarding-wizard');
          if (wizard) wizard.style.display = 'none';

          state.idleEffect = 1;
          const selIdle = document.getElementById('select-idle-effect');
          if (selIdle) selIdle.value = '1';

          setTimeout(() => triggerLightEffect(3, 3, '#c3ea2b', 0), 200);
          setTimeout(() => triggerLightEffect(2, 5, '#00f0ff', 12), 1100);
          setTimeout(() => triggerLightEffect(5, 2, '#ff007f', 1), 1900);
        })();
      `);

      const totalFrames = 42;

      for (let i = 0; i < totalFrames; i++) {
        const image = await mainWindow.capturePage();
        const fName = path.join(framesDir, `frame_${String(i).padStart(3, '0')}.png`);

        fs.writeFileSync(fName, image.toPNG());

        await sleep(65);
      }

      console.log('[GIF] Frames capturados exitosamente.');

      app.quit();
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      }
      else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
