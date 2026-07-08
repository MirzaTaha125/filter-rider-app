import { useState } from 'react'
import { Plus, Edit, Trash2, Clock, User, AlertCircle, X, Save } from 'lucide-react'
import './CancellationRules.css'

function CancellationRules() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [rules, setRules] = useState([
    { id: 'RULE-001', orderStatus: 'BROADCASTING', userType: 'Customer', timeThreshold: 30, penalty: 10 },
    { id: 'RULE-002', orderStatus: 'ASSIGNED', userType: 'SP', timeThreshold: 15, penalty: 20 }
  ])
  const [formData, setFormData] = useState({
    orderStatus: 'BROADCASTING',
    userType: 'Customer',
    timeThreshold: '',
    penalty: ''
  })

  const orderStatuses = ['BROADCASTING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
  const userTypes = ['Customer', 'SP']

  const openModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        orderStatus: rule.orderStatus,
        userType: rule.userType,
        timeThreshold: rule.timeThreshold.toString(),
        penalty: rule.penalty.toString()
      })
    } else {
      setEditingRule(null)
      setFormData({
        orderStatus: 'BROADCASTING',
        userType: 'Customer',
        timeThreshold: '',
        penalty: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRule(null)
    setFormData({
      orderStatus: 'BROADCASTING',
      userType: 'Customer',
      timeThreshold: '',
      penalty: ''
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    if (editingRule) {
      // Update existing rule
      setRules(prevRules =>
        prevRules.map(rule =>
          rule.id === editingRule.id
            ? {
                ...rule,
                orderStatus: formData.orderStatus,
                userType: formData.userType,
                timeThreshold: parseInt(formData.timeThreshold) || 0,
                penalty: parseFloat(formData.penalty) || 0
              }
            : rule
        )
      )
    } else {
      // Add new rule
      const newRule = {
        id: `RULE-${String(rules.length + 1).padStart(3, '0')}`,
        orderStatus: formData.orderStatus,
        userType: formData.userType,
        timeThreshold: parseInt(formData.timeThreshold) || 0,
        penalty: parseFloat(formData.penalty) || 0
      }
      setRules(prevRules => [...prevRules, newRule])
    }
    closeModal()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this cancellation rule?')) {
      setRules(prevRules =>
        prevRules.filter(rule => rule.id !== id)
      )
    }
  }

  return (
    <div className="cancellation-rules">
      <div className="rules-header">
        <div className="rules-header-content">
          <div>
            <h1 className="rules-title">Cancellation Rules</h1>
            <p className="rules-subtitle">Configure cancellation policies and penalties</p>
          </div>
          <button className="btn-add-rule" onClick={() => openModal()}>
            <Plus size={18} />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      <div className="rules-list">
        {rules.map((rule) => (
          <div key={rule.id} className="rule-card">
            <div className="rule-header">
              <div className="rule-icon">
                <AlertCircle size={24} />
              </div>
              <div className="rule-info">
                <h3 className="rule-title">Rule #{rule.id}</h3>
                <div className="rule-details">
                  <div className="rule-detail-item">
                    <Clock size={16} />
                    <span>Order Status: {rule.orderStatus}</span>
                  </div>
                  <div className="rule-detail-item">
                    <User size={16} />
                    <span>User Type: {rule.userType}</span>
                  </div>
                  <div className="rule-detail-item">
                    <span>Time Threshold: {rule.timeThreshold} minutes</span>
                  </div>
                  <div className="rule-detail-item">
                    <span>Penalty: <span className="riyal-symbol">&#x20C1;</span>{rule.penalty}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rule-actions">
              <button className="btn-edit" onClick={() => openModal(rule)}>
                <Edit size={16} />
                Edit
              </button>
              <button className="btn-delete" onClick={() => handleDelete(rule.id)}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Rule Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content rule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingRule ? 'Edit Cancellation Rule' : 'Add New Cancellation Rule'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="rule-form">
                <div className="form-group">
                  <label htmlFor="order-status">Order Status</label>
                  <select
                    id="order-status"
                    className="form-input"
                    value={formData.orderStatus}
                    onChange={(e) => handleInputChange('orderStatus', e.target.value)}
                  >
                    {orderStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="user-type">User Type</label>
                  <select
                    id="user-type"
                    className="form-input"
                    value={formData.userType}
                    onChange={(e) => handleInputChange('userType', e.target.value)}
                  >
                    {userTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="time-threshold">Time Threshold (minutes)</label>
                    <div className="input-with-icon">
                      <Clock size={20} className="input-icon" />
                      <input
                        type="number"
                        id="time-threshold"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        value={formData.timeThreshold}
                        onChange={(e) => handleInputChange('timeThreshold', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="penalty">Penalty (<span className="riyal-symbol">&#x20C1;</span>)</label>
                    <div className="input-with-icon">
                      <span className="input-prefix riyal-symbol">&#x20C1;</span>
                      <input
                        type="number"
                        id="penalty"
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.penalty}
                        onChange={(e) => handleInputChange('penalty', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                <Save size={18} />
                {editingRule ? 'Update Rule' : 'Add Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CancellationRules

