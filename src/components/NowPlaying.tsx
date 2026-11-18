import { useEffect } from 'react'
import { Heart, Pause, Play, Shuffle, SkipBack, SkipForward, Volume2, X } from 'lucide-react'
import { usePlayer } from '../player'
import { useStore } from '../store'
import { cn, formatTime } from '../lib/format'
import { SeekBar } from './SeekBar'

export function NowPlaying({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = usePlayer()
  const { isLiked, toggleLike } = useStore()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const track = player.current
  if (!track) return null

  return (
    <div className="np-overlay" role="dialog" aria-label="Сейчас играет" onClick={onClose}>
      <button className="round-btn np-close" aria-label="Закрыть" onClick={onClose}>
        <X size={18} />
      </button>

      <div className="np-inner" onClick={(event) => event.stopPropagation()}>
        <img className="np-cover" src={track.artwork || `${import.meta.env.BASE_URL}logo.svg`} alt="" />

        <div>
          <p className="collection-type" style={{ margin: 0 }}>
            {track.source === 'radio' ? 'Прямой эфир' : track.source === 'archive' ? 'Открытая сцена' : player.contextLabel || 'Сейчас играет'}
          </p>
          <h2 className="np-title">{track.title}</h2>
          <p className="np-artist">{track.artist}{track.album ? ` — ${track.album}` : ''}</p>

          <SeekBar
            value={player.time}
            duration={player.duration}
            onSeek={player.seek}
            disabled={track.source === 'radio'}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted-2)', marginTop: 6 }}>
            <span>{formatTime(player.time)}</span>
            <span>{track.source === 'radio' ? 'LIVE' : formatTime(player.duration)}</span>
          </div>

          <div className="np-controls">
            <button className={cn('ctrl', player.shuffle && 'on')} onClick={player.toggleShuffle} aria-label="Перемешать">
              <Shuffle size={18} />
            </button>
            <button className="ctrl" onClick={player.prev} aria-label="Предыдущий">
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button className="ctrl ctrl-play" style={{ width: 56, height: 56 }} onClick={player.toggle} aria-label={player.playing ? 'Пауза' : 'Играть'}>
              {player.playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />}
            </button>
            <button className="ctrl" onClick={player.next} aria-label="Следующий">
              <SkipForward size={24} fill="currentColor" />
            </button>
            <button
              className={cn('icon-action', isLiked(track.id) && 'liked')}
              style={{ opacity: 1, marginLeft: 6 }}
              onClick={() => toggleLike(track)}
              aria-label="В любимые"
            >
              <Heart size={20} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 260 }}>
            <Volume2 size={16} color="var(--muted)" />
            <SeekBar value={player.volume} duration={1} onSeek={player.setVolume} ariaLabel="Громкость" />
          </div>

          {player.queue.length > 1 && (
            <div className="np-queue">
              <div className="menu-label" style={{ padding: '0 4px 8px' }}>Очередь · {player.queue.length}</div>
              {player.queue.map((item, itemIndex) => (
                <div
                  key={`${item.id}-${itemIndex}`}
                  className={cn('track-row', item.id === track.id && 'current')}
                  style={{ height: 50, gridTemplateColumns: '26px 38px minmax(0,1fr) auto', cursor: 'pointer' }}
                  onClick={() => player.playTracks(player.queue, itemIndex, player.contextLabel)}
                >
                  <span className="t-index" style={{ width: 26 }}>
                    {item.id === track.id && player.playing ? <span className="eq-wrap"><i /><i /><i /></span> : itemIndex + 1}
                  </span>
                  <img className="t-art" src={item.artwork} alt="" style={{ width: 38, height: 38 }} />
                  <div className="t-main">
                    <div className="t-title">{item.title}</div>
                    <div className="t-artist">{item.artist}</div>
                  </div>
                  <span className="t-time">{item.source === 'radio' ? 'LIVE' : formatTime(item.duration)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
