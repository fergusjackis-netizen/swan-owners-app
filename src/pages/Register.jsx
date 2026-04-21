import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AuthPages.css'

const ROLES = [
  { id: 'owner', label: 'Owner', desc: 'I own a Nautor Swan yacht' },
  { id: 'skipper', label: 'Skipper / Captain', desc: 'I professionally skipper Swan yachts' },
  { id: 'gardienne', label: 'Gardienne', desc: 'I provide yacht care and management services' },
  { id: 'enthusiast', label: 'Enthusiast', desc: 'I love Swans but do not own one' },
]

export default function Register() {
  const { registerWithEmail } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', nationality: '',
    phone: '', whatsapp: '', languages: '', website: '', basedAt: '',
    yachtName: '', yachtModel: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function handleRoleSelect(r) {
    setRole(r)
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return setError('Please fill in all required fields.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    try {
      await registerWithEmail(form.email, form.password, {
        name: form.name,
        nationality: form.nationality,
        role,
        phone: form.phone || '',
        whatsapp: form.whatsapp || '',
        languages: form.languages || '',
        website: form.website || '',
        basedAt: form.basedAt || '',
        yachtName: form.yachtName || '',
        yachtModel: form.yachtModel || '',
      })
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

  const isPro = role === 'skipper' || role === 'gardienne'

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 1 ? '560px' : '560px' }}>
        <div className="auth-header">
          <h1>{step === 1 ? 'Join Swan Owners' : 'Create your account'}</h1>
          <p>{step === 1
            ? 'Select your role to get started.'
            : 'Welcome ' + ROLES.find(r => r.id === role)?.label + '. Fill in your details below.'
          }</p>
        </div>

        {step === 1 && (
          <div className="role-selector">
            {ROLES.map(r => (
              <button key={r.id} className="role-option" onClick={() => handleRoleSelect(r.id)}>
                <span className="role-label">{r.label}</span>
                <span className="role-desc">{r.desc}</span>
              </button>
            ))}
            <p className="auth-switch">Already a member? <Link to="/login">Sign in</Link></p>
          </div>
        )}

        {step === 2 && (
          <>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-section-label">Personal Details</div>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" />
                </div>
                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Repeat password" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nationality</label>
                  <input type="text" value={form.nationality} onChange={e => update('nationality', e.target.value)} placeholder="e.g. British" />
                </div>
                <div className="form-group">
                  <label>Phone / WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+44 7700 000000" />
                </div>
              </div>

              {isPro && (
                <>
                  <div className="form-section-label">Professional Details</div>
                  <div className="form-group">
                    <label>Languages Spoken</label>
                    <input type="text" value={form.languages} onChange={e => update('languages', e.target.value)} placeholder="e.g. English, French, Italian" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{role === 'gardienne' ? 'Based at (Marina / Port)' : 'Home Port'}</label>
                      <input type="text" value={form.basedAt} onChange={e => update('basedAt', e.target.value)} placeholder="e.g. Antibes" />
                    </div>
                    <div className="form-group">
                      <label>Website (optional)</label>
                      <input type="text" value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Current or recent Swan yacht (optional)</label>
                    <input type="text" value={form.yachtName} onChange={e => update('yachtName', e.target.value)} placeholder="e.g. Tiger - Swan 48" />
                  </div>
                </>
              )}

              {(role === 'owner' || role === 'enthusiast') && (
                <>
                  <div className="form-section-label">Your Swan (optional - can be added later)</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Yacht Name</label>
                      <input type="text" value={form.yachtName} onChange={e => update('yachtName', e.target.value)} placeholder="e.g. Tiger" />
                    </div>
                    <div className="form-group">
                      <label>Model</label>
                      <input type="text" value={form.yachtModel} onChange={e => update('yachtModel', e.target.value)} placeholder="e.g. Swan 48" />
                    </div>
                  </div>
                </>
              )}

              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? 'Submitting...' : 'Apply for Membership'}
              </button>
            </form>
            <button className="btn-forgot" onClick={() => setStep(1)}>Back to role selection</button>
            <p className="auth-switch">Already a member? <Link to="/login">Sign in</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
