import { useEffect, useState } from 'react'
import { Compass, Disc3, RefreshCw, Search } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { getOpenItem, searchOpenMusic, type OpenAlbum } from '../lib/archive'
import { MediaCard } from '../components/Cards'
import { navigate } from '../lib/router'
import { TrackRow } from '../components/TrackRow'
import { formatTime, trackCount } from '../lib/format'

export function OpenPage() {
  const { toast, rememberTracks } = useStore()
  const player = usePlayer()
  const [albums, setAlbums] = useState<OpenAlbum[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    searchOpenMusic(query, 30)
      .then((list) => alive && setAlbums(list))
      .catch(() => alive && setAlbums([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query, reload])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Открытая сцена</h1>
          <div className="sub">Полные альбомы, которые авторы сами выложили в свободный доступ</div>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setReload((v) => v + 1)} disabled={loading}>
            <RefreshCw size={14} /> Обновить
          </button>
        </div>
      </div>

      <form
        className="search-box"
        style={{ maxWidth: '100%', marginBottom: 22 }}
        onSubmit={(event) => {
          event.preventDefault()
          setQuery((event.currentTarget.elements.namedItem('q') as HTMLInputElement).value)
        }}
      >
        <Search size={17} />
        <input name="q" placeholder="Искать в Internet Archive: ambient, jazz, netlabel…" defaultValue={query} />
      </form>

      <div className="grid-cards">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skel skel-card">
                <div className="a skel" style={{ borderRadius: 11 }} />
                <div className="b skel" />
                <div className="c skel" />
              </div>
            ))
          : albums.map((album) => (
              <MediaCard
                key={album.id}
                title={album.title}
                subtitle={album.artist}
                artwork={album.artwork}
                onOpen={() => navigate(`/open/${album.id}`)}
                onPlay={async () => {
                  try {
                    const item = await getOpenItem(album.id)
                    if (!item) return toast('Не удалось открыть альбом', 'error')
                    rememberTracks(item.tracks)
                    player.playTracks(item.tracks, 0, item.album.title)
                  } catch {
                    toast('Internet Archive не ответил', 'error')
                  }
                }}
              />
            ))}
      </div>

      {!loading && !albums.length && (
        <div className="empty" style={{ marginTop: 20 }}>
          <div className="icon-big"><Compass size={26} /></div>
          <h3>Ничего не нашлось</h3>
          <p>Попробуй другой запрос или обнови список. Здесь живут netlabels — независимые лейблы, публикующие музыку свободно.</p>
        </div>
      )}
    </div>
  )
}

export function OpenItemPage({ id }: { id: string }) {
  const { rememberTracks, toast } = useStore()
  const player = usePlayer()
  const [item, setItem] = useState<Awaited<ReturnType<typeof getOpenItem>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getOpenItem(id)
      .then((data) => {
        if (!alive) return
        setItem(data)
        if (data) rememberTracks(data.tracks)
      })
      .catch(() => alive && toast('Internet Archive не ответил', 'error'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, rememberTracks, toast])

  if (loading) {
    return (
      <div className="page">
        <div className="collection-head">
          <div className="collection-art skel" />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 12, width: 80, marginBottom: 16 }} />
            <div className="skel" style={{ height: 44, width: '60%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="icon-big"><Disc3 size={26} /></div>
          <h3>Релиз недоступен</h3>
          <p>Возможно, автор удалил его из архива.</p>
          <button className="btn btn-primary" onClick={() => navigate('/open')}>К открытой сцене</button>
        </div>
      </div>
    )
  }

  const total = item.tracks.reduce((sum, t) => sum + t.duration, 0)

  return (
    <div className="page">
      <div className="collection-head">
        <img className="collection-art" src={item.album.artwork} alt="" />
        <div style={{ minWidth: 0 }}>
          <div className="collection-type">Открытая сцена · Internet Archive</div>
          <h1 className="collection-title">{item.album.title}</h1>
          <div className="collection-meta">
            <span>{item.album.artist}</span>
            {item.album.year && <><span className="sep" /><span>{item.album.year}</span></>}
            <span className="sep" />
            <span>{trackCount(item.tracks.length)}</span>
            <span className="sep" />
            <span>{formatTime(total)}</span>
          </div>
          {item.album.description && <p className="collection-desc">{item.album.description}</p>}
        </div>
      </div>

      <div className="collection-actions">
        <button className="play-big" onClick={() => player.playTracks(item.tracks, 0, item.album.title)} aria-label="Слушать">
          <span style={{ fontSize: 20 }}>▶</span>
        </button>
        <span className="hint" style={{ color: 'var(--muted)', fontSize: 12.5 }}>Полные треки · свободная лицензия</span>
      </div>

      <div className="track-list">
        {item.tracks.map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} list={item.tracks} showAlbum={false} />
        ))}
      </div>
    </div>
  )
}
