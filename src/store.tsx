import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Playlist, Settings, SpotifyProfile, SpotifyTokens, Track } from './types'
import { readStored, writeStored } from './lib/storage'
import { uid } from './lib/format'
import { configureSpotify } from './lib/spotify'

type ToastKind = 'info' | 'success' | 'error'
interface Toast {
  id: string
  message: string
  kind: ToastKind
}

interface State {
  likes: Record<string, Track>
  knownTracks: Record<string, Track>
  playlists: Playlist[]
  history: Track[]
  settings: Settings
  spotifyTokens: SpotifyTokens | null
  spotifyProfile: SpotifyProfile | null
  recentSearches: string[]
}

const DEFAULT_SETTINGS: Settings = {
  country: 'RU',
  accent: 'crimson',
  volume: 0.8,
  autoplayNext: true,
  crossfade: false,
  quality: 'auto',
  spotifyClientId: '',
  reduceMotion: false,
}

const initialState: State = {
  likes: {},
  knownTracks: {},
  playlists: [],
  history: [],
  settings: DEFAULT_SETTINGS,
  spotifyTokens: null,
  spotifyProfile: null,
  recentSearches: [],
}

interface StoreValue extends State {
  isLiked: (id: string) => boolean
  toggleLike: (track: Track) => void
  rememberTracks: (tracks: Track[]) => void
  addHistory: (track: Track) => void
  createPlaylist: (name: string, tracks?: Track[]) => string
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addToPlaylist: (playlistId: string, track: Track) => void
  removeFromPlaylist: (playlistId: string, trackId: string) => void
  playlistTracks: (playlist: Playlist) => Track[]
  updateSettings: (patch: Partial<Settings>) => void
  setSpotify: (tokens: SpotifyTokens | null, profile?: SpotifyProfile | null) => void
  addRecentSearch: (term: string) => void
  clearHistory: () => void
  resetAll: () => void
  toast: (message: string, kind?: ToastKind) => void
  toasts: Toast[]
  dismissToast: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function loadState(): State {
  const settings = { ...DEFAULT_SETTINGS, ...readStored<Partial<Settings>>('settings', {}) }
  return {
    likes: readStored('likes', {}),
    knownTracks: readStored('knownTracks', {}),
    playlists: readStored('playlists', []),
    history: readStored('history', []),
    settings,
    spotifyTokens: readStored<SpotifyTokens | null>('spotifyTokens', null),
    spotifyProfile: readStored<SpotifyProfile | null>('spotifyProfile', null),
    recentSearches: readStored('recentSearches', []),
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(loadState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<number[]>([])

  /* Persist each slice separately so a big library never blocks typing. */
  useEffect(() => writeStored('likes', state.likes), [state.likes])
  useEffect(() => writeStored('knownTracks', state.knownTracks), [state.knownTracks])
  useEffect(() => writeStored('playlists', state.playlists), [state.playlists])
  useEffect(() => writeStored('history', state.history), [state.history])
  useEffect(() => writeStored('settings', state.settings), [state.settings])
  useEffect(() => writeStored('spotifyTokens', state.spotifyTokens), [state.spotifyTokens])
  useEffect(() => writeStored('spotifyProfile', state.spotifyProfile), [state.spotifyProfile])
  useEffect(() => writeStored('recentSearches', state.recentSearches), [state.recentSearches])

  useEffect(() => {
    document.documentElement.dataset.accent = state.settings.accent
    document.documentElement.classList.toggle('reduce-motion', state.settings.reduceMotion)
  }, [state.settings.accent, state.settings.reduceMotion])

  useEffect(() => {
    configureSpotify(state.settings.spotifyClientId, state.spotifyTokens, (tokens) => {
      setState((prev) => ({ ...prev, spotifyTokens: tokens }))
    })
  }, [state.settings.spotifyClientId, state.spotifyTokens])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const rememberTracks = useCallback((tracks: Track[]) => {
    if (!tracks.length) return
    setState((prev) => {
      const next = { ...prev.knownTracks }
      let changed = false
      for (const track of tracks) {
        if (track?.id && !next[track.id]) {
          next[track.id] = track
          changed = true
        }
      }
      return changed ? { ...prev, knownTracks: next } : prev
    })
  }, [])

  const toggleLike = useCallback((track: Track) => {
    setState((prev) => {
      const likes = { ...prev.likes }
      if (likes[track.id]) {
        delete likes[track.id]
      } else {
        likes[track.id] = track
      }
      return {
        ...prev,
        likes,
        knownTracks: { ...prev.knownTracks, [track.id]: track },
      }
    })
  }, [])

  const isLiked = useCallback((id: string) => Boolean(state.likes[id]), [state.likes])

  const addHistory = useCallback((track: Track) => {
    setState((prev) => {
      const rest = prev.history.filter((t) => t.id !== track.id)
      return {
        ...prev,
        history: [track, ...rest].slice(0, 120),
        knownTracks: { ...prev.knownTracks, [track.id]: track },
      }
    })
  }, [])

  const createPlaylist = useCallback((name: string, tracks: Track[] = []) => {
    const id = uid('pl')
    const playlist: Playlist = {
      id,
      name: name.trim() || 'РњРѕР№ РїР»РµР№Р»РёСЃС‚',
      trackIds: tracks.map((t) => t.id),
      cover: tracks[0]?.artwork,
      createdAt: Date.now(),
    }
    setState((prev) => ({
      ...prev,
      playlists: [playlist, ...prev.playlists],
      knownTracks: {
        ...prev.knownTracks,
        ...Object.fromEntries(tracks.map((t) => [t.id, t])),
      },
    }))
    return id
  }, [])

  const deletePlaylist = useCallback((id: string) => {
    setState((prev) => ({ ...prev, playlists: prev.playlists.filter((p) => p.id !== id) }))
  }, [])

  const renamePlaylist = useCallback((id: string, name: string) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
    }))
  }, [])

  const addToPlaylist = useCallback((playlistId: string, track: Track) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => {
        if (p.id !== playlistId) return p
        if (p.trackIds.includes(track.id)) return p
        return { ...p, trackIds: [...p.trackIds, track.id], cover: p.cover || track.artwork }
      }),
      knownTracks: { ...prev.knownTracks, [track.id]: track },
    }))
  }, [])

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p,
      ),
    }))
  }, [])

  const playlistTracks = useCallback(
    (playlist: Playlist) =>
      playlist.trackIds.map((id) => state.knownTracks[id]).filter((t): t is Track => Boolean(t)),
    [state.knownTracks],
  )

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const setSpotify = useCallback((tokens: SpotifyTokens | null, profile: SpotifyProfile | null = null) => {
    setState((prev) => ({ ...prev, spotifyTokens: tokens, spotifyProfile: tokens ? profile : null }))
  }, [])

  const addRecentSearch = useCallback((term: string) => {
    const clean = term.trim()
    if (clean.length < 2) return
    setState((prev) => ({
      ...prev,
      recentSearches: [clean, ...prev.recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8),
    }))
  }, [])

  const clearHistory = useCallback(() => setState((prev) => ({ ...prev, history: [] })), [])

  const resetAll = useCallback(() => {
    setState({ ...initialState, settings: { ...DEFAULT_SETTINGS, spotifyClientId: state.settings.spotifyClientId } })
  }, [state.settings.spotifyClientId])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = uid('toast')
      setToasts((prev) => [...prev.slice(-2), { id, message, kind }])
      const timer = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3200)
      timers.current.push(timer)
    },
    [],
  )

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      isLiked,
      toggleLike,
      rememberTracks,
      addHistory,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      playlistTracks,
      updateSettings,
      setSpotify,
      addRecentSearch,
      clearHistory,
      resetAll,
      toast,
      toasts,
      dismissToast,
    }),
    [
      state,
      isLiked,
      toggleLike,
      rememberTracks,
      addHistory,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      playlistTracks,
      updateSettings,
      setSpotify,
      addRecentSearch,
      clearHistory,
      resetAll,
      toast,
      toasts,
      dismissToast,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
