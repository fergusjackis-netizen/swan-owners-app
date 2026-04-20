import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import './AuthPages.css'

export default function Login() {
  const { loginWithEmail } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) return setError('Please enter your email and password.')
    setLoading(true)
    try {
      await loginWithEmail(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError('Incorrect email or password.')
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!resetEmail) return setError('Please enter your email address.')
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetSent(true)
      setError('')
    } catch (err) {
      setError('Could not send reset email. Please check the address.')
    }
    setResetLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{showReset ? 'Reset Password' : 'Welcome back'}</h1>
          <p>{showReset ? 'Enter your email and we will send you a reset link.' : 'Sign in to access the Swan Owners community.'}</p>
        </div>

        {!showReset ? (
          <>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="your@email.com" autoComplete="email" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                  />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowPassword(s => !s)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <button className="btn-forgot"
              onClick={() => { setShowReset(true); setResetEmail(form.email); setError('') }}>
              Forgot your password?
            </button>
          </>
        ) : (
          <div className="reset-form">
            {resetSent ? (
              <p className="reset-sent">Reset email sent to {resetEmail}. Check your inbox and junk folder.</p>
            ) : (
              <>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="your@email.com" />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="btn-auth" onClick={handleReset} disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </>
            )}
            <button className="btn-forgot" onClick={() => { setShowReset(false); setError('') }}>
              Back to sign in
            </button>
          </div>
        )}

        <p className="auth-switch">
          Not a member yet? <Link to="/register">Apply to join</Link>
        </p>
      </div>
    </div>
  )
}