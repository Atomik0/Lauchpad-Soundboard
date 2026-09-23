const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packager = require('electron-packager');

const pkgPath = path.join(__dirname, 'package.json');
const versionFilePath = path.join(__dirname, 'public', 'version.json');

function bumpVersion(versionStr) {
  const parts = (versionStr || '1.0.0').split('.').map(Number);

  if (parts.length < 3 || parts.some(isNaN)) {
    return '1.0.1';
  }

  parts[2] += 1;

  return parts.join('.');
}

async function generateUpdateZip(targetZipPath) {
  const JSZip = require('jszip');
  const zip = new JSZip();

  function addDirToZip(localDir, zipFolder) {
    const items = fs.readdirSync(localDir);
    for (const item of items) {
      if (item === 'node_modules' || item === 'dist_exe' || item === 'dist_linux' || item === '_backup_personal' || item === '.git') continue;
      if (item === 'custom' && localDir.endsWith('sounds')) {
        zipFolder.folder(item).file('.gitkeep', '');
        continue;
      }
      if (item === 'soundboard_config.json' || item.endsWith('.user_backup') || item === 'vps_default.json') continue;

      const fullPath = path.join(localDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addDirToZip(fullPath, zipFolder.folder(item));
      } else {
        zipFolder.file(item, fs.readFileSync(fullPath));
      }
    }
  }

  addDirToZip(__dirname, zip);

  const mobileSourceDir = path.resolve(__dirname, '..', 'mobile_app');
  if (fs.existsSync(mobileSourceDir)) {
    addDirToZip(mobileSourceDir, zip.folder('mobile_app'));
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(targetZipPath, buffer);
  console.log(`[BUILD-LINUX] Paquete de actualizacion generado con exito: ${path.basename(targetZipPath)} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
}

async function build() {
  const originalPkgRaw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(originalPkgRaw);
  const currentVersion = pkg.version || '1.0.0';
  const nextVersion = process.env.BUILD_VERSION || (process.argv[2] ? process.argv[2] : bumpVersion(currentVersion));

  console.log(`[BUILD-LINUX] Version de compilacion: ${nextVersion} (anterior: ${currentVersion})`);

  try {
    const versionData = {
      version: nextVersion,
      buildDate: new Date().toISOString()
    };

    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf8');
  }
  catch (err) {
    console.warn('[BUILD-LINUX] No se pudo escribir version.json:', err.message);
  }

  try {
    console.log('[BUILD-LINUX] Empaquetando aplicacion para Linux x64...');

    const mobileResourceDir = path.resolve(__dirname, '..', 'mobile_app');
    const extraResources = [];
    if (fs.existsSync(mobileResourceDir)) {
      extraResources.push(mobileResourceDir);
    }

    const appPaths = await packager({
      dir: __dirname,
      name: 'Launchpad Studio Pro',
      platform: 'linux',
      arch: 'x64',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      out: path.join(__dirname, 'dist_linux'),
      overwrite: true,
      prune: false,
      ignore: /(^\/dist_linux|^\/dist_exe|^\/_backup)/,
      extraResource: extraResources
    });

    let finalOutputDir = appPaths && appPaths[0] ? appPaths[0] : '';

    if (finalOutputDir && fs.existsSync(finalOutputDir)) {
      const versionedDir = path.join(path.dirname(finalOutputDir), `Launchpad Studio Pro-v${nextVersion}-linux-x64`);

      if (fs.existsSync(versionedDir) && versionedDir !== finalOutputDir) {
        fs.rmSync(versionedDir, { recursive: true, force: true });
      }

      fs.renameSync(finalOutputDir, versionedDir);
      finalOutputDir = versionedDir;

      const originalBinary = path.join(finalOutputDir, 'Launchpad Studio Pro');
      const renamedBinary = path.join(finalOutputDir, 'launchpad-bin');

      if (fs.existsSync(originalBinary)) {
        fs.renameSync(originalBinary, renamedBinary);
        try { fs.chmodSync(renamedBinary, 0o755); } catch (e) { }

        const launcherScript = `#!/usr/bin/env bash
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/launchpad-bin" --no-sandbox "$@"
`;
        fs.writeFileSync(originalBinary, launcherScript, { encoding: 'utf8', mode: 0o755 });
      }
    }

    console.log('[BUILD-LINUX] Compilacion completada con exito en:', finalOutputDir);

    const updateZipPath = path.join(__dirname, 'dist_linux', `app-update-v${nextVersion}.zip`);
    await generateUpdateZip(updateZipPath);

    const linuxTarPath = path.join(__dirname, 'dist_linux', `Launchpad-Studio-Pro-v${nextVersion}-linux-x64.tar.gz`);
    const linuxZipPath = path.join(__dirname, 'dist_linux', `Launchpad-Studio-Pro-v${nextVersion}-linux-x64.zip`);
    if (finalOutputDir && fs.existsSync(finalOutputDir)) {
      console.log(`[BUILD-LINUX] Comprimiendo paquete Linux...`);
      const parentDir = path.dirname(finalOutputDir);
      const folderName = path.basename(finalOutputDir);
      try {
        try {
          execSync(`tar -czf "${linuxTarPath}" -C "${parentDir}" "${folderName}"`, { stdio: 'inherit' });
          if (fs.existsSync(linuxTarPath)) {
            const stat = fs.statSync(linuxTarPath);
            console.log(`[BUILD-LINUX] Paquete Linux .tar.gz generado con exito: ${path.basename(linuxTarPath)} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
          }
        } catch (tarErr) {
          console.warn('[BUILD-LINUX] Aviso al generar .tar.gz:', tarErr.message);
        }

        try {
          if (process.platform === 'win32') {
            try {
              execSync(`tar -a -c -f "${linuxZipPath}" -C "${parentDir}" "${folderName}"`, { stdio: 'inherit' });
            } catch {
              execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${finalOutputDir}' -DestinationPath '${linuxZipPath}' -Force"`, { stdio: 'inherit' });
            }
          } else {
            execSync(`cd "${parentDir}" && zip -r -q "${linuxZipPath}" "${folderName}"`, { stdio: 'inherit' });
          }
          if (fs.existsSync(linuxZipPath)) {
            const stat = fs.statSync(linuxZipPath);
            console.log(`[BUILD-LINUX] Paquete Linux .zip generado con exito: ${path.basename(linuxZipPath)} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
          }
        } catch (zipErr) {
          console.warn('[BUILD-LINUX] Aviso al generar .zip:', zipErr.message);
        }
      } catch (err) {
        console.warn('[BUILD-LINUX] Error comprimiendo paquetes de Linux:', err.message);
      }
    }
  }
  catch (err) {
    console.error('[BUILD-LINUX] Error durante la compilacion:', err);
    process.exitCode = 1;
  }
  finally {
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  }
}

build();
