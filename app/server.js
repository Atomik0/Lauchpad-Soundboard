const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const CUSTOM_SOUNDS_DIR = path.join(__dirname, 'public', 'sounds', 'custom');
const CONFIG_FILE_PATH = path.join(__dirname, 'public', 'soundboard_config.json');

if (!fs.existsSync(CUSTOM_SOUNDS_DIR)) {
  fs.mkdirSync(CUSTOM_SOUNDS_DIR, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

app.get('/api/load-config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return res.json({ success: true, config: JSON.parse(data) });
    }

    return res.json({ success: false, reason: 'not_found' });
  }
  catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/save-config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(req.body, null, 2), 'utf8');

    return res.json({ success: true });
  }
  catch (err) {
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
  }
  catch (err) {
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
  }
  catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(` LAUNCHPAD 8x8 & 5x5 SOUNDBOARD PRO STUDIO`);
  console.log(` Servidor iniciado en: http://localhost:3000`);
  console.log(`=============================================================`);
});
