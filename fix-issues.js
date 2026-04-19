const fs = require('fs')

const files = {

'src/pages/Fleet.css': `
.fleet-page {
  padding-bottom: 4rem;
}

.fleet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #1e3a5f;
}

.fleet-header h1 {
  font-size: 2rem;
  color: #c9a84c;
  letter-spacing: 0.03em;
  margin-bottom: 0.25rem;
}

.fleet-subtitle {
  font-size: 0.82rem;
  color: #6b8cae;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.btn-register {
  background: #c9a84c;
  color: #0a0f1e;
  padding: 0.65rem 1.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-register:hover { background: #e0bc5e; }

.fleet-filters {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-input {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  color: #e8e4d8;
  padding: 0.85rem 1.25rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  transition: border-color 0.2s;
}

.search-input:focus { border-color: #c9a84c; }

.filter-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  color: #6b8cae;
  padding: 0.6rem 1rem;
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus { border-color: #c9a84c; }

.flag-input {
  width: 100px;
  text-transform: uppercase;
}

.btn-clear {
  background: transparent;
  border: 1px solid #1e3a5f;
  color: #6b8cae;
  padding: 0.6rem 1rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-clear:hover { border-color: #c9a84c; color: #c9a84c; }

.fleet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.fleet-loading {
  display: flex;
  justify-content: center;
  padding: 4rem;
}

.fleet-empty {
  text-align: center;
  padding: 4rem;
  color: #6b8cae;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.yacht-card {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, transform 0.2s;
  cursor: pointer;
}

.yacht-card:hover {
  border-color: #c9a84c;
  transform: translateY(-2px);
}

.yacht-card-top {
  position: relative;
  height: 140px;
  background: linear-gradient(135deg, #0d1629 0%, #1e3a5f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.yacht-photo-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #1e3a5f;
  border: 2px solid #c9a84c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: #c9a84c;
  font-weight: 700;
  text-transform: uppercase;
}

.yacht-status-dot {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.yacht-card-body {
  padding: 1.25rem;
  flex: 1;
}

.yacht-name-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.yacht-name {
  font-size: 1.15rem;
  color: #e8e4d8;
  letter-spacing: 0.03em;
}

.yacht-flag {
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: #c9a84c;
  text-transform: uppercase;
}

.yacht-model {
  font-size: 0.82rem;
  color: #6b8cae;
  margin-bottom: 0.75rem;
  letter-spacing: 0.05em;
}

.yacht-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.yacht-meta span {
  font-size: 0.75rem;
  color: #3d5a78;
  letter-spacing: 0.08em;
}

.yacht-notes-preview {
  font-size: 0.78rem;
  color: #3d5a78;
  line-height: 1.5;
  margin-top: 0.5rem;
  font-style: italic;
}

.yacht-card-footer {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid #1e3a5f;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.yacht-status-label {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
}

.yacht-view {
  font-size: 0.75rem;
  color: #3d5a78;
  letter-spacing: 0.08em;
  transition: color 0.2s;
}

.yacht-card:hover .yacht-view { color: #c9a84c; }
`,

'src/pages/Issues.jsx': `import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getIssues, postIssue } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import { SWAN_MODELS, SYSTEM_TAGS } from '../data/swanModels'
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
                <div className="issue-votes">
                  <span className="vote-count">{issue.upvotes || 0}</span>
                  <span className="vote-label">votes</span>
                </div>
              </div>
              <div className="issue-card-body">
                <div className="issue-tags">
                  {issue.swanModel && <span className="tag tag-model">{issue.swanModel}</span>}
                  {issue.system && <span className="tag tag-system">{getSystemLabel(issue.system)}</span>}
                  {issue.resolved && <span className="tag tag-resolved">Resolved</span>}
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
                <span className="issue-arrow">→</span>
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function submit() {
    if (!form.title || !form.description) return setError('Please add a title and description.')
    setSaving(true)
    const ref = await postIssue(uid, form)
    const newIssue = { id: ref.id, ...form, upvotes: 0, resolved: false, createdAt: { toMillis: () => Date.now() } }
    onPosted(newIssue)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={e => e.stopPropagation()}>
        <h2>Post an Issue</h2>
        <p className="modal-hint">Describe a problem you have encountered. Add a fix if you have found one — this is the knowledge that makes this community valuable.</p>

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
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} placeholder="Describe what happened, when, and under what conditions..." />
        </label>

        <label className="field">
          <span>Fix or workaround (if known)</span>
          <textarea value={form.fix} onChange={e => update('fix', e.target.value)} rows={3} placeholder="What resolved the issue? Leave blank if unsolved..." />
        </label>

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
`,

'src/pages/Issues.css': `
.issues-page {
  padding-bottom: 4rem;
}

.issues-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #1e3a5f;
}

.issues-header h1 {
  font-size: 2rem;
  color: #c9a84c;
  letter-spacing: 0.03em;
  margin-bottom: 0.25rem;
}

.issues-subtitle {
  font-size: 0.82rem;
  color: #6b8cae;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.btn-post {
  background: #c9a84c;
  color: #0a0f1e;
  border: none;
  padding: 0.65rem 1.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-post:hover:not(:disabled) { background: #e0bc5e; }
.btn-post:disabled { opacity: 0.6; cursor: not-allowed; }

.issues-filters {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.issues-notice {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  padding: 1rem 1.25rem;
  font-size: 0.88rem;
  color: #6b8cae;
  margin-bottom: 1.5rem;
}

.issues-notice a {
  color: #c9a84c;
  text-decoration: none;
}

.issues-loading, .issues-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: #6b8cae;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.issue-card {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  background: #0d1629;
  border: 1px solid #1e3a5f;
  padding: 1.25rem;
  text-decoration: none;
  transition: border-color 0.2s;
  cursor: pointer;
}

.issue-card:hover { border-color: #c9a84c; }

.issue-card-left {
  flex-shrink: 0;
}

.issue-votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #0a0f1e;
  border: 1px solid #1e3a5f;
  padding: 0.5rem 0.75rem;
  min-width: 52px;
}

.vote-count {
  font-size: 1.2rem;
  font-weight: 700;
  color: #c9a84c;
  line-height: 1;
}

.vote-label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3d5a78;
  margin-top: 0.2rem;
}

.issue-card-body {
  flex: 1;
  min-width: 0;
}

.issue-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.tag {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: 2px;
}

.tag-model { background: #1e3a5f; color: #6b8cae; }
.tag-system { background: #1a2a1a; color: #4a8c4a; }
.tag-resolved { background: #1a2a1a; color: #22c55e; }
.tag-flagged { background: #2a1a1a; color: #ef4444; }

.issue-title {
  font-size: 1rem;
  color: #e8e4d8;
  margin-bottom: 0.4rem;
  letter-spacing: 0.01em;
}

.issue-desc {
  font-size: 0.82rem;
  color: #6b8cae;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.issue-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #3d5a78;
}

.has-fix {
  color: #22c55e;
  font-weight: 600;
}

.issue-card-right {
  flex-shrink: 0;
  color: #3d5a78;
  font-size: 1rem;
  transition: color 0.2s;
}

.issue-card:hover .issue-card-right { color: #c9a84c; }

.issue-arrow { font-size: 1rem; }

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 1rem;
}

.modal-box {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-box.large { max-width: 640px; }

.modal-box h2 {
  font-size: 1.3rem;
  color: #e8e4d8;
}

.modal-hint {
  font-size: 0.85rem;
  color: #6b8cae;
  line-height: 1.6;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field span {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b8cae;
}

.field input,
.field select,
.field textarea {
  background: #0a0f1e;
  border: 1px solid #1e3a5f;
  color: #e8e4d8;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  resize: vertical;
}

.field input:focus,
.field select:focus,
.field textarea:focus { border-color: #c9a84c; }

.field select option { background: #0a0f1e; }

.form-error {
  font-size: 0.85rem;
  color: #ef4444;
  padding: 0.75rem 1rem;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-ghost {
  background: transparent;
  color: #6b8cae;
  border: 1px solid #1e3a5f;
  padding: 0.65rem 1.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-ghost:hover { border-color: #c9a84c; color: #c9a84c; }
`,

'src/pages/IssueDetail.jsx': `import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore'
import { postIssueReply, upvoteIssue, markIssueResolved } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import { SYSTEM_TAGS } from '../data/swanModels'
import './Issues.css'
import './IssueDetail.css'

export default function IssueDetail() {
  const { issueId } = useParams()
  const { user, isAdmin } = useAuth()
  const [issue, setIssue] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'issues', issueId))
      if (snap.exists()) {
        setIssue({ id: snap.id, ...snap.data() })
        setVoted(snap.data().upvotedBy?.includes(user?.uid))
      }
      const repliesSnap = await getDocs(query(collection(db, 'issues', issueId, 'replies'), orderBy('createdAt', 'asc')))
      setReplies(repliesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [issueId, user?.uid])

  async function handleVote() {
    if (!user) return
    await upvoteIssue(issueId, user.uid)
    setIssue(prev => ({ ...prev, upvotes: voted ? (prev.upvotes - 1) : (prev.upvotes + 1) }))
    setVoted(v => !v)
  }

  async function handleReply() {
    if (!replyText.trim() || !user) return
    setPosting(true)
    await postIssueReply(issueId, user.uid, replyText)
    setReplies(prev => [...prev, { id: Date.now(), text: replyText, authorUid: user.uid, createdAt: { toMillis: () => Date.now() } }])
    setReplyText('')
    setPosting(false)
  }

  async function handleResolve() {
    await markIssueResolved(issueId, user.uid)
    setIssue(prev => ({ ...prev, resolved: true }))
  }

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

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!issue) return <div className="issue-detail-page"><p>Issue not found. <Link to="/issues">Back to issues</Link></p></div>

  return (
    <div className="issue-detail-page">
      <Link to="/issues" className="back-link">← Back to Issues</Link>

      <div className="issue-detail-card">
        <div className="issue-detail-header">
          <div className="issue-detail-votes">
            <button className={"vote-btn" + (voted ? " voted" : "")} onClick={handleVote} disabled={!user}>
              <span className="vote-count">{issue.upvotes || 0}</span>
              <span className="vote-label">{voted ? "voted" : "vote"}</span>
            </button>
          </div>
          <div className="issue-detail-main">
            <div className="issue-tags">
              {issue.swanModel && <span className="tag tag-model">{issue.swanModel}</span>}
              {issue.system && <span className="tag tag-system">{getSystemLabel(issue.system)}</span>}
              {issue.resolved && <span className="tag tag-resolved">Resolved</span>}
            </div>
            <h1 className="issue-detail-title">{issue.title}</h1>
            <p className="issue-detail-time">{timeAgo(issue.createdAt)}</p>
          </div>
        </div>

        <div className="issue-detail-body">
          <section className="issue-section">
            <h2>Problem</h2>
            <p>{issue.description}</p>
          </section>

          {issue.fix && (
            <section className="issue-section fix-section">
              <h2>Fix</h2>
              <p>{issue.fix}</p>
            </section>
          )}
        </div>

        {user && !issue.resolved && (issue.authorUid === user.uid || isAdmin) && (
          <div className="issue-actions">
            <button className="btn-resolve" onClick={handleResolve}>Mark as Resolved</button>
          </div>
        )}
      </div>

      <div className="replies-section">
        <h2>Discussion ({replies.length})</h2>

        {replies.length === 0 && (
          <p className="no-replies">No replies yet. Be the first to contribute.</p>
        )}

        {replies.map(r => (
          <div key={r.id} className={"reply-card" + (r.flagged ? " flagged" : "")}>
            <p className="reply-text">{r.text}</p>
            <span className="reply-time">{timeAgo(r.createdAt)}</span>
          </div>
        ))}

        {user ? (
          <div className="reply-form">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={3}
              placeholder="Add to the discussion..."
              className="reply-input"
            />
            <button className="btn-post" onClick={handleReply} disabled={posting || !replyText.trim()}>
              {posting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        ) : (
          <p className="issues-notice">
            <Link to="/login">Sign in</Link> to join the discussion.
          </p>
        )}
      </div>
    </div>
  )
}
`,

'src/pages/IssueDetail.css': `
.issue-detail-page {
  max-width: 800px;
  padding-bottom: 4rem;
}

.back-link {
  display: inline-block;
  color: #6b8cae;
  text-decoration: none;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  margin-bottom: 1.5rem;
  transition: color 0.2s;
}

.back-link:hover { color: #c9a84c; }

.issue-detail-card {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  margin-bottom: 2rem;
}

.issue-detail-header {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  border-bottom: 1px solid #1e3a5f;
}

.issue-detail-votes {
  flex-shrink: 0;
}

.vote-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #0a0f1e;
  border: 1px solid #1e3a5f;
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  min-width: 60px;
}

.vote-btn:hover:not(:disabled) { border-color: #c9a84c; }
.vote-btn.voted { border-color: #c9a84c; background: rgba(201,168,76,0.1); }
.vote-btn:disabled { cursor: default; }

.vote-btn .vote-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: #c9a84c;
  line-height: 1;
}

.vote-btn .vote-label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3d5a78;
  margin-top: 0.25rem;
}

.issue-detail-main { flex: 1; }

.issue-detail-title {
  font-size: 1.4rem;
  color: #e8e4d8;
  margin: 0.5rem 0 0.25rem;
  line-height: 1.3;
}

.issue-detail-time {
  font-size: 0.75rem;
  color: #3d5a78;
}

.issue-detail-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.issue-section h2 {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6b8cae;
  margin-bottom: 0.75rem;
}

.issue-section p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #8aa4be;
}

.fix-section {
  background: rgba(34,197,94,0.05);
  border: 1px solid rgba(34,197,94,0.2);
  padding: 1.25rem;
}

.fix-section h2 { color: #22c55e; }
.fix-section p { color: #a8d5b5; }

.issue-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid #1e3a5f;
}

.btn-resolve {
  background: transparent;
  border: 1px solid #22c55e;
  color: #22c55e;
  padding: 0.5rem 1.25rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-resolve:hover { background: rgba(34,197,94,0.1); }

.replies-section h2 {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6b8cae;
  margin-bottom: 1rem;
}

.no-replies {
  font-size: 0.88rem;
  color: #3d5a78;
  margin-bottom: 1.5rem;
}

.reply-card {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  border-left: 3px solid #1e3a5f;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}

.reply-card.flagged { border-left-color: #ef4444; }

.reply-text {
  font-size: 0.9rem;
  color: #8aa4be;
  line-height: 1.6;
  margin-bottom: 0.4rem;
}

.reply-time {
  font-size: 0.72rem;
  color: #3d5a78;
}

.reply-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.reply-input {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  color: #e8e4d8;
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  resize: vertical;
  transition: border-color 0.2s;
}

.reply-input:focus { border-color: #c9a84c; }
`
}

Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Written: ' + filePath + ' (' + content.length + ' chars)')
})

console.log('All done!')
