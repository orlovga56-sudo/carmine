import { useEffect, useState } from 'react'
import { Disc3, Play, Plus, Shuffle } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { getAlbum, type AlbumDetails } from '../lib/itunes'
import { TrackRow } from '../components/TrackRow'
import { navigate } from '../lib/router'
import { formatTime, trackCount } from '../lib/format'

export function AlbumPage({ id }: { id: string }) {
  const { settings, rememberTracks, createPlaylist, toast } = useStore()
  const player = usePlayer()
  const [data, setData] = useState<AlbumDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getAlbum(id, settings.country)
      .then((result) => {
        if (!alive) return
        setData(result)
        if (result) rememberTracks(result.tracks)
      })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, settings.country, rememberTracks])

  if (loading) {
    return (
      <div className="page">
        <div className="collection-head">
          <div className="collection-art skel" />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 12, width: 80, marginBottom: 16 }} />
            <div className="skel" style={{ height: 46, width: '60%', marginBottom: 12 }} />
            <div className="skel" style={{ height: 12, width: 180 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="icon-big"><Disc3 size={26} /></div>
          <h3>Альбом не найден</h3>
          <p>Возможно, он недоступен в выбранном регионе. Смени страну в настройках и попробуй снова.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>На главную</button>
        </div>
      </div>
    )
  }

  const { album, tracks } = data
  const total = tracks.reduce((sum, t) => sum + (t.duration || 0), 0)

  return (
    <div className="page">
      <div className="collection-head">
        {album.artwork ? (
          <img className="collection-art" src={album.artwork} alt="" />
        ) : (
          <div className="collection-art" style={{ display: 'grid', placeItems: 'center' }}><Disc3 size={70} /></div>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="collection-type">Альбом</div>
          <h1 className="collection-title">{album.title}</h1>
          <div className="collection-meta">
            <button style={{ background: 'none', border: 0, padding: 0, color: 'var(--text)', fontWeight: 700 }} onClick={() => album.artist && navigate(`/search?q=${encodeURIComponent(album.artist)}&tab=artists`)}>
              {album.artist}
            </button>
            <span className="sep" />
            <span>{album.year || '—'}</span>
            <span className="sep" />
            <span>{trackCount(tracks.length)}</span>
            {total > 0 && <><span className="sep" /><span>{formatTime(total)}</span></>}
          </div>
          <p className="collection-desc">Треки доступны как 30-секундные официальные превью. Полные версии — в разделе «Открытая сцена».</p>
        </div>
      </div>

      <div className="collection-actions">
        <button className="play-big" onClick={() => player.playTracks(tracks, 0, album.title)} aria-label="Слушать">
          <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => player.playTracks([...tracks].sort(() => Math.random() - 0.5), 0, album.title)}>
          <Shuffle size={15} /> Перемешать
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const id = createPlaylist(album.title, tracks)
            toast('Плейлист создан', 'success')
            navigate(`/playlist/${id}`)
          }}
        >
          <Plus size={15} /> В плейлист
        </button>
      </div>

      <div className="track-list">
        {tracks.map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} list={tracks} showAlbum={false} />
        ))}
      </div>
    </div>
  )
}
