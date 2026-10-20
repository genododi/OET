import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProfileStore } from './profiles.mjs';
import { assetResponse, confined } from './assets.mjs';
import { LocalMentor } from './mentor.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const installation = path.resolve(process.resourcesPath, '../../..');
let locations = {};
let build = null;
try { build = JSON.parse(fs.readFileSync(path.join(process.resourcesPath, 'build-info.json'), 'utf8')); } catch { /* Development build has no release stamp. */ }
try { locations = JSON.parse(fs.readFileSync(path.join(process.resourcesPath, 'offline-locations.json'), 'utf8')); } catch { /* Portable installation beside the library. */ }
const webRoot = process.env.OET_DESKTOP_WEB || path.join(process.resourcesPath, 'dist');
const libraryRoot = process.env.OET_DESKTOP_LIBRARY || locations.library || path.join(installation, 'offline-library');
const aiRoot = process.env.OET_DESKTOP_AI || locations.ai || path.join(installation, 'local-ai');
if (process.env.OET_DESKTOP_USER_DATA) app.setPath('userData', process.env.OET_DESKTOP_USER_DATA);
app.setName('OET Study');
app.commandLine.appendSwitch('disable-background-networking');
protocol.registerSchemesAsPrivileged([{ scheme: 'oet', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);
const origin = 'oet://study';
let profiles, window, mentor;
const windows = new Map();
const readySessions = new Set();
let remoteAssets = {};
void fs.promises.readFile(path.join(libraryRoot, 'remote-assets.json'), 'utf8').then(data => { remoteAssets = JSON.parse(data); }).catch(() => {});
let bundledMedia = {};
try { bundledMedia = JSON.parse(fs.readFileSync(path.join(webRoot, 'offline-media.json'), 'utf8')); } catch { /* Development build. */ }
const originals = new Map();
try { for (const [sha, asset] of Object.entries(JSON.parse(fs.readFileSync(path.join(webRoot, 'bundled-assets.json'), 'utf8')))) originals.set(sha, { root: webRoot, asset }); } catch { /* Available with a complete build. */ }
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { window?.show(); window?.focus(); });

async function asset(request) {
  const url = new URL(request.url);
  if (url.host !== 'study') return new Response(null, { status: 403 });
  if (url.pathname === '/OET/desktop/ai/chat') return mentor.reply(request);
  try {
    const relative = decodeURIComponent(url.pathname).replace(/^\/OET\//, '');
    if (relative.startsWith('desktop/original/')) {
      const file = originals.get(relative.slice('desktop/original/'.length));
      if (file) return originalResponse(await confined(file.root, file.asset), request);
      const sha = relative.slice('desktop/original/'.length), format = url.searchParams.get('format') || 'pdf';
      if (!/^[a-f0-9]{64}$/.test(sha) || !/^[a-z0-9]{1,12}$/.test(format)) return new Response(null, { status: 404 });
      return originalResponse(await confined(libraryRoot, `files/${sha}.${format}`), request);
    }
    if (relative.startsWith('desktop/remote/')) {
      const original = relative.slice('desktop/remote/'.length);
      if (bundledMedia[original]) return assetResponse(await confined(webRoot, bundledMedia[original]), request);
      const entry = remoteAssets[original];
      return entry ? assetResponse(await confined(libraryRoot, entry), request) : new Response('This online resource was not supplied locally.', { status: 404 });
    }
    if (relative.startsWith('offline-library/')) return originalResponse(await confined(libraryRoot, relative.slice('offline-library/'.length)), request);
    return assetResponse(await confined(webRoot, !relative || relative === '/' ? 'index.html' : relative), request);
  } catch { return new Response(null, { status: 400 }); }
}

async function originalResponse(path, request) {
  const response=await assetResponse(path,request);
  const format=path.split('.').at(-1)?.toLowerCase();
  if (['html','htm','svg'].includes(format)) {
    response.headers.set('Content-Type','application/octet-stream');
    response.headers.set('Content-Disposition',`attachment; filename="original.${format}"`);
  }
  return response;
}

async function openProfile(id = null) {
  const selected = id ? profiles.get(id) : null;
  if (id && !selected) throw Error('This profile was not found.');
  const partition = selected ? `persist:oet-${selected.id}` : 'oet-profile-picker';
  const ses = session.fromPartition(partition);
  if (!readySessions.has(partition)) {
    ses.protocol.handle('oet', asset);
    // Every study request stays on device. References can be opened explicitly in the browser.
    ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
      const local = remoteAssets[details.url] || bundledMedia[details.url];
      callback(local ? { redirectURL: `${origin}/OET/desktop/remote/${encodeURIComponent(details.url)}` } : { cancel: true });
    });
    ses.setPermissionRequestHandler((contents, permission, callback, details) => callback(permission === 'media' && windows.has(contents.id) && details.requestingUrl.startsWith(origin) && !details.mediaTypes?.includes('video')));
    ses.setPermissionCheckHandler((contents, permission, requestingOrigin) => permission === 'media' && !!contents && windows.has(contents.id) && requestingOrigin === origin);
    ses.on('will-download', (_event, item) => {
      item.setSaveDialogOptions({ title: 'Save your OET file', defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
    });
    readySessions.add(partition);
  }
  const old = window;
  const next = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 640, title: 'OET Study · Offline', show: false, backgroundColor: '#f5f7f5', webPreferences: { session: ses, preload: path.join(here, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
  windows.set(next.webContents.id, selected?.id ?? null);
  window = next;
  const openExternal = url => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  };
  next.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin + '/OET/')) {
      const viewer = new BrowserWindow({ parent: next, width: 1000, height: 900, webPreferences: { session: ses, nodeIntegration: false, contextIsolation: true, sandbox: true } });
      viewer.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      viewer.webContents.on('will-navigate', (event, target) => { if (!target.startsWith(origin + '/OET/')) event.preventDefault(); });
      void viewer.loadURL(url);
    } else openExternal(url);
    return { action: 'deny' };
  });
  next.webContents.on('will-navigate', (event, target) => { if (!target.startsWith(origin + '/OET/')) { event.preventDefault(); openExternal(target); } });
  const contentsId = next.webContents.id;
  next.on('closed', () => { windows.delete(contentsId); if (window === next) window = null; });
  await next.loadURL(origin + '/OET/');
  next.show();
  if (old && !old.isDestroyed()) { await old.webContents.session.flushStorageData(); old.close(); }
  return true;
}

