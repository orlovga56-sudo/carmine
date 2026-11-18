import type { Track, SpotifyTokens, SpotifyProfile } from '../types'
import { DESKTOP_REDIRECT_URI, desktop, isDesktop } from './desktop'

/* ------------------------------------------------------------------ PKCE */

const AUTH = 'https://accounts.spotify.com/authorize'
const TOKEN = 'https://accounts.spotify.com/api/token'
const API = 'https://api.spotify.com/v1'
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

export function redirectUri(): string {
  if (isDesktop) return DESKTOP_REDIRECT_URI
  const path = window.location.pathname.replace(/index\.html$/, '')
  return `${window.location.origin}${path}`
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(digest)
}

/**
 * Starts the Spotify PKCE flow.
 * On the desktop the shell opens the system browser and hands the tokens back
 * through IPC (loopback redirect), so this resolves with the refreshed tokens.
 * In a browser it navigates away and resolves with `null`.
 */
export async function beginLogin(clientId: string): Promise<SpotifyTokens | null> {
  if (!clientId) throw new Error('Сначала укажи Spotify Client ID в настройках')
  if (desktop) {
    const tokens = await desktop.spotifyLogin(clientId)
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    }
  }
  const verifier = randomString(96)
  const state = randomString(16)
  sessionStorage.setItem('carmine.spotify.verifier', verifier)
  sessionStorage.setItem('carmine.spotify.state', state)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
  })
  window.location.href = `${AUTH}?${params.toString()}`
  return null
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

async function requestToken(body: Record<string, string>): Promise<SpotifyTokens> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`Spotify token ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as TokenResponse
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
}

export async function handleCallback(clientId: string): Promise<SpotifyTokens | null> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')
  if (error) throw new Error(`Spotify: ${error}`)
  if (!code) return null
  const verifier = sessionStorage.getItem('carmine.spotify.verifier')
  if (!verifier) throw new Error('Не найден код-верификатор, попробуй войти заново')
  const tokens = await requestToken({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  })
  // Keep the refresh token if Spotify did not return a new one.
  if (!tokens.refreshToken) {
    const previous = localStorage.getItem('carmine.v1.spotifyTokens')
    if (previous) {
      try {
        tokens.refreshToken = JSON.parse(previous).refreshToken || ''
      } catch {
        /* noop */
      }
    }
  }
  sessionStorage.removeItem('carmine.spotify.verifier')
  const clean = window.location.pathname + window.location.hash
  window.history.replaceState({}, '', clean)
  return tokens
}

export async function refreshTokens(clientId: string, refreshToken: string): Promise<SpotifyTokens> {
  return requestToken({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

/* ------------------------------------------------------------ API client */

let cfg: {
  clientId: string
  tokens: SpotifyTokens | null
  onTokens: (tokens: SpotifyTokens | null) => void
} = { clientId: '', tokens: null, onTokens: () => {} }

export function configureSpotify(
  clientId: string,
  tokens: SpotifyTokens | null,
  onTokens: (tokens: SpotifyTokens | null) => void,
): void {
  cfg = { clientId, tokens, onTokens }
}

async function ensureToken(): Promise<SpotifyTokens> {
  if (!cfg.tokens) throw new Error('Spotify не подключён')
  if (cfg.tokens.expiresAt > Date.now()) return cfg.tokens
  if (!cfg.tokens.refreshToken || !cfg.clientId) throw new Error('Сессия Spotify истекла')
  const fresh = await refreshTokens(cfg.clientId, cfg.tokens.refreshToken)
  if (!fresh.refreshToken) fresh.refreshToken = cfg.tokens.refreshToken
  cfg.tokens = fresh
  cfg.onTokens(fresh)
  return fresh
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const attempt = async (): Promise<Response> => {
    const tokens = await ensureToken()
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${tokens.accessToken}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  }
  let res = await attempt()
  if (res.status === 401 && cfg.tokens?.refreshToken) {
    const fresh = await refreshTokens(cfg.clientId, cfg.tokens.refreshToken)
    if (!fresh.refreshToken) fresh.refreshToken = cfg.tokens.refreshToken
    cfg.tokens = fresh
    cfg.onTokens(fresh)
    res = await attempt()
  }
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Spotify ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}`)
  }
  return (await res.json()) as T
}

export function mapSpotifyTrack(item: any): Track {
  const t = item.track || item
  return {
    id: `spotify-${t.id}`,
    title: t.name || 'Без названия',
    artist: (t.artists || []).map((a: any) => a.name).join(', '),
    artistId: t.artists?.[0]?.id,
    album: t.album?.name || '',
    albumId: t.album?.id,
    artwork: t.album?.images?.[0]?.url || t.album?.images?.at(-1)?.url || '',
    duration: Math.round((t.duration_ms || 0) / 1000),
    previewUrl: t.preview_url || undefined,
    source: 'spotify',
    explicit: Boolean(t.explicit),
    uri: t.uri,
  }
}

export async function getAccessToken(): Promise<string> {
  const tokens = await ensureToken()
  return tokens.accessToken
}

