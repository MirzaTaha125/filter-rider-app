import { useState } from 'react'
import { Plus, Edit, X, Save, Trash2 } from 'lucide-react'
import './AssetDefinitions.css'

function AssetDefinitions() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState(null)
  const [definitions, setDefinitions] = useState([
    { id: 1, make: 'Toyota', model: 'Camry', yearRange: '2020-2024', sizeCategory: 'MEDIUM' },
    { id: 2, make: 'Honda', model: 'Accord', yearRange: '2019-2023', sizeCategory: 'MEDIUM' },
    { id: 3, make: 'BMW', model: '5 Series', yearRange: '2021-2024', sizeCategory: 'LARGE' },
    { id: 4, make: 'Mercedes', model: 'E-Class', yearRange: '2020-2024', sizeCategory: 'LARGE' }
  ])
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    yearRange: '',
    sizeCategory: 'MEDIUM'
  })

  const sizeCategories = ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']

  const openModal = (definition = null) => {
    if (definition) {
      setEditingDefinition(definition)
      setFormData({
        make: definition.make,
        model: definition.model,
        yearRange: definition.yearRange,
        sizeCategory: definition.sizeCategory
      })
    } else {
      setEditingDefinition(null)
      setFormData({
        make: '',
        model: '',
        yearRange: '',
        sizeCategory: 'MEDIUM'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDefinition(null)
    setFormData({
      make: '',
      model: '',
      yearRange: '',
      sizeCategory: 'MEDIUM'
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    if (editingDefinition) {
      // Update existing definition
      setDefinitions(prevDefinitions =>
        prevDefinitions.map(def =>
          def.id === editingDefinition.id
            ? {
                ...def,
                make: formData.make,
                model: formData.model,
                yearRange: formData.yearRange,
                sizeCategory: formData.sizeCategory
              }
            : def
        )
      )
    } else {
      // Add new definition
      const newDefinition = {
        id: Math.max(...definitions.map(d => d.id)) + 1,
        make: formData.make,
        model: formData.model,
        yearRange: formData.yearRange,
        sizeCategory: formData.sizeCategory
      }
      setDefinitions(prevDefinitions => [...prevDefinitions, newDefinition])
    }
    closeModal()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this definition?')) {
      setDefinitions(prevDefinitions =>
        prevDefinitions.filter(def => def.id !== id)
      )
    }
  }

  return (
    <div className="asset-definitions">
      <div className="asset-definitions-header-content">
        <div>
          <h1 className="asset-definitions-title">Asset Definitions</h1>
          <p className="asset-definitions-subtitle">Define specific assets and their size categories</p>
        </div>
        <button className="btn-add" onClick={() => openModal()}>
          <Plus size={18} />
          Add Definition
        </button>
      </div>

      <div className="definitions-section">
        <div className="definitions-header">
          <h2>Vehicle Definitions</h2>
        </div>
        <div className="definitions-table-container">
          <table className="definitions-table">
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>Year Range</th>
                <th>Size Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((def) => (
                <tr key={def.id}>
                  <td>{def.make}</td>
                  <td>{def.model}</td>
                  <td>{def.yearRange}</td>
                  <td>{def.sizeCategory}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit-small" onClick={() => openModal(def)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn-delete-small" onClick={() => handleDelete(def.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Definition Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content definition-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingDefinition ? 'Edit Definition' : 'Add New Definition'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="definition-form">
                <div className="form-group">
                  <label htmlFor="make">Make</label>
                  <input
                    type="text"
                    id="make"
                    className="form-input"
                    placeholder="e.g. Toyota"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="model">Model</label>
                  <input
                    type="text"
                    id="model"
                    className="form-input"
                    placeholder="e.g. Camry"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="year-range">Year Range</label>
                  <input
                    type="text"
                    id="year-range"
                    className="form-input"
                    placeholder="e.g. 2020-2024"
                    value={formData.yearRange}
                    onChange={(e) => handleInputChange('yearRange', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="size-category">Size Category</label>
                  <select
                    id="size-category"
                    className="form-input"
                    value={formData.sizeCategory}
                    onChange={(e) => handleInputChange('sizeCategory', e.target.value)}
                  >
                    {sizeCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                <Save size={18} />
                {editingDefinition ? 'Update Definition' : 'Add Definition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetDefinitions

