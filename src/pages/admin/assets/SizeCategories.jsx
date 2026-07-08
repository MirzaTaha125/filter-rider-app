import { useState, useEffect } from 'react'
import { Edit, Plus, X, Save, Trash2, Loader2 } from 'lucide-react'
import { getSizeCategories, createSizeCategory, updateSizeCategory, deleteSizeCategory } from '../../../api'
import './SizeCategories.css'

function SizeCategories() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSize, setEditingSize] = useState(null)
  const [sizeCategories, setSizeCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    multiplier: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getSizeCategories()
      setSizeCategories(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load size categories')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (size = null) => {
    if (size) {
      setEditingSize(size)
      setFormData({
        name: size.name,
        multiplier: size.multiplier.toString()
      })
    } else {
      setEditingSize(null)
      setFormData({
        name: '',
        multiplier: ''
      })
    }
    setError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSize(null)
    setFormData({
      name: '',
      multiplier: ''
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: formData.name,
        multiplier: formData.multiplier
      }

      if (editingSize) {
        await updateSizeCategory(editingSize.id, payload)
      } else {
        await createSizeCategory(payload)
      }
      await loadData()
      closeModal()
    } catch (err) {
      setError(err.message || 'Failed to save size category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this size category?')) {
      try {
        await deleteSizeCategory(id)
        await loadData()
      } catch (err) {
        alert(err.message || 'Failed to delete size category')
      }
    }
  }

  return (
    <div className="size-categories">
      <div className="size-categories-header-content">
        <div>
          <h1 className="size-categories-title">Size Categories</h1>
          <p className="size-categories-subtitle">Configure size categories and their pricing multipliers</p>
        </div>
        <button className="btn-add-size" onClick={() => openModal()}>
          <Plus size={18} />
          <span>Add Category</span>
        </button>
      </div>

      {error && !isModalOpen && <p className="api-error">{error}</p>}

      <div className="sizes-section">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading size categories...</p>
          </div>
        ) : (
          <div className="sizes-grid">
            {sizeCategories.map((size) => (
              <div key={size.id} className="size-card">
                <div className="size-name">{size.name}</div>
                <div className="size-multiplier">Multiplier: {size.multiplier}x</div>
                <div className="size-actions">
                  <button className="btn-edit" onClick={() => openModal(size)}>
                    <Edit size={16} />
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(size.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {sizeCategories.length === 0 && !error && (
              <div className="no-data">No size categories found.</div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Size Category Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content size-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingSize ? 'Edit Size Category' : 'Add New Size Category'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {error && <p className="api-error">{error}</p>}
              <div className="size-form">
                <div className="form-group">
                  <label htmlFor="size-name">Category Name</label>
                  <input
                    type="text"
                    id="size-name"
                    className="form-input"
                    placeholder="e.g. SMALL, MEDIUM, LARGE"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="multiplier">Multiplier</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="multiplier"
                      className="form-input"
                      placeholder="0.0"
                      step="0.01"
                      min="0"
                      value={formData.multiplier}
                      onChange={(e) => handleInputChange('multiplier', e.target.value)}
                    />
                    <span className="input-suffix">x</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !formData.name || !formData.multiplier}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {editingSize ? 'Update Category' : 'Add Category'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SizeCategories
