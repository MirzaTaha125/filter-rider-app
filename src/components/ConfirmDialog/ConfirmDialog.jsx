import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import './ConfirmDialog.css'

/**
 * Small confirmation dialog used in place of window.confirm so destructive
 * actions match the rest of the admin panel.
 */
function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="cd-overlay" onClick={onCancel} role="presentation">
      <div
        className="cd-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="cd-icon"><AlertTriangle size={22} /></div>
        <h2 className="cd-title">{title}</h2>
        {message && <p className="cd-message">{message}</p>}
        <div className="cd-actions">
          <button className="cd-btn cd-btn--secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className="cd-btn cd-btn--danger" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
