import { useState } from 'react'
import {
  Heart,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayer } from '../player'
import { useStore } from '../store'
import { cn, formatTime } from '../lib/format'
import { SeekBar } from './SeekBar'

export function PlayerBar({ onExpand }: { onExpand: () => void }) {
  const player = usePlayer()
  const { isLiked, toggleLike } = useStore()
  const [seeking, setSeeking] = useState(false)
  const current = player.current

  const VolumeIcon = player.muted || player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2

  return (
    <footer className="player">
      <div className="now">
        {current?.artwork ? (
          <img className="now-art" src={current.artwork} alt="" onClick={onExpand} />
        ) : (
          <div className="now-art" onClick={onExpand} style={{ display: 'grid', placeItems: 'center', color: 'var(--muted-2)' }}>
            <ListMusic size={20} />
          </div>
        )}
        <div className="now-txt">
          <div className="now-title">{current ? current.title : 'Ничего не играет'}</div>
          <div className="now-artist">{current ? current.artist : 'Выбери трек — и поехали'}</div>
        </div>
        {current && (
          <>
            <button
              className={cn('icon-action', isLiked(current.id) && 'liked')}
              aria-label="В любимые"
              onClick={() => toggleLike(current)}
            >
              <Heart size={17} fill={isLiked(current.id) ? 'currentColor' : 'none'} />
            </button>
            <button className="icon-action optional" aria-label="Развернуть" onClick={onExpand} style={{ opacity: 0.6 }}>
              <Maximize2 size={15} />
            </button>
          </>
        )}
      </div>

      <div className="player-center">
        <div className="controls">
          <button
            className={cn('ctrl', player.shuffle && 'on')}
            aria-label="Перемешать"
            title="Перемешать"
            onClick={player.toggleShuffle}
          >
            <Shuffle size={16} />
          </button>
          <button className="ctrl" aria-label="Предыдущий" onClick={player.prev} disabled={!current}>
            <SkipBack size={19} fill="currentColor" />
          </button>
          <button
            className="ctrl ctrl-play"
            aria-label={player.playing ? 'Пауза' : 'Играть'}
            onClick={player.toggle}
            disabled={!current}
          >
            {player.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>
          <button className="ctrl" aria-label="Следующий" onClick={player.next} disabled={!current}>
            <SkipForward size={19} fill="currentColor" />
          </button>
          <button
            className={cn('ctrl', player.repeat !== 'off' && 'on')}
            aria-label="Повтор"
            title={player.repeat === 'off' ? 'Повтор выключен' : player.repeat === 'all' ? 'Повтор очереди' : 'Повтор трека'}
            onClick={player.cycleRepeat}
          >
            {player.repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        <div className="progress-row">
          <span className="time-label">{formatTime(player.time)}</span>
          <SeekBar
            value={player.time}
            duration={player.duration}
            onSeek={(seconds) => {
              setSeeking(true)
              player.seek(seconds)
              window.setTimeout(() => setSeeking(false), 200)
            }}
            disabled={!current || current.source === 'radio'}
          />
          <span className="time-label">{current?.source === 'radio' ? 'LIVE' : formatTime(player.duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="ctrl" aria-label="Очередь" onClick={onExpand} title="Очередь и обложка">
          <ListMusic size={17} />
        </button>
        <button className="ctrl" aria-label="Звук" onClick={player.toggleMute}>
          <VolumeIcon size={17} />
        </button>
        <SeekBar
          className="vol-bar"
          value={player.muted ? 0 : player.volume}
          duration={1}
          onSeek={(v) => player.setVolume(v)}
          ariaLabel="Громкость"
        />
        <button
          className="ctrl ctrl-play-mobile"
          aria-label={player.playing ? 'Пауза' : 'Играть'}
          onClick={player.toggle}
          disabled={!current}
        >
          {player.playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" style={{ marginLeft: 1 }} />}
        </button>
      </div>
    </footer>
  )
}
