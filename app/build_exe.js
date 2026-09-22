const fs = require('fs');
const path = require('path');
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

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(targetZipPath, buffer);
  console.log(`[BUILD] Paquete de actualizacion generado con exito: ${path.basename(targetZipPath)} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
}

async function build() {
  const originalPkgRaw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(originalPkgRaw);
  const currentVersion = pkg.version || '1.0.0';
  const nextVersion = process.env.BUILD_VERSION || (process.argv[2] ? process.argv[2] : bumpVersion(currentVersion));

  console.log(`[BUILD] Version de compilacion: ${nextVersion} (anterior: ${currentVersion})`);

  try {
    const versionData = {
      version: nextVersion,
      buildDate: new Date().toISOString()
    };

    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf8');
  }
  catch (err) {
    console.warn('[BUILD] No se pudo escribir version.json:', err.message);
  }

const { execSync } = require('child_process');

function hasWineInstalled() {
  if (process.platform === 'win32') return true;
  try {
    execSync('which wine || which wine64', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

  try {
    pkg.version = nextVersion;

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

    console.log('[BUILD] Empaquetando aplicacion para Windows x64...');

    const packagerOptions = {
      dir: __dirname,
      name: 'Launchpad Studio Pro',
      platform: 'win32',
      arch: 'x64',
      out: path.join(__dirname, 'dist_exe'),
      overwrite: true,
      prune: false,
      ignore: /(^\/dist_exe|^\/_backup)/
    };

    if (hasWineInstalled()) {
      packagerOptions.icon = path.join(__dirname, 'assets', 'icon.ico');
    } else {
      console.warn('[BUILD] Aviso: Wine no esta instalado en este sistema Linux.');
      console.warn('[BUILD] Se creara el ejecutable .exe sin inyectar recursos rcedit.');
      console.warn('[BUILD] (Opcional: para incrustar el icono .ico en el .exe ejecuta: sudo apt install -y wine64)');

      try {
        const rceditPath = require.resolve('rcedit');
        require.cache[rceditPath] = {
          id: rceditPath,
          filename: rceditPath,
          loaded: true,
          exports: async () => {}
        };
      } catch (err) {}
    }

    const appPaths = await packager(packagerOptions);

    let finalOutputDir = appPaths && appPaths[0] ? appPaths[0] : '';

    if (finalOutputDir && fs.existsSync(finalOutputDir)) {
      const versionedDir = path.join(path.dirname(finalOutputDir), `Launchpad Studio Pro-v${nextVersion}-win32-x64`);

      if (fs.existsSync(versionedDir) && versionedDir !== finalOutputDir) {
        fs.rmSync(versionedDir, { recursive: true, force: true });
      }

      fs.renameSync(finalOutputDir, versionedDir);

      finalOutputDir = versionedDir;
    }

    console.log('[BUILD] Compilacion completada con exito en:', finalOutputDir);

    const updateZipPath = path.join(__dirname, 'dist_exe', `app-update-v${nextVersion}.zip`);
    await generateUpdateZip(updateZipPath);
  }
  catch (err) {
    console.error('[BUILD] Error durante la compilacion:', err);
    process.exitCode = 1;
  }
  finally {
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  }
}

build();
