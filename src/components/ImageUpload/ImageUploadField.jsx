import { useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { uploadImage, IMAGE_TYPES } from '../../api/upload'
import { ShimmerImage } from '../Shimmer/Shimmer'
import './ImageUploadField.css'

/**
 * Image picker for admin forms: uploads straight away to `folder` and reports
 * the stored URL through onChange (null when removed). The parent saves the
 * URL with the rest of the form.
 */
function ImageUploadField({ label = 'Image', folder, value, onChange, disabled, hint }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const pick = () => inputRef.current?.click()

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      onChange(await uploadImage(file, folder))
    } catch (err) {
      setError(err.message || 'Image upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const busy = disabled || uploading

  return (
    <div className="sf-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="iu-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={busy}
      />

      {value ? (
        <div className="iu-preview-wrap">
          <div className="iu-preview">
            <ShimmerImage src={value} alt="" />
            {uploading && <span className="iu-overlay"><Loader2 size={22} className="spin" /></span>}
          </div>
          <div className="iu-actions">
            <button type="button" className="iu-btn" onClick={pick} disabled={busy}>
              <RefreshCw size={14} /> Change
            </button>
            <button type="button" className="iu-btn iu-btn--danger" onClick={() => onChange(null)} disabled={busy}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="iu-drop"
          onClick={pick}
          disabled={busy}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (!busy) handleFile(e.dataTransfer.files?.[0])
          }}
        >
          {uploading ? <Loader2 size={24} className="spin" /> : <ImagePlus size={24} />}
          <strong>{uploading ? 'Uploading…' : 'Upload image'}</strong>
          <span>Click or drop a JPG, PNG or WEBP (max 5 MB)</span>
        </button>
      )}

      {error
        ? <span className="sf-hint iu-error" role="alert">{error}</span>
        : hint && <span className="sf-hint">{hint}</span>}
    </div>
  )
}

export default ImageUploadField
