import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import './Contacts.css'

export default function Contacts() {
  const { user } = useAuth()
  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(
        collection(db, 'users'),
        where('status', '==', 'approved')
      ))
      const pros = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role === 'skipper' || u.role === 'gardienne')
      setProfessionals(pros)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? professionals : professionals.filter(p => p.role === filter)

  const whatsappMsg = encodeURIComponent('Hi! I found you on Swan Owners Community and would like to discuss your services.')

  return (
    <div className="contacts-page">
      <div className="contacts-header">
        <div>
          <h1>Professional Directory</h1>
          <p className="contacts-subtitle">Skippers and gardiennes in the Swan Owners community</p>
        </div>
      </div>

      <div className="contacts-filters">
        {[{ id: 'all', label: 'All' }, { id: 'skipper', label: 'Skippers' }, { id: 'gardienne', label: 'Gardiennes' }].map(f => (
          <button key={f.id} className={"filter-btn" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="contacts-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="contacts-empty">
          <p>No professionals registered yet.</p>
          {!user && <p>Skippers and gardiennes can <a href="/register">register here</a>.</p>}
        </div>
      ) : (
        <div className="contacts-grid">
          {filtered.map(pro => (
            <div key={pro.id} className="pro-card">
              <div className="pro-card-header">
                <div className="pro-avatar">{pro.name?.[0] || 'P'}</div>
                <div>
                  <h3 className="pro-name">{pro.name}</h3>
                  <span className={"pro-role-badge" + (pro.role === 'skipper' ? " skipper" : " gardienne")}>
                    {pro.role === 'skipper' ? 'Skipper' : 'Gardienne'}
                  </span>
                </div>
              </div>
              <div className="pro-details">
                {pro.nationality && <div className="pro-detail"><span>Nationality</span><strong>{pro.nationality}</strong></div>}
                {pro.basedAt && <div className="pro-detail"><span>Based at</span><strong>{pro.basedAt}</strong></div>}
                {pro.languages && <div className="pro-detail"><span>Languages</span><strong>{pro.languages}</strong></div>}
                {pro.yachtName && <div className="pro-detail"><span>Current yacht</span><strong>{pro.yachtName}</strong></div>}
              </div>
              {user && (
                <div className="pro-contact">
                  {pro.phone && (
                    <a href={'https://wa.me/' + pro.phone.replace(/[^0-9]/g,'') + '?text=' + whatsappMsg}
                      target="_blank" rel="noopener noreferrer" className="btn-pro-whatsapp">
                      WhatsApp
                    </a>
                  )}
                  {pro.website && (
                    <a href={pro.website} target="_blank" rel="noopener noreferrer" className="btn-pro-web">
                      Website
                    </a>
                  )}
                </div>
              )}
              {!user && <p className="pro-login-note"><a href="/login">Sign in</a> to contact</p>}
            </div>
          ))}
        </div>
      )}

      <div className="contacts-cta">
        <p>Are you a skipper or gardienne? <a href="/register">Join the directory</a></p>
      </div>
    </div>
  )
}
