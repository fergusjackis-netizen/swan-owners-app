import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { USER_ROLES } from '../data/swanModels'
import './AuthPages.css'

export default function Register() {
  const { registerWithEmail } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', nationality: '', role: 'owner' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.nationality) return setError('Please fill in all fields.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    try {
      await registerWithEmail(form.email, form.password, { name: form.name, nationality: form.nationality, role: form.role })
      navigate('/pending')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else {
        setError('Registration failed. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Join Swan Owners</h1>
          <p>Apply for membership. Once approved you will have full access to the community.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your full name" autoComplete="name" />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="your@email.com" autoComplete="email" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Nationality</label>
              <input type="text" value={form.nationality} onChange={e => update('nationality', e.target.value)} placeholder="e.g. British" />
            </div>
            <div className="form-group">
              <label>Your Role</label>
              <select value={form.role} onChange={e => update('role', e.target.value)}>
                {USER_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Submitting...' : 'Apply for Membership'}
          </button>
        </form>
        <p className="auth-switch">
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
