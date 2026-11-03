import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CreditCard, User, UserCheck } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getAppStatus,
  listAdminPaymentMethods,
  saveAppStatus,
  updateAdminPaymentMethod,
} from '../../../api'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'
import '../adminForm.css'
import '../zones/ZoneSettings.css'

const CHANNEL_LABEL = {
  CUSTOMER_APP: 'Customer app',
  PROVIDER_APP: 'Provider app',
  ADMIN: 'Admin',
}

const emptySide = () => ({
  wallet_enabled: true,
  maintenance_mode: false,
  min_version: '',
  store_url: '',
})

function readSide(source) {
  return {
    wallet_enabled: source?.wallet_enabled !== false,
    maintenance_mode: Boolean(source?.maintenance_mode),
    min_version: source?.min_version ?? '',
    store_url: source?.store_url ?? '',
  }
}

function ToggleRow({ checked, onChange, disabled, onLabel, offLabel, title }) {
  return (
    <label className="sf-toggle">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
      <span className="sf-toggle-copy">
        <strong>{title}: {checked ? 'On' : 'Off'}</strong>
        <em>{checked ? onLabel : offLabel}</em>
      </span>
    </label>
  )
}

function AppStatus() {
  const [form, setForm] = useState(null)
  const [methods, setMethods] = useState([])
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingMethodId, setSavingMethodId] = useState('')

  useEffect(() => {
    getAppStatus()
      .then((s) => {
        setForm({
          customer: readSide(s?.customer ?? s),
          provider: readSide(s?.provider ?? s),
        })
      })
      .catch((e) => setLoadError(e.message || 'Could not load app status'))
    listAdminPaymentMethods()
      .then((list) => setMethods(Array.isArray(list) ? list : []))
      .catch(() => setMethods([]))
  }, [])

  const toggleMethod = async (method, nextActive) => {
    setSavingMethodId(method.id)
    setFormError('')
    setNotice('')
    try {
      const updated = await updateAdminPaymentMethod(method.id, {
        is_active: nextActive,
      })
      const next = updated?.data ?? updated
      setMethods((prev) =>
        prev.map((item) =>
          item.id === method.id
            ? { ...item, ...(next && typeof next === 'object' ? next : {}), is_active: nextActive }
            : item,
        ),
      )
      setNotice('Payment method updated. Apps pick this up on the next payment screen.')
    } catch (err) {
      setFormError(err.message || 'Could not update payment method')
    } finally {
      setSavingMethodId('')
    }
  }

  const persist = async (next) => {
    setSaving(true)
    setFormError('')
    setNotice('')
    try {
      const payload = {
        customer: {
          wallet_enabled: Boolean(next.customer.wallet_enabled),
          maintenance_mode: Boolean(next.customer.maintenance_mode),
          min_version: next.customer.min_version?.trim() ?? '',
          store_url: next.customer.store_url?.trim() ?? '',
        },
        provider: {
          wallet_enabled: Boolean(next.provider.wallet_enabled),
          maintenance_mode: Boolean(next.provider.maintenance_mode),
          min_version: next.provider.min_version?.trim() ?? '',
          store_url: next.provider.store_url?.trim() ?? '',
        },
      }
      const s = await saveAppStatus(payload)
      setForm({
        customer: readSide(s?.customer),
        provider: readSide(s?.provider),
      })
      setNotice('Saved. Apps pick this up within a few seconds.')
    } catch (err) {
      setFormError(err.message || 'Could not save app status')
    } finally {
      setSaving(false)
    }
  }

  const setSideField = (side, key, value, { save = false } = {}) => {
    const next = {
      ...form,
      [side]: { ...form[side], [key]: value },
    }
    setForm(next)
    if (save) persist(next)
  }

  if (loadError) {
    return (
      <div className="zone-settings-page">
        <PageHeader title="App Status" />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load</h2>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="zone-settings-page">
        <PageHeader title="App Status" />
        <PageShimmer />
      </div>
    )
  }

  const sideCard = (side, title, Icon) => {
    const values = form[side] ?? emptySide()
    return (
      <section className="sf-card">
        <header className="sf-card-head">
          <h2><Icon size={18} className="zs-head-icon" />{title}</h2>
          <p>These settings only affect this app. The other app is unchanged.</p>
        </header>
        <ToggleRow
          title="Wallet"
          checked={values.wallet_enabled}
          onChange={(v) => setSideField(side, 'wallet_enabled', v, { save: true })}
          disabled={saving}
          onLabel="Wallet page is live."
          offLabel="Wallet shows Coming soon."
        />
        <ToggleRow
          title="Maintenance mode"
          checked={values.maintenance_mode}
          onChange={(v) => setSideField(side, 'maintenance_mode', v, { save: true })}
          disabled={saving}
          onLabel="This app shows only the maintenance screen."
          offLabel="This app runs normally."
        />
        <div className="sf-field" style={{ marginTop: '1.25rem' }}>
          <label htmlFor={`${side}-min-version`}>Min app version</label>
          <input
            id={`${side}-min-version`}
            type="text"
            placeholder="1.0.0"
            value={values.min_version}
            disabled={saving}
            onChange={(e) => setSideField(side, 'min_version', e.target.value)}
          />
          <p className="sf-toggle-copy"><em>If the installed app is below this, it is blocked until they update. Leave empty to skip.</em></p>
        </div>
        <div className="sf-field" style={{ marginTop: '1rem' }}>
          <label htmlFor={`${side}-store-url`}>Store URL</label>
          <input
            id={`${side}-store-url`}
            type="url"
            placeholder="https://apps.apple.com/… or Play Store link"
            value={values.store_url}
            disabled={saving}
            onChange={(e) => setSideField(side, 'store_url', e.target.value)}
          />
        </div>
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          style={{ marginTop: '1.25rem', width: '100%' }}
          disabled={saving}
          onClick={() => persist(form)}
        >
          {saving ? 'Saving…' : `Save ${title} version & link`}
        </button>
      </section>
    )
  }

  return (
    <div className="zone-settings-page">
      <PageHeader
        title="App Status"
        subtitle="Wallet, maintenance, payment methods, min version, and store link — separately for customer and provider"
      />

      <form className="sf-form" onSubmit={(e) => e.preventDefault()}>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}
        {notice && (
          <div className="zs-notice">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        <div className="sf-grid sf-grid--3 app-status-grid">
          {sideCard('customer', 'Customer app', User)}
          {sideCard('provider', 'Provider app', UserCheck)}
          <section className="sf-card">
            <header className="sf-card-head">
              <h2><CreditCard size={18} className="zs-head-icon" />Payment methods</h2>
              <p>Active methods appear in the customer Pay for service sheet from the backend. Turn one off to hide it in the apps.</p>
            </header>
            {methods.length === 0 ? (
              <p className="sf-toggle-copy"><em>No payment methods found.</em></p>
            ) : (
              methods.map((method) => (
                <ToggleRow
                  key={method.id}
                  title={`${method.name || method.code} (${CHANNEL_LABEL[method.channel] || method.channel})`}
                  checked={method.is_active !== false}
                  onChange={(v) => toggleMethod(method, v)}
                  disabled={saving || savingMethodId === method.id}
                  onLabel={method.description || 'Shown on Pay for service.'}
                  offLabel="Hidden from the payment sheet."
                />
              ))
            )}
          </section>
        </div>
      </form>
    </div>
  )
}

export default AppStatus
