const fs = require('fs')
const path = require('path')

const pages = {
'src/pages/Landing.jsx': `import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Landing.css'

const STATS = [
  { value: 'German Frers', label: 'Designer' },
  { value: '1980s-Present', label: 'Era' },
  { value: '25+', label: 'Models' },
  { value: 'Worldwide', label: 'Community' },
]

const FEATURES = [
  { title: 'Fleet Registry', description: 'Register your Swan and browse the global fleet. Find boats by model, flag, or home marina. Connect with owners of the same model anywhere in the world.', icon: 'anchor', link: '/fleet', linkLabel: 'Browse the fleet' },
  { title: 'Issues & Fixes', description: 'A searchable knowledge base of real maintenance problems and solutions, contributed by owners. Filter by Swan model and system.', icon: 'wrench', link: '/issues', linkLabel: 'Browse issues' },
  { title: 'Live Map', description: 'See where fellow Swan owners are cruising right now. Share your position when you want to be found, and message other owners to arrange a meeting.', icon: 'map', link: '/map', linkLabel: 'Members only' },
  { title: 'Trusted Contacts', description: 'Owner-recommended riggers, engineers, sailmakers, surveyors and yards — rated by the people who have actually used them.', icon: 'contacts', link: '/contacts', linkLabel: 'Members only' },
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">The Independent Community for</p>
          <h1 className="hero-title">
            Nautor's Swan<br />
            <span className="hero-title-accent">Owners Worldwide</span>
          </h1>
          <p className="hero-subtitle">
            A private community for owners, skippers and gardienners of
            German Frers-designed Swan yachts. Share knowledge, find
            fellow owners, and keep your Swan sailing.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/fleet" className="btn-hero-primary">Go to Fleet</Link>
            ) : (
              <>
                <Link to="/register" className="btn-hero-primary">Join the Community</Link>
                <Link to="/fleet" className="btn-hero-ghost">Browse the Fleet</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-divider" />
      </section>

      <section className="stats-bar">
        {STATS.map(s => (
          <div key={s.label} className="stat">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="intro">
        <div className="intro-inner">
          <h2 className="section-title">Built by owners, for owners</h2>
          <p className="intro-text">
            There is no official owners association for German Frers-era Swan yachts.
            This platform exists to fill that gap — a place where the people who
            live aboard, race, and maintain these exceptional boats can share what
            they know, find each other at sea, and keep an irreplaceable body of
            knowledge alive.
          </p>
          <p className="intro-text">
            Membership is free. Registration requires approval to keep the
            community genuine — owners, skippers and gardienners only.
          </p>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">What's inside</h2>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.description}</p>
              <Link to={f.link} className="feature-link">{f.linkLabel} →</Link>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="cta">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to join?</h2>
            <p className="cta-subtitle">
              Registration takes two minutes. Once approved, you will have full
              access to the fleet registry, live map, issues database, forum
              and direct messaging.
            </p>
            <Link to="/register" className="btn-hero-primary">Apply for membership</Link>
          </div>
        </section>
      )}
    </div>
  )
}
`,

'src/pages/Fleet.jsx': `import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getFleet } from '../services/firestore'
import { SWAN_MODELS, SWAN_CATEGORIES, YACHT_STATUS } from '../data/swanModels'
import './Fleet.css'

export default function Fleet() {
  const [yachts, setYachts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterFlag, setFilterFlag] = useState('')

  useEffect(() => {
    getFleet().then(data => {
      setYachts(data)
      setLoading(false)
    })
  }, [])

  const filtered = yachts.filter(y => {
    const matchSearch = !search ||
      y.name?.toLowerCase().includes(search.toLowerCase()) ||
      y.model?.toLowerCase().includes(search.toLowerCase()) ||
      y.homeMarina?.country?.toLowerCase().includes(search.toLowerCase())
    const matchModel = !filterModel || y.model === filterModel
    const matchFlag = !filterFlag || y.flag?.toUpperCase() === filterFlag.toUpperCase()
    const matchCategory = filterCategory === 'all' || (() => {
      const modelData = SWAN_MODELS.find(m => m.name === y.model)
      return modelData?.category === filterCategory
    })()
    return matchSearch && matchModel && matchFlag && matchCategory
  })

  function getStatusInfo(statusId) {
    return YACHT_STATUS.find(s => s.id === statusId) || YACHT_STATUS[1]
  }

  function clearFilters() {
    setSearch('')
    setFilterModel('')
    setFilterCategory('all')
    setFilterFlag('')
  }

  const hasFilters = search || filterModel || filterFlag || filterCategory !== 'all'

  return (
    <div className="fleet-page">
      <div className="fleet-header">
        <div>
          <h1>The Fleet</h1>
          <p className="fleet-subtitle">
            {loading ? 'Loading...' : yachts.length + ' yacht' + (yachts.length !== 1 ? 's' : '') + ' registered'}
          </p>
        </div>
        <Link to="/my-yacht" className="btn-register">Register Your Swan</Link>
      </div>

      <div className="fleet-filters">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name, model or country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <select className="filter-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterModel('') }}>
            {SWAN_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="filter-select" value={filterModel} onChange={e => setFilterModel(e.target.value)}>
            <option value="">All Models</option>
            {SWAN_MODELS.filter(m => filterCategory === 'all' || m.category === filterCategory).map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
          <input className="filter-select flag-input" type="text" placeholder="Flag e.g. GBR" value={filterFlag} onChange={e => setFilterFlag(e.target.value)} maxLength={3} />
          {hasFilters && <button className="btn-clear" onClick={clearFilters}>Clear filters</button>}
        </div>
      </div>

      {loading ? (
        <div className="fleet-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="fleet-empty">
          <p>{hasFilters ? 'No yachts match your filters.' : 'No yachts registered yet.'}</p>
          {hasFilters && <button className="btn-clear" onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : (
        <div className="fleet-grid">
          {filtered.map(yacht => {
            const status = getStatusInfo(yacht.currentStatus)
            const modelData = SWAN_MODELS.find(m => m.name === yacht.model)
            return (
              <Link key={yacht.id} to={'/fleet/' + yacht.id} className="yacht-card">
                <div className="yacht-card-top">
                  <div className="yacht-photo-placeholder">
                    <span>{yacht.name?.[0] || '?'}</span>
                  </div>
                  <div className="yacht-status-dot" style={{ background: status.color }} title={status.label} />
                </div>
                <div className="yacht-card-body">
                  <div className="yacht-name-row">
                    <h3 className="yacht-name">{yacht.name || 'Unnamed'}</h3>
                    <span className="yacht-flag">{yacht.flag || ''}</span>
                  </div>
                  <p className="yacht-model">{yacht.model || 'Unknown model'}</p>
                  <div className="yacht-meta">
                    {yacht.year && <span>{yacht.year}</span>}
                    {yacht.homeMarina?.country && <span>{yacht.homeMarina.country}</span>}
                    {modelData && <span>{modelData.loa}m</span>}
                  </div>
                  {yacht.notes && (
                    <p className="yacht-notes-preview">
                      {yacht.notes.length > 80 ? yacht.notes.substring(0, 80) + '...' : yacht.notes}
                    </p>
                  )}
                </div>
                <div className="yacht-card-footer">
                  <span className="yacht-status-label" style={{ color: status.color }}>{status.label}</span>
                  <span className="yacht-view">View →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
`,

'src/pages/YachtProfile.jsx': `import { useState, useEffect } from 'react'
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
            <p className="profile-model">{yacht.model}{yacht.year ? ' · ' + yacht.year : ''}</p>
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
              <div className="spec"><span className="spec-label">Built</span><span className="spec-value">{yacht.year || '—'}</span></div>
              {yacht.hullNumber && <div className="spec"><span className="spec-label">Hull Number</span><span className="spec-value">{yacht.hullNumber}</span></div>}
              <div className="spec"><span className="spec-label">Production</span><span className="spec-value">{modelData.yearFrom}–{modelData.yearTo || 'present'}</span></div>
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
          <Link to={'/issues?model=' + encodeURIComponent(yacht.model)} className="btn-issues">View {yacht.model} Issues →</Link>
        </section>
      </div>

      <div className="profile-back">
        <Link to="/fleet" className="btn-back">← Back to Fleet</Link>
      </div>
    </div>
  )
}
`,
}

Object.entries(pages).forEach(([filePath, content]) => {
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Written: ' + filePath + ' (' + content.length + ' chars)')
})

console.log('All done!')
