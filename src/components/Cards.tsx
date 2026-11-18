import type { Track } from '../types'
import { cn } from '../lib/format'
import { navigate } from '../lib/router'
import { Play } from 'lucide-react'
import { usePlayer } from '../player'

interface MediaCardProps {
  title: string
  subtitle?: string
  artwork?: string
  round?: boolean
  onOpen?: () => void
  onPlay?: () => void
  badge?: string
  loading?: boolean
}

export function MediaCard({ title, subtitle, artwork, round, onOpen, onPlay, badge, loading }: MediaCardProps) {
  return (
    <div className="card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}>
      <div className={cn('card-art', round && 'round')}>
        {artwork ? (
          <img src={artwork} alt="" loading="lazy" />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #26131a, #101014)',
              color: 'var(--accent-soft)',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            {title.slice(0, 1).toUpperCase()}
          </div>
        )}
        {onPlay && !loading && (
          <button
            className="play-fab"
            aria-label={`Слушать ${title}`}
            onClick={(event) => {
              event.stopPropagation()
              onPlay()
            }}
          >
            <Play size={18} fill="currentColor" />
          </button>
        )}
        {badge && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(0,0,0,.68)',
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '.08em',
              padding: '3px 6px',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="card-title" title={title}>{title}</div>
      {subtitle && <div className="card-sub" title={subtitle}>{subtitle}</div>}
    </div>
  )
}

export function TrackCard({ track, context }: { track: Track; context?: Track[] }) {
  const player = usePlayer()
  return (
    <MediaCard
      title={track.title}
      subtitle={track.artist}
      artwork={track.artwork}
      badge={!track.streamUrl && track.previewUrl ? '30 СЕК' : undefined}
      onPlay={() => player.playTrack(track, context)}
      onOpen={() => {
        if (track.albumId && track.source === 'itunes') navigate(`/album/${track.albumId}`)
        else if (track.artistId) navigate(`/artist/${track.artistId}`)
      }}
    />
  )
}

export function Tile({
  title,
  subtitle,
  artwork,
  icon,
  onClick,
}: {
  title: string
  subtitle?: string
  artwork?: string
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button className="tile" onClick={onClick}>
      {artwork ? (
        <img className="tile-art" src={artwork} alt="" loading="lazy" />
      ) : (
        <div className="tile-art">{icon}</div>
      )}
      <div style={{ minWidth: 0 }}>
        <div className="tile-name">{title}</div>
        {subtitle && <div className="tile-sub">{subtitle}</div>}
      </div>
    </button>
  )
}

export function GenreCard({ name, color, onClick }: { name: string; color: string; onClick: () => void }) {
  return (
    <button
      className="genre"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}aa 55%, #141016)` }}
      onClick={onClick}
    >
      <span>{name}</span>
    </button>
  )
}

export function CardSkeletons({ count = 6, round }: { count?: number; round?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel skel-card">
          <div className="a skel" style={{ borderRadius: round ? '50%' : 11 }} />
          <div className="b skel" />
          <div className="c skel" />
        </div>
      ))}
    </>
  )
}
