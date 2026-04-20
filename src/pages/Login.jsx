import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AuthPages.css'

export default function Login() {
  const { loginWithEmail } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password.')
      } else {
        setError('Sign in failed. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome back</h1>
          <p>Sign in to access the Swan Owners community.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="your@email.com" autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Your password" autoComplete="current-password" />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch">
          Not a member yet? <Link to="/register">Apply to join</Link>
        </p>
      </div>
    </div>
  )
}
