import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Track } from './types'
import { useStore } from './store'
import { spotifySdk } from './lib/spotify'

type RepeatMode = 'off' | 'all' | 'one'
type Engine = 'audio' | 'spotify'

interface PlayerValue {
  queue: Track[]
  index: number
  current: Track | null
  contextLabel: string
  playing: boolean
  buffering: boolean
  time: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  engine: Engine
  sdkReady: boolean
  playTracks: (tracks: Track[], start?: number, label?: string) => void
  playTrack: (track: Track, context?: Track[]) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  removeAt: (index: number) => void
  addToQueue: (track: Track) => void
  stop: () => void
  retry: () => void
}

const PlayerContext = createContext<PlayerValue | null>(null)

let audioSingleton: HTMLAudioElement | null = null
function getAudio(): HTMLAudioElement {
  if (!audioSingleton) {
    audioSingleton = new Audio()
    audioSingleton.preload = 'auto'
    audioSingleton.autoplay = false
  }
  return audioSingleton
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { addHistory, rememberTracks, toast, settings, updateSettings } = useStore()
  const [queue, setQueue] = useState<Track[]>([])
  const [index, setIndex] = useState(0)
  const [contextLabel, setContextLabel] = useState('')
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(settings.volume)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>('off')
  const [engine, setEngine] = useState<Engine>('audio')
  const [sdkReady, setSdkReady] = useState(false)

  const current = queue[index] || null
  const currentRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])
  const indexRef = useRef(0)
  const repeatRef = useRef<RepeatMode>('off')
  const shuffleRef = useRef(false)
  const playingRef = useRef(false)
  const sdkReadyRef = useRef(false)
  const autoplayRef = useRef(true)

  currentRef.current = current
  queueRef.current = queue
  indexRef.current = index
  repeatRef.current = repeat
  shuffleRef.current = shuffle
  playingRef.current = playing
  sdkReadyRef.current = sdkReady
  autoplayRef.current = settings.autoplayNext

  /* ------------------------------------------------------------- audio */
  useEffect(() => {
    const audio = getAudio()
    audio.volume = muted ? 0 : volume

    const onTime = () => setTime(audio.currentTime || 0)
    const onLoaded = () => {
      setBuffering(false)
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
    }
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => {
      setBuffering(false)
      setPlaying(true)
    }
    const onPause = () => {
      if (engine !== 'spotify') setPlaying(false)
    }
    const onEnded = () => {
      if (!autoplayRef.current) {
        setPlaying(false)
        return
      }
      if (repeatRef.current === 'one') {
        audio.currentTime = 0
        void audio.play().catch(() => setPlaying(false))
      } else {
        goNext(true)
      }
    }
    const onError = () => {
      if (engine === 'spotify') return
      setBuffering(false)
      setPlaying(false)
      if (currentRef.current) toast('РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕСЃРїСЂРѕРёР·РІРµСЃС‚Рё С‚СЂРµРє', 'error')
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('durationchange', onLoaded)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('durationchange', onLoaded)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [engine, volume, muted, toast])

  useEffect(() => {
    const audio = getAudio()
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  /* -------------------------------------------------------- sdk wiring */
  useEffect(() => {
    if (!settings.spotifyClientId) return
    const check = () => setSdkReady(spotifySdk.ready)
    check()
    const timer = window.setInterval(check, 1500)
    return () => window.clearInterval(timer)
  }, [settings.spotifyClientId])

  /* ------------------------------------------------------------ actions */

  const startAudio = useCallback(
    async (track: Track) => {
      const audio = getAudio()
      const url = track.streamUrl || track.previewUrl
      if (!url) {
        toast(track.source === 'spotify' ? 'Р”Р»СЏ РїРѕР»РЅРѕРіРѕ С‚СЂРµРєР° РЅСѓР¶РµРЅ Spotify Premium, Р° РїСЂРµРІСЊСЋ РЅРµРґРѕСЃС‚СѓРїРЅРѕ' : 'РЈ С‚СЂРµРєР° РЅРµС‚ РґРѕСЃС‚СѓРїРЅРѕРіРѕ Р°СѓРґРёРѕРїРѕС‚РѕРєР°', 'error')
        setPlaying(false)
        return
      }
      setEngine('audio')
      setBuffering(true)
      audio.src = url
      audio.currentTime = 0
      setTime(0)
      setDuration(track.duration || 0)
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setBuffering(false)
        setPlaying(false)
        toast('Р‘СЂР°СѓР·РµСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°Р» РІРѕСЃРїСЂРѕРёР·РІРµРґРµРЅРёРµ вЂ” РЅР°Р¶РјРё Play РµС‰С‘ СЂР°Р·', 'info')
      }
    },
    [toast],
  )

  const startSpotify = useCallback(
    async (track: Track) => {
      if (!track.uri) return false
      try {
        getAudio().pause()
        setEngine('spotify')
        setTime(0)
        setDuration(track.duration || 0)
        setPlaying(true)
        await spotifySdk.play(track.uri)
        return true
      } catch (error) {
        setEngine('audio')
        setPlaying(false)
        if (track.previewUrl) {
          await startAudio(track)
          return true
        }
        toast(error instanceof Error ? error.message : 'Spotify РЅРµ СЃРјРѕРі Р·Р°РїСѓСЃС‚РёС‚СЊ С‚СЂРµРє', 'error')
        return false
      }
    },
    [startAudio, toast],
  )

  const playIndex = useCallback(
    (nextIndex: number) => {
      const list = queueRef.current
      const track = list[nextIndex]
      if (!track) return
      setIndex(nextIndex)
      indexRef.current = nextIndex
      addHistory(track)
      rememberTracks([track])

      const useSdk = track.source === 'spotify' && Boolean(track.uri) && sdkReadyRef.current
      if (useSdk) {
        void startSpotify(track)
      } else {
        void startAudio(track)
      }
    },
    [addHistory, rememberTracks, startAudio, startSpotify],
  )

  const goNext = useCallback(
    (auto = false) => {
      const list = queueRef.current
      if (!list.length) return
      if (shuffleRef.current && list.length > 1) {
        let candidate = indexRef.current
        for (let i = 0; i < 8 && candidate === indexRef.current; i++) {
          candidate = Math.floor(Math.random() * list.length)
        }
        playIndex(candidate)
        return
      }
      const nextIndex = indexRef.current + 1
      if (nextIndex >= list.length) {
        if (repeatRef.current === 'all') playIndex(0)
        else if (auto) setPlaying(false)
        else playIndex(0)
        return
      }
      playIndex(nextIndex)
    },
    [playIndex],
  )

  const next = useCallback(() => goNext(false), [goNext])

  const prev = useCallback(() => {
    const audio = getAudio()
    if (engine !== 'spotify' && audio.currentTime > 3.5) {
      audio.currentTime = 0
      setTime(0)
      return
    }
    if (indexRef.current > 0) playIndex(indexRef.current - 1)
    else if (engine !== 'spotify') {
      getAudio().currentTime = 0
      setTime(0)
    }
  }, [engine, playIndex])

  const playTracks = useCallback(
    (tracks: Track[], start = 0, label = '') => {
      const list = tracks.filter(Boolean)
      if (!list.length) return
      const safeStart = Math.max(0, Math.min(start, list.length - 1))
      setQueue(list)
      queueRef.current = list
      setContextLabel(label)
      rememberTracks(list.slice(0, 40))
      playIndex(safeStart)
    },
    [playIndex, rememberTracks],
  )

  const playTrack = useCallback(
    (track: Track, context?: Track[]) => {
      if (context && context.length) {
        const at = context.findIndex((t) => t.id === track.id)
        playTracks(context, at >= 0 ? at : 0, '')
      } else {
        playTracks([track], 0, '')
      }
    },
    [playTracks],
  )

  const toggle = useCallback(() => {
    const audio = getAudio()
    if (!currentRef.current) return
    if (engine === 'spotify') {
      if (playingRef.current) {
        void spotifySdk.pause()
        setPlaying(false)
      } else {
        void spotifySdk.resume()
        setPlaying(true)
      }
      return
    }
    if (audio.paused) {
      if (!audio.src) {
        playIndex(indexRef.current)
        return
      }
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      audio.pause()
      setPlaying(false)
    }
  }, [engine, playIndex])

  const seek = useCallback(
    (seconds: number) => {
      if (engine === 'spotify') {
        void spotifySdk.seek(Math.round(seconds * 1000))
        setTime(seconds)
        return
      }
      const audio = getAudio()
      if (Number.isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, Math.min(seconds, audio.duration))
        setTime(audio.currentTime)
      }
    },
    [engine],
  )

  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value))
      setVolumeState(clamped)
      setMuted(clamped === 0)
      if (engine === 'spotify') void spotifySdk.setVolume(clamped)
      updateSettings({ volume: clamped })
    },
    [engine, updateSettings],
  )

  const toggleMute = useCallback(() => {
    const nextMuted = !muted
    setMuted(nextMuted)
    getAudio().volume = nextMuted ? 0 : volume
    if (engine === 'spotify') void spotifySdk.setVolume(nextMuted ? 0 : volume)
  }, [muted, volume, engine])

  const toggleShuffle = useCallback(() => setShuffle((v) => !v), [])
  const cycleRepeat = useCallback(
    () => setRepeat((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off')),
    [],
  )

  const removeAt = useCallback((removeIndex: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== removeIndex))
    setIndex((prev) => {
      if (removeIndex < prev) return prev - 1
      return prev
    })
  }, [])

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track])
    rememberTracks([track])
  }, [rememberTracks])

  const stop = useCallback(() => {
    const audio = getAudio()
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setPlaying(false)
    setTime(0)
    setQueue([])
    setIndex(0)
    setDuration(0)
  }, [])

  const retry = useCallback(() => {
    if (indexRef.current >= 0) playIndex(indexRef.current)
  }, [playIndex])

  /* keep the SDK state in sync with the UI */
  useEffect(() => {
    if (engine !== 'spotify' || !sdkReady) return
    const timer = window.setInterval(async () => {
      const state = await (spotifySdk as any).player?.getCurrentState?.()
      if (!state) return
      setTime(state.position / 1000)
      setDuration(state.duration / 1000)
      setPlaying(!state.paused)
      if (!state.paused && state.position >= state.duration - 400) {
        goNext(true)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [engine, sdkReady, goNext])

  /* ---------------------------------------------------- media session */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork: current.artwork ? [{ src: current.artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
      })
      navigator.mediaSession.setActionHandler('play', () => toggle())
      navigator.mediaSession.setActionHandler('pause', () => toggle())
      navigator.mediaSession.setActionHandler('nexttrack', () => next())
      navigator.mediaSession.setActionHandler('previoustrack', () => prev())
    } catch {
      /* older browsers */
    }
  }, [current, toggle, next, prev])

  useEffect(() => {
    document.title = current ? `${current.title} В· ${current.artist} вЂ” Carmine` : 'Carmine вЂ” РјСѓР·С‹РєР° Р±РµР· РіСЂР°РЅРёС†'
  }, [current])

  const value = useMemo<PlayerValue>(
    () => ({
      queue,
      index,
      current,
      contextLabel,
      playing,
      buffering,
      time,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      engine,
      sdkReady,
      playTracks,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      removeAt,
      addToQueue,
      stop,
      retry,
    }),
    [
      queue, index, current, contextLabel, playing, buffering, time, duration, volume, muted,
      shuffle, repeat, engine, sdkReady, playTracks, playTrack, toggle, next, prev, seek,
      setVolume, toggleMute, toggleShuffle, cycleRepeat, removeAt, addToQueue, stop, retry,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}
