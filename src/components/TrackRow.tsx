import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, ListPlus, MoreHorizontal, Pause, Play, Plus, Trash2, UserRound } from 'lucide-react'
import type { Track } from '../types'
import { cn, formatTime } from '../lib/format'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { navigate } from '../lib/router'

interface MenuState {
  x: number
  y: number
}

export function TrackRow({
  track,
  index,
  list,
  showAlbum = true,
  playlistId,
  onRemove,
}: {
  track: Track
  index: number
  list: Track[]
  showAlbum?: boolean
  playlistId?: string
  onRemove?: () => void
}) {
  const player = usePlayer()
  const { isLiked, toggleLike, playlists, addToPlaylist, createPlaylist, toast } = useStore()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const liked = isLiked(track.id)
  const isCurrent = player.current?.id === track.id
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null)
    }
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setMenu(null)
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', escape)
    window.addEventListener('scroll', () => setMenu(null), { once: true })
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', escape)
    }
  }, [menu])

  const openMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const width = 232
    const height = 300
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - width - 10),
      y: Math.min(event.clientY, window.innerHeight - height - 10),
    })
  }

  return (
    <>
      <div
        className={cn('track-row', isCurrent && 'current')}
        onDoubleClick={() => player.playTracks(list, index)}
        onClick={(event) => {
          // Клик по строке включает трек; кнопки внутри (лайк, меню, артист) работают сами.
          if ((event.target as HTMLElement).closest('button, a')) return
          if (isCurrent) player.toggle()
          else player.playTracks(list, index)
        }}
        onContextMenu={openMenu}
      >
        <button
          className="t-index"
          aria-label={isCurrent && player.playing ? 'Пауза' : 'Слушать'}
          onClick={() => (isCurrent ? player.toggle() : player.playTracks(list, index))}
        >
          {isCurrent && player.playing ? (
            <span className="eq-wrap">
              <i /><i /><i /><i />
            </span>
          ) : (
            <>
              <span className="num">{index + 1}</span>
              <span className="row-play">
                {isCurrent ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </span>
            </>
          )}
        </button>

        {track.artwork ? (
          <img className="t-art" src={track.artwork} alt="" loading="lazy" />
        ) : (
          <div className="t-art" />
        )}

        <div className="t-main">
          <div className="t-title">
            {track.title}
            {track.source === 'itunes' && <span className="badge-30">30 СЕК</span>}
            {track.source === 'radio' && <span className="badge-30" style={{ color: 'var(--accent)', borderColor: 'rgba(255,33,69,.4)' }}>LIVE</span>}
            {track.explicit && <span className="badge-30" style={{ color: '#fff' }}>E</span>}
          </div>
          <button
            className="t-artist"
            style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}
            onClick={() => track.artistId && navigate(`/artist/${track.artistId}`)}
          >
            {track.artist}
          </button>
        </div>

        {showAlbum && <div className="t-album">{track.album}</div>}

        <div className="t-time">{track.source === 'radio' ? 'LIVE' : formatTime(track.duration)}</div>

        <div className="t-actions">
          <button
            className={cn('icon-action', liked && 'liked')}
            aria-label={liked ? 'Убрать из любимых' : 'В любимые'}
            onClick={() => toggleLike(track)}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-action" aria-label="Ещё" onClick={openMenu}>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </div>

      {menu &&
        createPortal(
          <div ref={menuRef} className="menu" style={{ left: menu.x, top: menu.y }}>
            <button
              onClick={() => {
                player.playTracks(list, index)
                setMenu(null)
              }}
            >
              <Play size={15} /> Слушать
            </button>
            <button
              onClick={() => {
                player.addToQueue(track)
                toast('Добавлено в очередь', 'success')
                setMenu(null)
              }}
            >
              <ListPlus size={15} /> В очередь
            </button>
            <div className="menu-sep" />
            <div className="menu-label">Добавить в плейлист</div>
            {playlists.length === 0 && <div className="menu-label" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>Пока нет плейлистов</div>}
            {playlists.slice(0, 6).map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => {
                  addToPlaylist(playlist.id, track)
                  toast(`Добавлено в «${playlist.name}»`, 'success')
                  setMenu(null)
                }}
              >
                <Plus size={15} /> {playlist.name}
              </button>
            ))}
            <button
              onClick={() => {
                const name = window.prompt('Название плейлиста', 'Мой плейлист')
                if (name) {
                  const id = createPlaylist(name, [track])
                  toast('Плейлист создан', 'success')
                  navigate(`/playlist/${id}`)
                }
                setMenu(null)
              }}
            >
              <Plus size={15} /> Новый плейлист
            </button>
            <div className="menu-sep" />
            {track.artistId && (
              <button
                onClick={() => {
                  navigate(`/artist/${track.artistId}`)
                  setMenu(null)
                }}
              >
                <UserRound size={15} /> К артисту
              </button>
            )}
            {(playlistId || onRemove) && (
              <button
                className="danger"
                onClick={() => {
                  onRemove?.()
                  setMenu(null)
                }}
              >
                <Trash2 size={15} /> Убрать из плейлиста
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
