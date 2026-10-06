import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, AlertTriangle, CheckCircle2, Phone, ShieldCheck } from 'lucide-react'
import {
  sendDeleteAccountOtp,
  verifyDeleteAccountOtp,
  confirmDeleteAccount,
} from '../../api'
import './DeleteAccount.css'

const DEFAULT_COUNTRY = '+966'

/**
 * Public self-serve delete flow:
 * phone → OTP → confirm → soft-delete (name becomes “Name (deleted)”).
 */
function DeleteAccountFlow({ audience }) {
  const isProvider = audience === 'PROVIDER'
  const otherPath = isProvider
    ? '/delete-account/customer'
    : '/delete-account/service-provider'
  const otherLabel = isProvider ? 'Customer account' : 'Service provider account'
  const title = isProvider
    ? 'Delete service provider account'
    : 'Delete customer account'

  const [step, setStep] = useState('phone') // phone | otp | confirm | done
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY)
  const [otp, setOtp] = useState('')
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugOtp, setDebugOtp] = useState('')
  const [deletedName, setDeletedName] = useState('')

  useEffect(() => {
    setStep('phone')
    setPhone('')
    setOtp('')
    setAccessToken(null)
    setError('')
    setDebugOtp('')
    setDeletedName('')
  }, [audience])

  const normalizedPhone = phone.trim()

  const sendOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setDebugOtp('')
    if (!normalizedPhone || normalizedPhone.replace(/\D/g, '').length < 8) {
      setError('Enter a valid phone number')
      return
    }
    setLoading(true)
    try {
      const result = await sendDeleteAccountOtp({
        audience,
        phone: normalizedPhone,
        countryCode,
      })
      const payload = result?.data ?? result
      if (payload?.otp) setDebugOtp(String(payload.otp))
      setOtp('')
      setStep('otp')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e) => {
    e?.preventDefault()
    setError('')
    if (!otp.trim() || otp.trim().length < 4) {
      setError('Enter the OTP sent to your phone')
      return
    }
    setLoading(true)
    try {
      const result = await verifyDeleteAccountOtp({
        audience,
        phone: normalizedPhone,
        otp: otp.trim(),
        countryCode,
      })
      if (!result.access_token) {
        throw new Error('Could not start a delete session. Try again.')
      }
      setAccessToken(result.access_token)
      setStep('confirm')
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await confirmDeleteAccount(accessToken)
      const payload = result?.data ?? result
      setDeletedName(payload?.name || '')
      setAccessToken(null)
      setStep('done')
    } catch (err) {
      setError(err.message || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="da-page da-page--flow">
      <div className="da-flow-card">
        <div className="da-flow-brand">
          <span className="brand-logo" aria-hidden="true" />
          <div>
            <p className="da-kicker">Filter Rider</p>
            <h1>{title}</h1>
          </div>
        </div>

        <p className="da-flow-copy">
          Verify your phone with OTP, then confirm deletion. Your past orders stay
          in the system and will show as <em>Name (deleted)</em>.
        </p>

        <ol className="da-steps" aria-label="Progress">
          <li className={step === 'phone' ? 'is-active' : ['otp', 'confirm', 'done'].includes(step) ? 'is-done' : ''}>1. Phone</li>
          <li className={step === 'otp' ? 'is-active' : ['confirm', 'done'].includes(step) ? 'is-done' : ''}>2. OTP</li>
          <li className={step === 'confirm' ? 'is-active' : step === 'done' ? 'is-done' : ''}>3. Confirm</li>
        </ol>

        {error && (
          <div className="da-alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {step === 'phone' && (
          <form className="da-form" onSubmit={sendOtp}>
            <label className="da-field">
              <span>Country code</span>
              <input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+966"
                disabled={loading}
                autoComplete="tel-country-code"
              />
            </label>
            <label className="da-field">
              <span>Phone number</span>
              <div className="da-phone-row">
                <Phone size={16} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XXXXXXXX"
                  inputMode="tel"
                  autoComplete="tel-national"
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
            </label>
            <button type="submit" className="da-primary" disabled={loading}>
              {loading
                ? <><Loader2 size={16} className="spin" /> Sending…</>
                : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form className="da-form" onSubmit={verifyOtp}>
            <p className="da-hint">
              We sent a code to <strong>{countryCode} {normalizedPhone}</strong>
            </p>
            {debugOtp && (
              <p className="da-debug">Dev OTP: {debugOtp}</p>
            )}
            <label className="da-field">
              <span>OTP code</span>
              <div className="da-phone-row">
                <ShieldCheck size={16} />
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
            </label>
            <button type="submit" className="da-primary" disabled={loading}>
              {loading
                ? <><Loader2 size={16} className="spin" /> Verifying…</>
                : 'Verify OTP'}
            </button>
            <div className="da-secondary-row">
              <button
                type="button"
                className="da-linkish"
                disabled={loading}
                onClick={() => { setStep('phone'); setError(''); setOtp('') }}
              >
                Change phone
              </button>
              <button
                type="button"
                className="da-linkish"
                disabled={loading}
                onClick={sendOtp}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <div className="da-form">
            <div className="da-confirm-box">
              <AlertTriangle size={22} />
              <div>
                <h2>Are you sure you want to delete your account?</h2>
                <p>
                  This cannot be undone. You will be signed out everywhere.
                  Orders and history stay, and your name will appear as
                  {' '}<em>Name (deleted)</em>.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="da-primary da-primary--danger"
              disabled={loading}
              onClick={deleteAccount}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Deleting…</>
                : 'Yes, delete my account'}
            </button>
            <button
              type="button"
              className="da-secondary"
              disabled={loading}
              onClick={() => {
                setAccessToken(null)
                setStep('phone')
                setOtp('')
                setError('')
              }}
            >
              Cancel — keep my account
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="da-done">
            <CheckCircle2 size={36} />
            <h2>Account deleted</h2>
            <p>
              {deletedName
                ? <>Your account is deleted. Historical records show as <em>{deletedName}</em>.</>
                : 'Your account has been deleted successfully.'}
            </p>
          </div>
        )}

        <p className="da-switch-line">
          Wrong audience?{' '}
          <Link to={otherPath}>{otherLabel}</Link>
        </p>
      </div>
    </div>
  )
}

export default DeleteAccountFlow
