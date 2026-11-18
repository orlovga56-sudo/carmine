import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useStore } from '../store'

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  if (!toasts.length) return null
  return createPortal(
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`}>
          {toast.kind === 'success' ? (
            <CheckCircle2 size={16} color="#4ade80" />
          ) : toast.kind === 'error' ? (
            <AlertCircle size={16} color="#ff6b6b" />
          ) : (
            <Info size={16} color="var(--accent-soft)" />
          )}
          <span>{toast.message}</span>
          <button aria-label="Закрыть" onClick={() => dismissToast(toast.id)} style={{ display: 'grid', placeItems: 'center', color: 'var(--muted-2)', marginLeft: 4 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
