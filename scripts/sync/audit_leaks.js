const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir || !fs.existsSync(targetDir)) {
  console.error('[AUDIT] Directorio objetivo no valido:', targetDir);
  process.exit(1);
}

let leakFound = false;

// 1. Archivos prohibidos
const forbiddenFiles = [
  '.env',
  path.join('bot_discord', '.env'),
  'vps_credentials.json',
  path.join('app', 'public', 'vps_default.json')
];

for (const rel of forbiddenFiles) {
  const full = path.join(targetDir, rel);
  if (fs.existsSync(full)) {
    console.error(`  [ERROR CRITICO] Archivo sensible detectado: ${rel}`);
    leakFound = true;
  }
}

// 2. Patrones sensibles dentro del codigo
// Discord tokens: OT..., MT..., OD..., ND... con formato Base64.Timestamp.HMAC (~59-72 chars)
const discordTokenRegex = /(?:OT|MT|OD|ND)[0-9A-Za-z_-]{20,}\.[0-9A-Za-z_-]{6,}\.[0-9A-Za-z_-]{20,}/;
const vpsRegex = /185\.150\.189\.159|u6U7U08w2GYd/;

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === '.git' || item === 'node_modules' || item === 'dist_exe' || item === 'dist_linux') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDirectory(full);
    } else {
      if (item === 'soundboard_clean_template.json' || item === 'audit_leaks.js') continue;
      if (/\.(png|ico|wav|mp3|ogg|zip|tar\.gz|exe|bin|hex|sh|bat)$/i.test(item)) continue;

      try {
        const content = fs.readFileSync(full, 'utf8');
        if (vpsRegex.test(content)) {
          console.error(`  [ERROR CRITICO] Credenciales de VPS detectadas en: ${path.relative(targetDir, full)}`);
          leakFound = true;
        }
        if (discordTokenRegex.test(content)) {
          console.error(`  [ERROR CRITICO] Token de Discord detectado en: ${path.relative(targetDir, full)}`);
          leakFound = true;
        }
      } catch (err) {
        // Ignorar archivos no legibles como texto
      }
    }
  }
}

scanDirectory(targetDir);

if (leakFound) {
  console.error('\n==================================================================');
  console.error('  SUBIDA ABORTADA POR SEGURIDAD.');
  console.error('  Se detectaron secretos privados. Eliminalos antes de continuar.');
  console.error('==================================================================');
  process.exit(1);
} else {
  console.log('  [OK] Auditoria superada: 0 secretos privados detectados.');
  process.exit(0);
}
