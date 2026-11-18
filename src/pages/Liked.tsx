import { Heart, Play, Shuffle } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { TrackRow } from '../components/TrackRow'
import { trackCount } from '../lib/format'
import { navigate } from '../lib/router'

export function LikedPage() {
  const { likes, toast, toggleLike } = useStore()
  const player = usePlayer()
  const tracks = Object.values(likes).reverse()

  return (
    <div className="page">
      <div className="collection-head">
        <div
          className="collection-art"
          style={{
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, #ff2145, #7a0719 70%, #1a0a0e)',
            boxShadow: '0 26px 70px rgba(255,33,69,.28)',
          }}
        >
          <Heart size={84} fill="#fff" color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="collection-type">Коллекция</div>
          <h1 className="collection-title">Любимые треки</h1>
          <div className="collection-meta">
            <span>{trackCount(tracks.length)}</span>
            <span className="sep" />
            <span>Синхронизируется на этом устройстве</span>
          </div>
        </div>
      </div>

      <div className="collection-actions">
        <button className="play-big" onClick={() => player.playTracks(tracks, 0, 'Любимые треки')} disabled={!tracks.length} aria-label="Слушать">
          <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => player.playTracks([...tracks].sort(() => Math.random() - 0.5), 0, 'Любимые треки')}
          disabled={!tracks.length}
        >
          <Shuffle size={15} /> Перемешать
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="empty">
          <div className="icon-big"><Heart size={26} /></div>
          <h3>Здесь пока тихо</h3>
          <p>Нажимай на сердечко у любого трека — и он окажется тут. Лайки подсказывают Carmine, какие миксы собирать.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Найти музыку</button>
        </div>
      ) : (
        <div className="track-list">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              list={tracks}
              onRemove={() => {
                toggleLike(track)
                toast('Убрано из любимых')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
