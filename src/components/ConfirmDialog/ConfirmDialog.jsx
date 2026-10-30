import { useEffect } from 'react'
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
    <div className="confirm-overlay" onClick={onCancel} role="presentation">
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="confirm-title">{title}</h2>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-btn--secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="confirm-btn confirm-btn--primary" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
