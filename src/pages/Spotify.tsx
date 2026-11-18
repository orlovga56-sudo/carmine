import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, LogOut, Plus, RefreshCw, Volume2 } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { navigate } from '../lib/router'
import {
  beginLogin,
  getAccessToken,
  getLikedTracks,
  getPlaylistTracks,
  getPlaylists,
  getProfile,
  handleCallback,
  redirectUri,
  spotifySdk,
  type SpotifyPlaylist,
} from '../lib/spotify'
import type { Track } from '../types'
import { TrackRow } from '../components/TrackRow'
import { cn, trackCount } from '../lib/format'

export function SpotifyPage() {
  const { settings, updateSettings, spotifyTokens, spotifyProfile, setSpotify, createPlaylist, rememberTracks, toast } = useStore()
  const player = usePlayer()
  const [clientId, setClientId] = useState(settings.spotifyClientId)
  const [busy, setBusy] = useState(false)
  const [liked, setLiked] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [sdkOn, setSdkOn] = useState(spotifySdk.ready)
  const [copied, setCopied] = useState(false)

  const connect = useCallback(async () => {
    try {
      setBusy(true)
      if (!clientId.trim()) {
        toast('Введи Client ID из Spotify Developer Dashboard', 'error')
        return
      }
      updateSettings({ spotifyClientId: clientId.trim() })
      await beginLogin(clientId.trim())
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось начать вход', 'error')
      setBusy(false)
    }
  }, [clientId, updateSettings, toast])

  /* finish the OAuth redirect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('code') && !params.has('error')) return
    const id = settings.spotifyClientId
    if (!id) return
    setBusy(true)
    handleCallback(id)
      .then(async (tokens) => {
        if (!tokens) return
        setSpotify(tokens, null)
        const profile = await getProfile()
        setSpotify(tokens, profile)
        toast(`Привет, ${profile.name}!`, 'success')
      })
      .catch((error) => toast(error instanceof Error ? error.message : 'Ошибка входа', 'error'))
      .finally(() => setBusy(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadLibrary = useCallback(async () => {
    if (!spotifyTokens) return
    setLoadingLibrary(true)
    try {
      const [tracks, lists, profile] = await Promise.all([
        getLikedTracks().catch(() => [] as Track[]),
        getPlaylists().catch(() => [] as SpotifyPlaylist[]),
        getProfile().catch(() => null),
      ])
      setLiked(tracks)
      setPlaylists(lists)
      if (profile) setSpotify(spotifyTokens, profile)
      rememberTracks(tracks)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось загрузить библиотеку', 'error')
    } finally {
      setLoadingLibrary(false)
    }
  }, [spotifyTokens, setSpotify, rememberTracks, toast])

  useEffect(() => {
    if (spotifyTokens) void loadLibrary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(spotifyTokens)])

  const enableSdk = async () => {
    try {
      setBusy(true)
      await spotifySdk.init(
        () => getAccessToken(),
        {
          onState: () => setSdkOn(spotifySdk.ready),
          onReady: () => {
            setSdkOn(true)
            toast('Полное воспроизведение Spotify готово', 'success')
          },
          onError: (message) => toast(message, 'error'),
        },
      )
      setSdkOn(spotifySdk.ready)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'SDK не запустился', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <section
        className="hero"
        style={{ minHeight: 200, marginTop: 14, background: 'radial-gradient(120% 130% at 85% 0%, rgba(30,215,96,.22), transparent 60%), linear-gradient(120deg,#0b140f 0%, #0a0a0d 70%)' }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 24,
            display: 'grid',
            placeItems: 'center',
            background: '#1ed760',
            color: '#04120a',
            flex: 'none',
            boxShadow: '0 24px 60px rgba(30,215,96,.25)',
          }}
        >
          <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.3-2.1-10.5-1.2a.75.75 0 1 1-.33-1.46c4.6-1 8.5-.6 11.6 1.3.35.2.45.66.23 1.11Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.2-1.97-8.1-2.54-11.9-1.39a.94.94 0 1 1-.54-1.79c4.34-1.31 9.73-.68 13.42 1.58.44.27.58.85.31 1.29Zm.13-3.4C15.3 8.35 8.9 8.13 5.2 9.25a1.12 1.12 0 1 1-.65-2.15c4.25-1.29 11.32-1.04 15.78 1.6a1.12 1.12 0 1 1-1.13 1.94Z" />
          </svg>
        </div>
        <div className="hero-body">
          <span className="hero-kicker" style={{ color: '#7ef0a8' }}>Официальная интеграция</span>
          <h2 style={{ fontSize: 'clamp(26px,3.4vw,42px)' }}>
            {spotifyProfile ? `Привет, ${spotifyProfile.name}` : 'Твой Spotify внутри Carmine'}
          </h2>
          <p>
            {spotifyProfile
              ? `Аккаунт подключён${spotifyProfile.product === 'premium' ? ' · Premium' : ' · Free'}. Перенеси лайки, слушай плейлисты в привычном интерфейсе.`
              : 'Войди через свой аккаунт — Carmine подтянет любимые треки и плейлисты. Это официальный OAuth, пароль нам не нужен.'}
          </p>
          <div className="hero-actions">
            {spotifyProfile ? (
              <>
                <button className="btn btn-primary" onClick={() => void loadLibrary()} disabled={loadingLibrary}>
                  {loadingLibrary ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Обновить библиотеку
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    void spotifySdk.disconnect()
                    setSpotify(null)
                    setLiked([])
                    setPlaylists([])
                    setSdkOn(false)
                    toast('Spotify отключён')
                  }}
                >
                  <LogOut size={16} /> Отключить
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => void connect()} disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />} Войти через Spotify
              </button>
            )}
          </div>
        </div>
      </section>

      {!spotifyProfile && (
        <div className="two-col" style={{ marginTop: 20 }}>
          <div className="panel">
            <h3>1. Создай приложение Spotify</h3>
            <p className="hint">
              Открой <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-soft)' }}>developer.spotify.com/dashboard</a>,
              создай App и вставь Redirect URI ниже. Это бесплатно и занимает минуту.
            </p>
            <div className="field">
              <label>Redirect URI для Spotify Dashboard</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" readOnly value={redirectUri()} onFocus={(e) => e.currentTarget.select()} />
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(redirectUri())
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1500)
                  }}
                  aria-label="Скопировать"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <p className="hint" style={{ marginBottom: 0 }}>
              В настройках приложения отметь Web API и Web Playback SDK. Полное воспроизведение требует Spotify Premium — это ограничение самого Spotify.
            </p>
          </div>

          <div className="panel">
            <h3>2. Вставь Client ID</h3>
            <p className="hint">Client ID есть на странице твоего приложения. Он не секретный и хранится только у тебя в браузере.</p>
            <div className="field">
              <label>Spotify Client ID</label>
              <input
                className="input"
                placeholder="например, 1a2b3c4d5e6f7g8h9i0j"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                spellCheck={false}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                updateSettings({ spotifyClientId: clientId.trim() })
                toast('Client ID сохранён', 'success')
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {spotifyProfile && (
        <>
          <section className="section">
            <div className="section-head">
              <h2><span className="dot" /> Полное воспроизведение</h2>
              <span className="link-btn">{sdkOn ? 'Активно' : 'Выключено'}</span>
            </div>
            <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Volume2 size={20} color="var(--accent)" />
              <div style={{ flex: 1, minWidth: 240 }}>
                <b style={{ fontSize: 13 }}>Spotify Web Playback SDK</b>
                <p className="hint" style={{ margin: '4px 0 0' }}>
                  Играет полные треки прямо в Carmine, без переключения вкладок. Нужен Premium — иначе останутся 30-секундные превью.
                </p>
              </div>
              <button className={cn('btn', sdkOn ? 'btn-ghost' : 'btn-primary')} onClick={() => void enableSdk()} disabled={busy || sdkOn}>
                {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />} {sdkOn ? 'Подключено' : 'Включить'}
              </button>
            </div>
          </section>

          {liked.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2><span className="dot" /> Лайки из Spotify</h2>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const id = createPlaylist('Spotify · любимое', liked)
                    toast('Плейлист создан', 'success')
                    navigate(`/playlist/${id}`)
                  }}
                >
                  <Plus size={14} /> Скопировать в плейлист
                </button>
              </div>
              <div className="track-list">
                {liked.slice(0, 30).map((track, index) => (
                  <TrackRow key={track.id} track={track} index={index} list={liked} showAlbum />
                ))}
              </div>
              {liked.length > 30 && <div className="hint" style={{ color: 'var(--muted)', padding: '10px 6px' }}>…и ещё {liked.length - 30} треков, они уже в плейлисте.</div>}
            </section>
          )}

          {playlists.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2><span className="dot" /> Плейлисты Spotify</h2>
                <span className="link-btn">{playlists.length}</span>
              </div>
              <div className="grid-cards">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className="card"
                    style={{ textAlign: 'left' }}
                    onClick={async () => {
                      try {
                        const tracks = await getPlaylistTracks(playlist.id)
                        if (!tracks.length) return toast('Плейлист пуст', 'info')
                        rememberTracks(tracks)
                        player.playTracks(tracks, 0, playlist.name)
                      } catch (error) {
                        toast(error instanceof Error ? error.message : 'Не удалось открыть плейлист', 'error')
                      }
                    }}
                  >
                    <div className="card-art">
                      {playlist.cover ? <img src={playlist.cover} alt="" loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: '#16161a' }} />}
                    </div>
                    <div className="card-title">{playlist.name}</div>
                    <div className="card-sub">{trackCount(playlist.trackCount)}</div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="section">
        <div className="panel">
          <h3>Почему не «вся музыка Spotify бесплатно»?</h3>
          <p className="hint" style={{ marginBottom: 0 }}>
            Потоки Spotify защищены лицензиями и DRM: выкачивать их и раздавать — незаконно, и такой сервис быстро закрывают.
            Carmine делает честную альтернативу: огромный каталог с официальными превью, полные альбомы из открытых библиотек,
            живое радио, твои файлы и настоящий доступ к Spotify через твой аккаунт.
          </p>
        </div>
      </section>
    </div>
  )
}
