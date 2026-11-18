import { useState } from 'react'
import { ListMusic, Pencil, Play, Shuffle, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { TrackRow } from '../components/TrackRow'
import { trackCount } from '../lib/format'
import { navigate } from '../lib/router'

export function PlaylistPage({ id }: { id: string }) {
  const { playlists, playlistTracks, renamePlaylist, deletePlaylist, removeFromPlaylist, toast } = useStore()
  const player = usePlayer()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  const playlist = playlists.find((p) => p.id === id)
  if (!playlist) {
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="icon-big"><ListMusic size={26} /></div>
          <h3>Плейлист не найден</h3>
          <p>Возможно, он был удалён. Загляни в библиотеку или создай новый.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>На главную</button>
        </div>
      </div>
    )
  }

  const tracks = playlistTracks(playlist)
  const cover = playlist.cover || tracks[0]?.artwork

  return (
    <div className="page">
      <div className="collection-head">
        {cover ? (
          <img className="collection-art" src={cover} alt="" />
        ) : (
          <div className="collection-art" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted-2)' }}>
            <ListMusic size={72} />
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="collection-type">Плейлист</div>
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                renamePlaylist(playlist.id, name)
                setEditing(false)
                toast('Название обновлено', 'success')
              }}
            >
              <input
                className="input"
                style={{ fontSize: 28, fontWeight: 800, height: 56, margin: '8px 0 10px', background: 'rgba(0,0,0,.35)' }}
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  renamePlaylist(playlist.id, name)
                  setEditing(false)
                }}
              />
            </form>
          ) : (
            <h1 className="collection-title" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {playlist.name}
              <button
                className="round-btn"
                aria-label="Переименовать"
                onClick={() => {
                  setName(playlist.name)
                  setEditing(true)
                }}
              >
                <Pencil size={15} />
              </button>
            </h1>
          )}
          <div className="collection-meta">
            <span>{trackCount(tracks.length)}</span>
            <span className="sep" />
            <span>Создан {new Date(playlist.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="collection-actions">
        <button className="play-big" onClick={() => player.playTracks(tracks, 0, playlist.name)} disabled={!tracks.length} aria-label="Слушать">
          <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => player.playTracks([...tracks].sort(() => Math.random() - 0.5), 0, playlist.name)}
          disabled={!tracks.length}
        >
          <Shuffle size={15} /> Перемешать
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (window.confirm(`Удалить плейлист «${playlist.name}»?`)) {
              deletePlaylist(playlist.id)
              toast('Плейлист удалён')
              navigate('/')
            }
          }}
          style={{ marginLeft: 'auto', color: '#ff7a7a' }}
        >
          <Trash2 size={15} /> Удалить
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="empty">
          <div className="icon-big"><ListMusic size={26} /></div>
          <h3>Плейлист пуст</h3>
          <p>Открой любой трек, нажми «…» и добавь его сюда. Или создай плейлист сразу из подборки.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Смотреть подборки</button>
        </div>
      ) : (
        <div className="track-list">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              list={tracks}
              playlistId={playlist.id}
              onRemove={() => {
                removeFromPlaylist(playlist.id, track.id)
                toast('Трек убран из плейлиста')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
