/* eslint-disable */
const { app, BrowserWindow, protocol, ipcMain, shell, Menu, session } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const http = require('node:http')
const crypto = require('node:crypto')

const DIST = path.join(__dirname, '..', 'dist')
const DEV_URL = 'http://localhost:5173'
const isDev = process.env.CARMINE_DEV === '1' && !app.isPackaged
if (process.env.CARMINE_USER_DATA) app.setPath('userData', process.env.CARMINE_USER_DATA)

const SPOTIFY_PORT = 8899
const SPOTIFY_REDIRECT = `http://127.0.0.1:${SPOTIFY_PORT}/callback`
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
])

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8',
}

function mimeFor(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
}

function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    try {
      const url = new URL(request.url)
      let pathname = decodeURIComponent(url.pathname)
      if (!pathname || pathname === '/') pathname = '/index.html'
      const filePath = path.join(DIST, pathname)
      if (!filePath.startsWith(DIST)) {
        return new Response('Forbidden', { status: 403 })
      }
      const data = await fs.promises.readFile(filePath)
      return new Response(new Uint8Array(data), {
        status: 200,
        headers: {
          'content-type': mimeFor(filePath),
          'cache-control': 'no-cache',
        },
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: '#060607',
    autoHideMenuBar: true,
    title: 'Carmine',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0a0a0c', symbolColor: '#ececef', height: 40 },
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL()
    if (url !== current) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    mainWindow.loadURL(DEV_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadURL(`app://carmine/index.html${process.env.CARMINE_SMOKE_HASH || ''}`)
  }

  // Headless smoke test: CARMINE_SMOKE=<png path> renders once and exits.
  if (process.env.CARMINE_SMOKE) {
    const logFile = `${process.env.CARMINE_SMOKE}.log`
    const log = (line) => {
      try {
        fs.appendFileSync(logFile, `${line}\n`)
      } catch {}
    }
    mainWindow.webContents.on('console-message', (...args) => {
      const details = args[1] && typeof args[1] === 'object' ? args[1] : null
      const message = details ? details.message : args[2]
      const level = details ? details.level : args[1]
      log(`[console.${level}] ${message}`)
    })
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => log(`[fail-load] ${code} ${desc} ${url}`))
    mainWindow.webContents.on('render-process-gone', (_e, details) => log(`[renderer-gone] ${JSON.stringify(details)}`))
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
        try {
          if (process.env.CARMINE_SMOKE_JS) {
            const result = await mainWindow.webContents.executeJavaScript(process.env.CARMINE_SMOKE_JS)
            log(`[js] ${JSON.stringify(result)}`)
            await wait(Number(process.env.CARMINE_SMOKE_JS_WAIT || 5000))
          }
          if (process.env.CARMINE_SMOKE_DIAG) {
            const diag = await mainWindow.webContents.executeJavaScript(process.env.CARMINE_SMOKE_DIAG)
            log(`[diag] ${JSON.stringify(diag)}`)
          }
          const image = await mainWindow.webContents.capturePage()
          fs.writeFileSync(process.env.CARMINE_SMOKE, image.toPNG())
        } catch (err) {
          log(`[smoke-error] ${err && err.message}`)
        }
        app.exit(0)
      }, Number(process.env.CARMINE_SMOKE_DELAY || 4000))
    })
  }
}

/* --------------------------------------------------------------- Spotify */

function base64url(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

ipcMain.handle('spotify:redirect-uri', () => SPOTIFY_REDIRECT)

ipcMain.handle('spotify:login', async (_event, clientId) => {
  if (!clientId) throw new Error('Не указан Spotify Client ID')

  const verifier = base64url(crypto.randomBytes(48))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  const state = crypto.randomBytes(12).toString('hex')

  const authUrl = new URL('https://accounts.spotify.com/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT)
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('state', state)

  return new Promise((resolve, reject) => {
    let settled = false
    let timer = null

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      try {
        server.close()
      } catch {}
      fn(value)
    }

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', SPOTIFY_REDIRECT)
      if (url.pathname !== '/callback') {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('Not found')
        return
      }

      const error = url.searchParams.get('error')
      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(
        '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Carmine</title>' +
          '<style>body{background:#08080a;color:#f5f5f7;font-family:Segoe UI,Arial,sans-serif;display:grid;place-items:center;height:100vh;margin:0}' +
          '.box{text-align:center;padding:40px 48px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#101013}' +
          'h1{font-size:22px;margin:0 0 8px}p{color:#9a9aa3;margin:0}span{color:#ff2145}</style></head><body><div class="box">' +
          '<h1><span>&#10003;</span> Готово</h1><p>Можно закрыть вкладку и вернуться в Carmine.</p></div>' +
          '<script>setTimeout(function(){window.close()},900)</script></body></html>',
      )

      if (settled) return
      if (error || !code || returnedState !== state) {
        finish(reject, new Error(error ? `Spotify: ${error}` : 'Вход отменён или истёк'))
        return
      }

      try {
        const payload = new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT,
          code_verifier: verifier,
        })
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: payload.toString(),
        })
        if (!tokenRes.ok) {
          throw new Error(`Spotify token ${tokenRes.status}: ${(await tokenRes.text()).slice(0, 200)}`)
        }
        const data = await tokenRes.json()
        finish(resolve, {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || '',
          expiresAt: Date.now() + (data.expires_in - 60) * 1000,
        })
      } catch (err) {
        finish(reject, err instanceof Error ? err : new Error(String(err)))
      }
    })

    server.on('error', (err) => {
      finish(reject, new Error(`Локальный порт ${SPOTIFY_PORT} занят: ${err.message}`))
    })

    server.listen(SPOTIFY_PORT, '127.0.0.1', () => {
      shell.openExternal(authUrl.toString())
    })

    timer = setTimeout(() => finish(reject, new Error('Время входа истекло, попробуй снова')), 180000)
  })
})

ipcMain.handle('desktop:open-external', (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) return shell.openExternal(url)
})

ipcMain.handle('desktop:version', () => app.getVersion())

/* ------------------------------------------------------------------ boot */

const gotLock = process.env.CARMINE_SMOKE ? true : app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      // microphone is not used; media playback does not need permissions
      callback(permission === 'fullscreen' || permission === 'notifications')
    })
    registerAppProtocol()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
