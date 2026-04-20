import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getIssues, postIssue } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import { SWAN_MODELS, SYSTEM_TAGS } from '../data/swanModels'
import PhotoUpload from '../components/PhotoUpload'
import PhotoGallery from '../components/PhotoGallery'
import './Issues.css'

export default function Issues() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterModel, setFilterModel] = useState(searchParams.get('model') || '')
  const [filterSystem, setFilterSystem] = useState('')
  const [filterResolved, setFilterResolved] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getIssues().then(data => {
      setIssues(data)
      setLoading(false)
    })
  }, [])

  const filtered = issues.filter(i => {
    const matchSearch = !search ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase())
    const matchModel = !filterModel || i.swanModel === filterModel
    const matchSystem = !filterSystem || i.system === filterSystem
    const matchResolved = filterResolved === 'all' ||
      (filterResolved === 'resolved' ? i.resolved : !i.resolved)
    return matchSearch && matchModel && matchSystem && matchResolved
  })

  function getSystemLabel(id) {
    return SYSTEM_TAGS.find(t => t.id === id)?.label || id
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
    return Math.floor(seconds / 86400) + 'd ago'
  }

  return (
    <div className="issues-page">
      <div className="issues-header">
        <div>
          <h1>Issues & Fixes</h1>
          <p className="issues-subtitle">
            {loading ? 'Loading...' : filtered.length + ' issue' + (filtered.length !== 1 ? 's' : '')}
          </p>
        </div>
        {user && (
          <button className="btn-post" onClick={() => setShowForm(true)}>
            Post an Issue
          </button>
        )}
      </div>

      <div className="issues-filters">
        <input
          className="search-input"
          type="text"
          placeholder="Search issues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <select className="filter-select" value={filterModel} onChange={e => setFilterModel(e.target.value)}>
            <option value="">All Models</option>
            {SWAN_MODELS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <select className="filter-select" value={filterSystem} onChange={e => setFilterSystem(e.target.value)}>
            <option value="">All Systems</option>
            {SYSTEM_TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select className="filter-select" value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {!user && (
        <div className="issues-notice">
          <Link to="/login">Sign in</Link> or <Link to="/register">join</Link> to post issues and fixes.
        </div>
      )}

      {loading ? (
        <div className="issues-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="issues-empty">
          <p>No issues found. {user ? 'Be the first to post one!' : ''}</p>
        </div>
      ) : (
        <div className="issues-list">
          {filtered.map(issue => (
            <Link key={issue.id} to={'/issues/' + issue.id} className="issue-card">
              <div className="issue-card-left">
                {issue.photos && issue.photos.length > 0 ? (
                  <div className="issue-thumb-wrap">
                    <img src={issue.photos[0].url} alt="Issue photo" className="issue-thumb" />
                  </div>
                ) : (
                  <div className="issue-thumb-wrap issue-thumb-empty">
                    <span className="issue-thumb-icon">!</span>
                  </div>
                )}
              </div>
              <div className="issue-card-body">
                <div className="issue-tags">
                  {issue.swanModel && <span className="tag tag-model">{issue.swanModel}</span>}
                  {issue.system && <span className="tag tag-system">{getSystemLabel(issue.system)}</span>}
                  {issue.resolved && <span className="tag tag-resolved">Resolved</span>}
                  {(issue.photos?.length > 0 || issue.fixPhotos?.length > 0) && (
                    <span className="tag tag-photos">Photos</span>
                  )}
                </div>
                <h3 className="issue-title">{issue.title}</h3>
                <p className="issue-desc">
                  {issue.description?.length > 120 ? issue.description.substring(0, 120) + '...' : issue.description}
                </p>
                <div className="issue-meta">
                  <span>{timeAgo(issue.createdAt)}</span>
                  {issue.resolved && issue.fix && <span className="has-fix">Has fix</span>}
                </div>
              </div>
              <div className="issue-card-right">
                <span className="issue-arrow">-&gt;</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <PostIssueModal
          uid={user.uid}
          onClose={() => setShowForm(false)}
          onPosted={issue => {
            setIssues(prev => [issue, ...prev])
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function PostIssueModal({ uid, onClose, onPosted }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    fix: '',
    swanModel: '',
    system: '',
  })
  const [photos, setPhotos] = useState([])
  const [fixPhotos, setFixPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Pre-generate a document ID so we can upload photos before posting
  const [draftId] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let id = ''
    for (let i = 0; i < 20; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
    return id
  })

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function submit() {
    if (!form.title || !form.description) return setError('Please add a title and description.')
    setSaving(true)
    const { setDoc, doc, serverTimestamp, collection } = await import('firebase/firestore')
    const { db } = await import('../firebase')
    const { containsBadLanguage } = await import('../data/swanModels')
    const flagged = containsBadLanguage(form.title + ' ' + form.description)
    await setDoc(doc(db, 'issues', draftId), {
      ...form,
      photos,
      fixPhotos,
      authorUid: uid,
      upvotes: 0,
      upvotedBy: [],
      resolved: false,
      flagged,
      createdAt: serverTimestamp(),
    })
    const newIssue = {
      id: draftId, ...form, photos, fixPhotos,
      upvotes: 0, resolved: false,
      createdAt: { toMillis: () => Date.now() }
    }
    onPosted(newIssue)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={e => e.stopPropagation()}>
        <h2>Post an Issue</h2>
        <p className="modal-hint">Describe a problem you have encountered. Add photos and a fix if you have them.</p>

        <label className="field">
          <span>Title</span>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Autopilot losing heading in following seas" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Swan Model</span>
            <select value={form.swanModel} onChange={e => update('swanModel', e.target.value)}>
              <option value="">Select model</option>
              {SWAN_MODELS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>System</span>
            <select value={form.system} onChange={e => update('system', e.target.value)}>
              <option value="">Select system</option>
              {SYSTEM_TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description of the problem</span>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Describe what happened, when, and under what conditions..." />
        </label>

        <div className="field">
          <span>Problem photos (optional, up to 5)</span>
          <PhotoUpload
            storagePath={"issues/" + draftId + "/problem"}
            maxPhotos={5}
            existingPhotos={photos}
            onUploaded={newPhotos => setPhotos(prev => [...prev, ...newPhotos])}
          />
          {photos.length > 0 && (
            <PhotoGallery
              photos={photos}
              onCaptionChange={(idx, caption) => setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))}
              onRemove={idx => setPhotos(prev => prev.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        <label className="field">
          <span>Fix or workaround (if known)</span>
          <textarea value={form.fix} onChange={e => update('fix', e.target.value)} rows={3} placeholder="What resolved the issue? Leave blank if unsolved..." />
        </label>

        <div className="field">
          <span>Fix photos (optional, up to 5)</span>
          <PhotoUpload
            storagePath={"issues/" + draftId + "/fix"}
            maxPhotos={5}
            existingPhotos={fixPhotos}
            onUploaded={newPhotos => setFixPhotos(prev => [...prev, ...newPhotos])}
          />
          {fixPhotos.length > 0 && (
            <PhotoGallery
              photos={fixPhotos}
              onCaptionChange={(idx, caption) => setFixPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))}
              onRemove={idx => setFixPhotos(prev => prev.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-post" onClick={submit} disabled={saving}>
            {saving ? 'Posting...' : 'Post Issue'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
