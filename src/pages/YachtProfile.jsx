import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getYacht } from '../services/firestore'
import { SWAN_MODELS, YACHT_STATUS } from '../data/swanModels'
import { useAuth } from '../hooks/useAuth'
import './YachtProfile.css'

export default function YachtProfile() {
  const { yachtId } = useParams()
  const { user } = useAuth()
  const [yacht, setYacht] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getYacht(yachtId).then(data => {
      setYacht(data)
      setLoading(false)
    })
  }, [yachtId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!yacht) return (
    <div className="profile-page">
      <p className="not-found">Yacht not found. <Link to="/fleet">Back to fleet</Link></p>
    </div>
  )

  const status = YACHT_STATUS.find(s => s.id === yacht.currentStatus) || YACHT_STATUS[1]
  const modelData = SWAN_MODELS.find(m => m.name === yacht.model)
  const isOwner = user?.uid === yachtId

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-hero">
          <div className="profile-photo-placeholder">
            <span>{yacht.name?.[0] || '?'}</span>
          </div>
          <div className="profile-title">
            <div className="profile-name-row">
              <h1>{yacht.name}</h1>
              <span className="profile-flag">{yacht.flag}</span>
            </div>
            <p className="profile-model">{yacht.model}{yacht.year ? ' ?? ' + yacht.year : ''}</p>
            <div className="profile-status" style={{ color: status.color }}>
              <span className="status-dot" style={{ background: status.color }} />
              {status.label}
            </div>
          </div>
        </div>
        {isOwner && <Link to="/my-yacht" className="btn-edit">Edit Yacht</Link>}
      </div>

      <div className="profile-body">
        {modelData && (
          <section className="profile-section">
            <h2>Specifications</h2>
            <div className="specs-grid">
              <div className="spec"><span className="spec-label">Length Overall</span><span className="spec-value">{modelData.loa}m</span></div>
              <div className="spec"><span className="spec-label">Beam</span><span className="spec-value">{modelData.beam}m</span></div>
              <div className="spec"><span className="spec-label">Displacement</span><span className="spec-value">{modelData.displacement?.toLocaleString()}kg</span></div>
              <div className="spec"><span className="spec-label">Built</span><span className="spec-value">{yacht.year || '???'}</span></div>
              {yacht.hullNumber && <div className="spec"><span className="spec-label">Hull Number</span><span className="spec-value">{yacht.hullNumber}</span></div>}
              <div className="spec"><span className="spec-label">Production</span><span className="spec-value">{modelData.yearFrom}???{modelData.yearTo || 'present'}</span></div>
            </div>
          </section>
        )}

        {yacht.homeMarina?.name && (
          <section className="profile-section">
            <h2>Home Marina</h2>
            <p className="info-primary">{yacht.homeMarina.name}</p>
            {yacht.homeMarina.country && <p className="info-secondary">{yacht.homeMarina.country}</p>}
          </section>
        )}

        {yacht.skipper && (
          <section className="profile-section">
            <h2>Skipper / Captain</h2>
            <div className="crew-card">
              <div className="crew-avatar">{yacht.skipper.name?.[0] || 'S'}</div>
              <div className="crew-info">
                <p className="crew-name">{yacht.skipper.name || 'Owner'}</p>
                {yacht.skipper.nationality && <p className="crew-detail">{yacht.skipper.nationality}</p>}
                {yacht.skipper.languages && <p className="crew-detail">Languages: {yacht.skipper.languages}</p>}
                {user && yacht.skipper.email && <a href={'mailto:' + yacht.skipper.email} className="crew-contact">{yacht.skipper.email}</a>}
                {user && yacht.skipper.phone && <a href={'tel:' + yacht.skipper.phone} className="crew-contact">{yacht.skipper.phone}</a>}
                {yacht.skipper.website && <a href={yacht.skipper.website} target="_blank" rel="noopener noreferrer" className="crew-contact">{yacht.skipper.website}</a>}
              </div>
            </div>
          </section>
        )}

        {yacht.gardienne && (
          <section className="profile-section">
            <h2>Gardienne</h2>
            <div className="crew-card">
              <div className="crew-avatar">{yacht.gardienne.name?.[0] || 'G'}</div>
              <div className="crew-info">
                <p className="crew-name">{yacht.gardienne.name}</p>
                {yacht.gardienne.location && <p className="crew-detail">{yacht.gardienne.location}</p>}
                {yacht.gardienne.languages && <p className="crew-detail">Languages: {yacht.gardienne.languages}</p>}
                {user && yacht.gardienne.email && <a href={'mailto:' + yacht.gardienne.email} className="crew-contact">{yacht.gardienne.email}</a>}
                {user && yacht.gardienne.phone && <a href={'tel:' + yacht.gardienne.phone} className="crew-contact">{yacht.gardienne.phone}</a>}
                {yacht.gardienne.website && <a href={yacht.gardienne.website} target="_blank" rel="noopener noreferrer" className="crew-contact">{yacht.gardienne.website}</a>}
              </div>
            </div>
          </section>
        )}

        {yacht.notes && (
          <section className="profile-section">
            <h2>From the Owner</h2>
            <p className="profile-notes">{yacht.notes}</p>
          </section>
        )}

        <section className="profile-section">
          <h2>Issues and Fixes</h2>
          <p className="info-secondary" style={{ marginBottom: '1rem' }}>Browse maintenance issues and fixes reported for the {yacht.model}.</p>
          <Link to={'/issues?model=' + encodeURIComponent(yacht.model)} className="btn-issues">View {yacht.model} Issues ???</Link>
        </section>
      </div>

      <div className="profile-back">
        <Link to="/fleet" className="btn-back">??? Back to Fleet</Link>
      </div>
    </div>
  )
}
