import { useEffect, useState } from 'react'
import { Play, Shuffle, UserRound } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { getArtist, type ArtistDetails } from '../lib/itunes'
import { TrackRow } from '../components/TrackRow'
import { MediaCard } from '../components/Cards'
import { navigate } from '../lib/router'

export function ArtistPage({ id }: { id: string }) {
  const { settings, rememberTracks } = useStore()
  const player = usePlayer()
  const [data, setData] = useState<ArtistDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getArtist(id, settings.country)
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
          <div className="collection-art round skel" />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 12, width: 70, marginBottom: 14 }} />
            <div className="skel" style={{ height: 44, width: '50%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="icon-big"><UserRound size={26} /></div>
          <h3>Артист не найден</h3>
          <p>Попробуй поискать его на странице поиска — каталог зависит от региона.</p>
          <button className="btn btn-primary" onClick={() => navigate('/search')}>В поиск</button>
        </div>
      </div>
    )
  }

  const { artist, tracks, albums } = data

  return (
    <div className="page">
      <div className="collection-head">
        {artist.artwork ? (
          <img className="collection-art round" src={artist.artwork} alt="" />
        ) : (
          <div className="collection-art round" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted-2)' }}>
            <UserRound size={70} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="collection-type">Артист{artist.genre ? ` · ${artist.genre}` : ''}</div>
          <h1 className="collection-title">{artist.name}</h1>
          <div className="collection-meta">
            <span>{tracks.length} популярных треков</span>
            <span className="sep" />
            <span>{albums.length} альбомов</span>
          </div>
        </div>
      </div>

      <div className="collection-actions">
        <button className="play-big" onClick={() => player.playTracks(tracks, 0, artist.name)} disabled={!tracks.length} aria-label="Слушать">
          <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => player.playTracks([...tracks].sort(() => Math.random() - 0.5), 0, artist.name)} disabled={!tracks.length}>
          <Shuffle size={15} /> Перемешать
        </button>
      </div>

      {tracks.length > 0 && (
        <div className="track-list" style={{ marginBottom: 30 }}>
          {tracks.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} list={tracks} />
          ))}
        </div>
      )}

      {albums.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2><span className="dot" /> Альбомы</h2>
          </div>
          <div className="grid-cards">
            {albums.map((album) => (
              <MediaCard
                key={album.id}
                title={album.title}
                subtitle={album.year || album.artist}
                artwork={album.artwork}
                onOpen={() => navigate(`/album/${album.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