export async function getProfile(): Promise<SpotifyProfile> {
  const me = await api<any>('/me')
  return {
    id: me.id,
    name: me.display_name || me.id,
    image: me.images?.[0]?.url,
    product: me.product,
    country: me.country,
  }
}

export async function getLikedTracks(): Promise<Track[]> {
  const out: Track[] = []
  let url = '/me/tracks?limit=50'
  for (let page = 0; page < 10 && url; page++) {
    const data = await api<any>(url)
    out.push(...(data.items || []).map(mapSpotifyTrack))
    url = data.next ? data.next.replace(API, '') : ''
  }
  return out
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description?: string
  cover?: string
  trackCount: number
  owner?: string
}

export async function getPlaylists(): Promise<SpotifyPlaylist[]> {
  const data = await api<any>('/me/playlists?limit=50')
  return (data.items || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    cover: p.images?.[0]?.url,
    trackCount: p.tracks?.total || 0,
    owner: p.owner?.display_name,
  }))
}

export async function getPlaylistTracks(id: string): Promise<Track[]> {
  const out: Track[] = []
  let url = `/playlists/${id}/tracks?limit=100`
  for (let page = 0; page < 5 && url; page++) {
    const data = await api<any>(url)
    out.push(...(data.items || []).filter((i: any) => i.track).map(mapSpotifyTrack))
    url = data.next ? data.next.replace(API, '') : ''
  }
  return out
}

export async function searchSpotify(query: string): Promise<Track[]> {
  const data = await api<any>(`/search?q=${encodeURIComponent(query)}&type=track&limit=20`)
  return (data.tracks?.items || []).map(mapSpotifyTrack)
}

/* ------------------------------------------------- Web Playback SDK (dev) */

declare global {
  interface Window {
    Spotify?: any
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

let sdkPromise: Promise<void> | null = null

export function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => reject(new Error('Не удалось загрузить Spotify SDK'))
    document.body.appendChild(script)
  })
  return sdkPromise
}

export interface SdkState {
  paused: boolean
  position: number
  duration: number
  trackId?: string
}

class SpotifySdkPlayer {
  private player: any = null
  deviceId: string | null = null
  ready = false
  private onState: ((state: SdkState | null) => void) | null = null
  private onReady: (() => void) | null = null
  private onError: ((message: string) => void) | null = null

  async init(
    getToken: () => Promise<string>,
    handlers: {
      onState: (state: SdkState | null) => void
      onReady?: () => void
      onError?: (message: string) => void
    },
  ): Promise<void> {
    if (this.player) return
    this.onState = handlers.onState
    this.onReady = handlers.onReady || null
    this.onError = handlers.onError || null
    await loadSdk()
    await new Promise<void>((resolve) => {
      const player = new window.Spotify.Player({
        name: 'Carmine Web',
        getOAuthToken: (cb: (token: string) => void) => {
          getToken()
            .then(cb)
            .catch(() => this.onError?.('Токен Spotify недоступен'))
        },
        volume: 0.8,
      })
      this.player = player
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        this.deviceId = device_id
        this.ready = true
        resolve()
        this.onReady?.()
      })
      player.addListener('not_ready', () => {
        this.ready = false
      })
      player.addListener('player_state_changed', (state: any) => {
        if (!state) {
          this.onState?.(null)
          return
        }
        this.onState?.({
          paused: state.paused,
          position: state.position,
          duration: state.duration,
          trackId: state.track_window?.current_track?.id,
        })
      })
      player.addListener('initialization_error', (e: any) => {
        this.onError?.(e?.message || 'Ошибка инициализации Spotify')
      })
      player.addListener('authentication_error', () => {
        this.onError?.('Spotify отклонил авторизацию. Переподключи аккаунт.')
      })
      player.addListener('account_error', () => {
        this.onError?.('Полное воспроизведение Spotify доступно только с Premium.')
      })
      player.connect()
      setTimeout(() => resolve(), 8000)
    })
  }

  async play(uri: string): Promise<void> {
    if (!this.deviceId) throw new Error('Spotify-устройство ещё не готово')
    const token = await ensureToken()
    const res = await fetch(`${API}/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    })
    if (!res.ok) {
      if (res.status === 403) throw new Error('Нужен Spotify Premium для полного воспроизведения')
      throw new Error(`Spotify play ${res.status}`)
    }
  }

  async toggle(): Promise<void> {
    await this.player?.togglePlay()
  }
  async pause(): Promise<void> {
    await this.player?.pause()
  }
  async resume(): Promise<void> {
    await this.player?.resume()
  }
  async seek(ms: number): Promise<void> {
    await this.player?.seek(ms)
  }
  async setVolume(v: number): Promise<void> {
    await this.player?.setVolume(v)
  }
  async disconnect(): Promise<void> {
    await this.player?.disconnect()
    this.player = null
    this.ready = false
    this.deviceId = null
  }
}

export const spotifySdk = new SpotifySdkPlayer()
