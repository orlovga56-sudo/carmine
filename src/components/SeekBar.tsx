import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/format'

interface SeekBarProps {
  value: number
  onSeek: (seconds: number) => void
  duration: number
  className?: string
  ariaLabel?: string
  disabled?: boolean
}

export function SeekBar({ value, onSeek, duration, className, ariaLabel = 'Позиция', disabled }: SeekBarProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(0)

  const ratioFromEvent = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const shown = dragging ? preview : duration > 0 ? Math.min(1, value / duration) : 0

  useEffect(() => {
    if (!dragging) return
    const move = (event: PointerEvent) => setPreview(ratioFromEvent(event.clientX))
    const up = (event: PointerEvent) => {
      const ratio = ratioFromEvent(event.clientX)
      setDragging(false)
      onSeek(ratio * duration)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging, duration, onSeek, ratioFromEvent])

  return (
    <div
      ref={ref}
      className={cn('bar', dragging && 'dragging', className)}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(value)}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        if (disabled || duration <= 0) return
        event.preventDefault()
        setDragging(true)
        setPreview(ratioFromEvent(event.clientX))
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'ArrowRight') onSeek(Math.min(duration, value + 5))
        if (event.key === 'ArrowLeft') onSeek(Math.max(0, value - 5))
      }}
    >
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${shown * 100}%` }} />
      </div>
      <div className="bar-thumb" style={{ left: `${shown * 100}%` }} />
    </div>
  )
}