function authorized(event) {
  if (!windows.has(event.sender.id) || !event.senderFrame?.url.startsWith(origin + '/OET/')) throw Error('This action is only available in OET Study.');
  return windows.get(event.sender.id);
}
app.whenReady().then(async () => {
  profiles = new ProfileStore(app.getPath('userData'));
  mentor = new LocalMentor(aiRoot, app.getPath('logs'));
  ipcMain.handle('desktop:info', event => { const id = authorized(event); return { profile: id ? profiles.get(id) : null, profiles: profiles.list(), offline: true, build }; });
  ipcMain.handle('desktop:create-profile', (event, name) => { authorized(event); return profiles.create(name); });
  ipcMain.handle('desktop:switch-profile', (event, id) => { authorized(event); return openProfile(id); });
  ipcMain.handle('desktop:rename-profile', (event, name) => { const id = authorized(event); return profiles.rename(id, name); });
  ipcMain.handle('desktop:ai-status', event => { authorized(event); return mentor.status(); });
  ipcMain.handle('desktop:backup', async (event, data) => {
    const id = authorized(event); if (!id) throw Error('Choose a profile first.');
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.values(data).some(value => typeof value !== 'string') || JSON.stringify(data).length > 20_000_000) throw Error('Invalid backup data.');
    const result = await dialog.showSaveDialog(window, { defaultPath: `${profiles.get(id).name.replace(/[^\p{L}\p{N} _-]/gu, '')}-OET-backup.json`, filters: [{ name: 'OET profile', extensions: ['json'] }] });
    if (result.canceled) return false;
    fs.writeFileSync(result.filePath, JSON.stringify({ format: 'oet-profile-backup', version: 1, name: profiles.get(id).name, savedAt: new Date().toISOString(), data }, null, 2), { mode: 0o600 }); return true;
  });
  ipcMain.handle('desktop:restore', async event => {
    if (!authorized(event)) throw Error('Choose a profile first.');
    const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'OET profile', extensions: ['json'] }] });
    if (result.canceled) return null;
    if (fs.statSync(result.filePaths[0]).size > 20_000_000) throw Error('The backup file is too large.');
    const backup = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
    if (backup.format !== 'oet-profile-backup' || backup.version !== 1 || !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data) || Object.values(backup.data).some(value => typeof value !== 'string')) throw Error('This is not a valid OET profile backup.');
    return backup.data;
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { label: 'Study', submenu: [{ label: 'Switch profile…', click: () => openProfile() }, { label: 'Local AI status', click: () => dialog.showMessageBox(window, { message: 'Offline AI mentor', detail: JSON.stringify(mentor.status(), null, 2) }) }] }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]));
  await openProfile();
}).catch(error => { dialog.showErrorBox('OET Study could not open', error.message); app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length && profiles) void openProfile(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => mentor?.stop());
