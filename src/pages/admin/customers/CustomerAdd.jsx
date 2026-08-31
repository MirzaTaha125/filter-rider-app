import { useState } from 'react'
import { signupCustomer } from '../../../api'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { Loader2, Check } from 'lucide-react'
import './CustomerAdd.css'

function CustomerAdd() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: 'SA',
    password: '',
    customerType: 'normal',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Full name, email and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await signupCustomer(formData)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="customer-add-page">
        <PageHeader title="Add New Customer" />
        <div className="success-container">
          <div className="success-box">
            <div className="success-icon">
              <Check size={48} />
            </div>
            <h2>Success!</h2>
            <p>Customer has been registered successfully.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="customer-add-page">
      <PageHeader title="Add New Customer" subtitle="Create a new customer account" />

      <div className="form-container">
        <div className="form-card">
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Customer Information</h3>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+966 50 123 4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Customer Type</label>
                <select
                  className="form-input"
                  value={formData.customerType}
                  onChange={(e) => handleInputChange('customerType', e.target.value)}
                  disabled={saving}
                >
                  <option value="normal">Personal</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? <><Loader2 size={18} className="spin" /> Creating...</> : 'Create Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CustomerAdd
