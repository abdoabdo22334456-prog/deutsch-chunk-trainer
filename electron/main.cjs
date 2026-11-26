const { app, BrowserWindow, ipcMain, session, shell, Menu, dialog, screen } = require('electron');
const path = require('node:path');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const os = require('node:os');
const { randomUUID, createHash } = require('node:crypto');
const http = require('node:http');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const IS_SHOT = Boolean(process.env.CHUNK_SHOT_DIR);
const SHOT_DIR = process.env.CHUNK_SHOT_DIR || '';

app.setName('ChunkTrainer');
app.setAppUserModelId('com.abdo.chunktrainer');

const USER_DIR = app.getPath('userData');
const STATE_FILE = path.join(USER_DIR, 'progress.json');
const BACKUP_DIR = path.join(USER_DIR, 'backups');
const WINDOW_FILE = path.join(USER_DIR, 'window.json');
const DATA_FILE = path.join(ROOT, 'data', 'chunks.json');
const WHISPER_DIR = path.join(USER_DIR, 'whisper');

const WHISPER_MODELS = {
  base: {
    id: 'base',
    name: 'ggml-base.bin',
    label: 'النموذج الخفيف والسريع (Base)',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    expectedBytes: 147951465,
    minBytes: 100 * 1024 * 1024,
    description: 'خفيف (~142 MB)، سريع جداً، مناسب للأجهزة المتوسطة واللابتوبات العادية (رام 4-8 GB).'
  },
  turbo: {
    id: 'turbo',
    name: 'ggml-large-v3-turbo.bin',
    label: 'النموذج الاحترافي فائق الدقة (Large v3 Turbo)',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    expectedBytes: 1624555275,
    minBytes: 500 * 1024 * 1024,
    description: 'دقة فائقة (~1.5 GB)، يحتاج جهاز قوي (رام 8GB+ ومساحة كافية).'
  }
};

let activeDownload = null;

function resolveWhisperPaths() {
  const candidateBins = [
    path.join(__dirname, 'whisper-bin'),
    path.join(USER_DIR, 'whisper', 'bin'),
    path.join(ROOT, 'electron', 'whisper-bin'),
  ];
  let binDir = candidateBins[0];
  let hasTools = false;
  for (const dir of candidateBins) {
    const ff = path.join(dir, 'ffmpeg.exe');
    const wh = path.join(dir, 'whisper-cli.exe');
    if (fs.existsSync(ff) && fs.existsSync(wh)) {
      binDir = dir;
      hasTools = true;
      break;
    }
  }

  let activeModel = null;
  const modelsStatus = {};
  for (const key of ['turbo', 'base']) {
    const m = WHISPER_MODELS[key];
    const filePath = path.join(WHISPER_DIR, m.name);
    let size = 0;
    let installed = false;
    try {
      const st = fs.statSync(filePath);
      if (st.isFile() && st.size >= m.minBytes) {
        installed = true;
        size = st.size;
        if (!activeModel) {
          activeModel = { ...m, file: filePath, size };
        }
      }
    } catch {}
    modelsStatus[key] = {
      ...m,
      installed,
      size,
      filePath
    };
  }

  return {
    binDir,
    hasTools,
    ffmpegPath: path.join(binDir, 'ffmpeg.exe'),
    whisperPath: path.join(binDir, 'whisper-cli.exe'),
    activeModel,
    modelsStatus,
    whisperDir: WHISPER_DIR,
  };
}

let win = null;
let lastBackupAt = 0;
let writeChain = Promise.resolve();
let transcriptionJob = null;

function killProcessTree(child) {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }); } catch {}
  } else {
    try { child.kill('SIGKILL'); } catch {}
  }
}

function runHidden(executable, args, job, timeoutMs, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    let errorText = '';
    let timedOut = false;
    const child = spawn(executable, args, {
      cwd: path.dirname(executable),
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, ...extraEnv },
    });
    job.child = child;
    child.stderr.on('data', (part) => {
      errorText = (errorText + part.toString('utf8')).slice(-4000);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      job.child = null;
      if (timedOut) reject(new Error('timeout'));
      else if (job.cancelled) reject(new Error('cancelled'));
      else if (code !== 0) reject(new Error(`tool-failed: ${errorText}`));
      else resolve();
    });
  });
}

