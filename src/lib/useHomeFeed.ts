import { useEffect, useRef, useState } from 'react'
import { buildMixes, getChartAlbums, getChartTracks, type Mix } from './itunes'
import type { AlbumRef, Track } from '../types'
import { useStore } from '../store'

interface HomeFeed {
  charts: Track[]
  albums: AlbumRef[]
  mixes: Mix[]
  loading: boolean
}

const cache = new Map<string, HomeFeed>()

function seedsFrom(likes: Record<string, Track>, history: Track[]) {
  const counts = new Map<string, { id: string; name: string; score: number }>()
  const consider = (track: Track, weight: number) => {
    if (!track.artistId || !track.artist) return
    const key = track.artistId
    const current = counts.get(key)
    if (current) current.score += weight
    else counts.set(key, { id: key, name: track.artist.split(',')[0].trim(), score: weight })
  }
  Object.values(likes).forEach((track) => consider(track, 3))
  history.slice(0, 40).forEach((track) => consider(track, 1))
  return [...counts.values()].sort((a, b) => b.score - a.score).slice(0, 3)
}

export function useHomeFeed(): HomeFeed {
  const { settings, likes, history } = useStore()
  const key = `${settings.country}`
  const [feed, setFeed] = useState<HomeFeed>(() => cache.get(key) || { charts: [], albums: [], mixes: [], loading: true })
  const seedSnapshot = useRef(seedsFrom(likes, history))

  useEffect(() => {
    if (seedSnapshot.current.length === 0) seedSnapshot.current = seedsFrom(likes, history)
  }, [likes, history])

  useEffect(() => {
    const cached = cache.get(key)
    if (cached && !cached.loading) {
      setFeed(cached)
      return
    }
    let alive = true
    setFeed((prev) => ({ ...prev, loading: true }))

    void Promise.all([
      getChartTracks(settings.country, 20).catch(() => [] as Track[]),
      getChartAlbums(settings.country, 16).catch(() => [] as AlbumRef[]),
      buildMixes(seedSnapshot.current, settings.country).catch(() => [] as Mix[]),
    ]).then(([charts, albums, mixes]) => {
      if (!alive) return
      const next: HomeFeed = { charts, albums, mixes, loading: false }
      cache.set(key, next)
      setFeed(next)
    })

    return () => {
      alive = false
    }
  }, [key, settings.country])

  return feed
}