function trustedRenderer(event) {
  return win && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(file, fallback = null) {
  try {
    const text = await fsp.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const handle = await fsp.open(tmp, 'w');
  try {
    await handle.writeFile(JSON.stringify(value, null, 2), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  let renamed = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fsp.rename(tmp, file);
      renamed = true;
      break;
    } catch (err) {
      if (attempt < 4 && (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES')) {
        await delay(20 * Math.pow(2, attempt));
      } else {
        break;
      }
    }
  }
  if (!renamed) {
    await fsp.copyFile(tmp, file);
    await fsp.rm(tmp, { force: true }).catch(() => {});
  }
}

async function readStateWithRecovery() {
  try {
    const text = await fsp.readFile(STATE_FILE, 'utf8');
    return { state: JSON.parse(text), recoveredFromBackup: false };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { state: null, recoveredFromBackup: false };
    }
    // Preserve corrupt file and auto-recover from latest valid backup
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await fsp.copyFile(STATE_FILE, path.join(USER_DIR, `progress.corrupt.${stamp}.json`));
    } catch {}
    try {
      const files = (await fsp.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort().reverse();
      for (const file of files) {
        const candidate = await readJson(path.join(BACKUP_DIR, file));
        if (candidate && typeof candidate === 'object' && candidate.chunks) {
          await writeJsonAtomic(STATE_FILE, candidate);
          return { state: candidate, recoveredFromBackup: true, backupFile: file };
        }
      }
    } catch {}
    return { state: null, recoveredFromBackup: false, corruptPreserved: true };
  }
}

async function snapshotBackup({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastBackupAt < 5 * 60 * 1000) return;
  const existing = await readJson(STATE_FILE);
  if (!existing) return;
  lastBackupAt = now;
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date(now).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await fsp.copyFile(STATE_FILE, path.join(BACKUP_DIR, `progress-${stamp}.json`));
  const files = (await fsp.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort();
  for (const stale of files.slice(0, Math.max(0, files.length - 16))) {
    await fsp.rm(path.join(BACKUP_DIR, stale), { force: true });
  }
}

function registerIpc() {
  ipcMain.handle('whisper:status', async () => {
    const paths = resolveWhisperPaths();
    return {
      ok: true,
      hasTools: paths.hasTools,
      hasModel: Boolean(paths.activeModel),
      activeModel: paths.activeModel ? {
        id: paths.activeModel.id,
        name: paths.activeModel.name,
        label: paths.activeModel.label,
        sizeMB: Math.round(paths.activeModel.size / (1024 * 1024)),
      } : null,
      models: paths.modelsStatus,
      binDir: paths.binDir,
      whisperDir: paths.whisperDir,
      specs: {
        cpus: os.cpus().length,
        totalMemGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
        freeMemGB: Math.round(os.freemem() / (1024 * 1024 * 1024)),
        platform: process.platform,
        arch: process.arch,
      },
      downloading: activeDownload ? {
        modelId: activeDownload.modelId,
        percent: activeDownload.percent,
        loaded: activeDownload.loaded,
        total: activeDownload.total,
      } : null,
    };
  });

  ipcMain.handle('whisper:download', async (event, modelKey = 'base') => {
    if (!trustedRenderer(event)) return { ok: false, error: 'untrusted' };
    if (activeDownload) return { ok: false, error: 'busy' };
    const targetModel = WHISPER_MODELS[modelKey] || WHISPER_MODELS.base;
    await fsp.mkdir(WHISPER_DIR, { recursive: true });

    const targetFile = path.join(WHISPER_DIR, targetModel.name);
    const tempFile = `${targetFile}.part`;

    const controller = new AbortController();
    activeDownload = {
      modelId: targetModel.id,
      controller,
      percent: 0,
      loaded: 0,
      total: targetModel.expectedBytes,
    };

    try {
      const res = await fetch(targetModel.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ChunkTrainer-Downloader' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length')) || targetModel.expectedBytes;
      activeDownload.total = total;

      const fileHandle = await fsp.open(tempFile, 'w');
      let loaded = 0;
      let lastEmit = Date.now();

      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await fileHandle.write(value);
        loaded += value.length;
        activeDownload.loaded = loaded;
        activeDownload.percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

        const now = Date.now();
        if (now - lastEmit > 200 || loaded === total) {
          lastEmit = now;
          if (win && !win.isDestroyed()) {
            win.webContents.send('whisper:download-progress', {
              modelId: targetModel.id,
              loaded,
              total,
              percent: activeDownload.percent,
            });
          }
        }
      }
      await fileHandle.close();
      await fsp.rename(tempFile, targetFile);

      if (win && !win.isDestroyed()) {
        win.webContents.send('whisper:download-complete', {
          modelId: targetModel.id,
          success: true,
        });
      }
      return { ok: true, modelId: targetModel.id };
    } catch (err) {
      await fsp.rm(tempFile, { force: true }).catch(() => {});
      if (err.name === 'AbortError') {
        return { ok: false, error: 'cancelled' };
      }
      console.error('Whisper download failed:', err.message);
      return { ok: false, error: err.message };
    } finally {
      activeDownload = null;
    }
  });

  ipcMain.handle('whisper:cancel-download', (event) => {
    if (!trustedRenderer(event)) return { ok: false };
    if (activeDownload) {
      activeDownload.controller.abort();
      activeDownload = null;
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle('whisper:delete-model', async (event, modelKey) => {
    if (!trustedRenderer(event)) return { ok: false };
    const targetModel = WHISPER_MODELS[modelKey];
    if (!targetModel) return { ok: false, error: 'not-found' };
    const filePath = path.join(WHISPER_DIR, targetModel.name);
    await fsp.rm(filePath, { force: true });
    return { ok: true };
  });

  ipcMain.handle('whisper:transcribe', async (event, audio) => {
    if (!trustedRenderer(event)) return { ok: false, error: 'untrusted' };
    if (transcriptionJob) return { ok: false, error: 'busy' };
    const bytes = audio instanceof Uint8Array || audio instanceof ArrayBuffer ? Buffer.from(audio) : null;
    if (!bytes || bytes.length < 1024 || bytes.length > 15 * 1024 * 1024) {
      return { ok: false, error: 'bad-audio' };
    }
    const paths = resolveWhisperPaths();
    if (!paths.hasTools) return { ok: false, error: 'tool-missing' };
    if (!paths.activeModel) return { ok: false, error: 'model-missing' };

    const id = randomUUID();
    const input = path.join(WHISPER_DIR, `${id}.webm`);
    const wav = path.join(WHISPER_DIR, `${id}.wav`);
    const outputBase = path.join(WHISPER_DIR, id);
    const output = `${outputBase}.txt`;
    const job = { cancelled: false, child: null };
    transcriptionJob = job;
    try {
      await fsp.mkdir(WHISPER_DIR, { recursive: true });
      await fsp.writeFile(input, bytes, { flag: 'wx' });
      await runHidden(paths.ffmpegPath, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
        '-t', '32', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], job, 30000);
      if (job.cancelled) return { ok: false, error: 'cancelled' };
      const threads = Math.max(2, Math.min(8, Math.floor(os.cpus().length / 2)));
      await runHidden(paths.whisperPath, ['--model', paths.activeModel.file, '--file', wav, '--language', 'de',
        '--threads', String(threads), '--beam-size', '5', '--no-timestamps', '--output-txt',
        '--output-file', outputBase], job, 300000);
      if (job.cancelled) return { ok: false, error: 'cancelled' };
      const text = (await fsp.readFile(output, 'utf8')).trim();
      return text ? { ok: true, text } : { ok: false, error: 'empty' };
    } catch (error) {
      if (job.cancelled) return { ok: false, error: 'cancelled' };
      if (error.message === 'timeout') return { ok: false, error: 'timeout' };
      console.error('whisper transcription failed:', error.message);
      return { ok: false, error: 'failed' };
    } finally {
      transcriptionJob = null;
      await Promise.all([input, wav, output].map((file) => fsp.rm(file, { force: true }).catch(() => {})));
    }
  });

  ipcMain.handle('whisper:cancel', (event) => {
    if (!trustedRenderer(event)) return { ok: false };
    if (transcriptionJob) {
      transcriptionJob.cancelled = true;
      transcriptionJob.child?.kill();
    }
    return { ok: true };
  });

  ipcMain.handle('data:chunks', async (event) => {
    if (!trustedRenderer(event)) return null;
    return readJson(DATA_FILE);
  });

  ipcMain.handle('state:load', async (event) => {
    if (!trustedRenderer(event)) return { state: null };
    const { state, recoveredFromBackup, backupFile, corruptPreserved } = await readStateWithRecovery();
    return { state, path: STATE_FILE, dir: USER_DIR, recoveredFromBackup, backupFile, corruptPreserved };
  });

  ipcMain.handle('state:save', async (event, state) => {
    if (!trustedRenderer(event)) return { ok: false, error: 'untrusted' };
    if (!state || typeof state !== 'object') return { ok: false, error: 'bad-state' };
    const job = async () => {
      await snapshotBackup();
      const payload = { ...state, updatedAt: new Date().toISOString() };
      await writeJsonAtomic(STATE_FILE, payload);
      return { ok: true, savedAt: payload.updatedAt };
    };
    writeChain = writeChain.then(job, job);
    return writeChain;
  });

  ipcMain.on('state:save-sync', (event, state) => {
    if (!trustedRenderer(event) || !state || typeof state !== 'object') {
      event.returnValue = false;
      return;
    }
    try {
      const payload = { ...state, updatedAt: new Date().toISOString() };
      const tmp = `${STATE_FILE}.${process.pid}.sync.tmp`;
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      try {
        fs.renameSync(tmp, STATE_FILE);
      } catch {
        fs.copyFileSync(tmp, STATE_FILE);
        fs.rmSync(tmp, { force: true });
      }
      event.returnValue = true;
    } catch {
      event.returnValue = false;
    }
  });

  ipcMain.handle('state:export', async (event) => {
    if (!trustedRenderer(event)) return { ok: false };
    await writeChain;
    const result = await dialog.showSaveDialog(win, {
      title: 'تصدير التقدم / Export Progress',
      defaultPath: path.join(app.getPath('documents'), `chunk-progress-${new Date().toISOString().slice(0, 10)}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const state = await readJson(STATE_FILE);
    await writeJsonAtomic(result.filePath, state ?? {});
    return { ok: true, filePath: result.filePath };
  });

  ipcMain.handle('state:import', async (event) => {
    if (!trustedRenderer(event)) return { ok: false };
    const result = await dialog.showOpenDialog(win, {
      title: 'استيراد ملف تقدم / Import Progress',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const imported = await readJson(result.filePaths[0]);
    if (!imported || typeof imported !== 'object' || !imported.chunks) {
      return { ok: false, error: 'الملف مش ملف تقدم صالح' };
    }
    const job = async () => {
      await snapshotBackup({ force: true });
      await writeJsonAtomic(STATE_FILE, imported);
      return { ok: true, state: imported, filePath: result.filePaths[0] };
    };
    writeChain = writeChain.then(job, job);
    return writeChain;
  });

  ipcMain.handle('state:reset', async (event) => {
    if (!trustedRenderer(event)) return { ok: false };
    const job = async () => {
      await snapshotBackup({ force: true });
      await fsp.rm(STATE_FILE, { force: true });
      return { ok: true };
    };
    writeChain = writeChain.then(job, job);
    return writeChain;
  });

  ipcMain.handle('shell:open-data-folder', async () => {
    await fsp.mkdir(USER_DIR, { recursive: true });
    await shell.openPath(USER_DIR);
    return { ok: true };
  });

  ipcMain.handle('app:focus', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
    return true;
  });

  ipcMain.handle('app:info', async () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    userDir: USER_DIR,
    stateFile: STATE_FILE,
    backupDir: BACKUP_DIR,
    root: ROOT,
  }));
}

async function createWindow() {
  const saved = await readJson(WINDOW_FILE);
  const fallback = { width: 1320, height: 880 };
  let bounds = fallback;

  if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
    const wideEnough = saved.width >= 900 && saved.height >= 600;
    const onScreen =
      Number.isFinite(saved.x) &&
      Number.isFinite(saved.y) &&
      screen.getAllDisplays().some((display) => {
        const area = display.workArea;
        return (
          saved.x + saved.width > area.x + 40 &&
          saved.x < area.x + area.width - 40 &&
          saved.y + saved.height > area.y + 40 &&
          saved.y < area.y + area.height - 40
        );
      });
    if (wideEnough && onScreen) bounds = saved;
  }

  win = new BrowserWindow({
    ...bounds,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: '#e9eff5',
    title: 'دفتر الشانكس',
    icon: path.join(ROOT, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(ROOT, 'src', 'index.html'), { hash: '/home' });

  const reveal = () => {
    if (!win || win.isDestroyed()) return;
    win.show();
    if (win.isMinimized()) win.restore();
    win.show();
    win.webContents.executeJavaScript('window.scrollTo(0, 0)').catch(() => {});
    if (!IS_SHOT) win.focus();
  };

  win.once('ready-to-show', reveal);
  win.webContents.once('did-finish-load', () => setTimeout(reveal, 350));
  setTimeout(reveal, 2500);

  win.on('close', async () => {
    try {
      if (!win.isDestroyed() && !win.isMinimized()) {
        const { x, y, width, height } = win.getBounds();
        if (width >= 900 && height >= 600) {
          await writeJsonAtomic(WINDOW_FILE, { x, y, width, height });
        }
      }
    } catch {
      /* window geometry is a nicety, never block quitting */
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const dev = !app.isPackaged || process.env.CHUNK_DEV === '1';
    if (input.key === 'F12' && dev) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      win.webContents.reload();
      event.preventDefault();
    }
  });

  win.webContents.on('did-finish-load', () => {
    if (IS_SHOT) runScreenshots();
  });

  win.webContents.on('console-message', (...args) => {
    const details = args[1];
    if (details && typeof details === 'object' && 'message' in details) {
      console.log(`[renderer:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`);
    } else {
      console.log('[renderer]', args[2], args[4] || '');
    }
  });

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('preload error', preloadPath, error);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('renderer gone', details);
  });
}

async function runScreenshots() {
  try {
    await fsp.mkdir(SHOT_DIR, { recursive: true });
    await delay(1400);
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)').catch(() => {});
    const routes = [
      ['01-home', '#/home'],
      ['02-level-a1', '#/level/A1'],
      ['03-practice-step1', '#/practice/A1-003?step=1'],
      ['04-practice-step3', '#/practice/A1-003?step=3'],
      ['05-practice-step5', '#/practice/A1-003?step=5'],
      ['06-review', '#/review'],
      ['07-stats', '#/stats'],
      ['08-settings', '#/settings'],
      ['09-method', '#/method'],
      ['10-home-dark', '#/home'],
    ];
    for (const [name, hash] of routes) {
      await win.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`);
      await delay(name === '10-home-dark' ? 200 : 850);
      if (name === '10-home-dark') {
        await win.webContents.executeJavaScript(
          "document.documentElement.setAttribute('data-theme','dark')",
        );
        await delay(500);
      }
      const image = await win.webContents.capturePage();
      await fsp.writeFile(path.join(SHOT_DIR, `${name}.png`), image.toPNG());
      console.log('shot', name);
    }
  } catch (error) {
    console.error('screenshot failed', error);
  } finally {
    app.quit();
  }
}

async function cleanStaleTemps() {
  try {
    const files = await fsp.readdir(USER_DIR);
    await Promise.all(
      files.filter((file) => file.endsWith('.tmp')).map((file) => fsp.rm(path.join(USER_DIR, file), { force: true })),
    );
  } catch {
    /* first run: folder may not exist yet */
  }
  try {
    const files = await fsp.readdir(WHISPER_DIR);
    await Promise.all(files.filter((file) => /^[0-9a-f-]{36}\.(webm|wav|txt)$/.test(file))
      .map((file) => fsp.rm(path.join(WHISPER_DIR, file), { force: true })));
  } catch {
    /* no previous transcription */
  }
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === 'media' || permission === 'audioCapture');
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');
    registerIpc();
    await cleanStaleTemps();
    await createWindow();
  });

  app.on('window-all-closed', () => app.quit());
  let isQuitting = false;
  app.on('before-quit', (event) => {
    transcriptionJob?.child?.kill();
    if (!isQuitting) {
      isQuitting = true;
      event.preventDefault();
      Promise.resolve(writeChain).catch(() => {}).finally(() => app.exit(0));
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
