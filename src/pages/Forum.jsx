import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getForumTopics, createForumTopic } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import './Forum.css'

const FORUM_CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'general', label: 'General' },
  { id: 'racing', label: 'Racing' },
  { id: 'cruising', label: 'Cruising' },
  { id: 'regattas', label: 'Regattas & Events' },
  { id: 'crew', label: 'Crew Wanted' },
  { id: 'charter', label: 'Charter' },
  { id: 'buying', label: 'Buying & Selling' },
]

export default function Forum() {
  const { user } = useAuth()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    getForumTopics().then(data => {
      setTopics(data)
      setLoading(false)
    })
  }, [])

  const filtered = filterCategory === 'all' ? topics : topics.filter(t => t.category === filterCategory)

  function timeAgo(ts) {
    if (!ts) return ''
    const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
    return Math.floor(seconds / 86400) + 'd ago'
  }

  return (
    <div className="forum-page">
      <div className="forum-header">
        <div>
          <h1>Forum</h1>
          <p className="forum-subtitle">{loading ? 'Loading...' : filtered.length + ' topic' + (filtered.length !== 1 ? 's' : '')}</p>
        </div>
        <button className="btn-post" onClick={() => setShowForm(true)}>New Topic</button>
      </div>

      <div className="forum-categories">
        {FORUM_CATEGORIES.map(c => (
          <button key={c.id} className={"category-btn" + (filterCategory === c.id ? " active" : "")} onClick={() => setFilterCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="forum-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="forum-empty">
          <p>No topics yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="forum-list">
          {filtered.map(topic => (
            <Link key={topic.id} to={'/forum/' + topic.id} className="topic-card">
              <div className="topic-card-body">
                <div className="topic-tags">
                  {topic.category && <span className="tag tag-model">{FORUM_CATEGORIES.find(c => c.id === topic.category)?.label || topic.category}</span>}
                  {topic.flagged && <span className="tag tag-flagged">Flagged</span>}
                </div>
                <h3 className="topic-title">{topic.title}</h3>
                <p className="topic-preview">{topic.body?.length > 120 ? topic.body.substring(0, 120) + '...' : topic.body}</p>
                <div className="topic-meta">
                  <span>{timeAgo(topic.createdAt)}</span>
                  <span>{topic.replyCount || 0} replies</span>
                </div>
              </div>
              <div className="topic-arrow">-&gt;</div>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <NewTopicModal uid={user.uid} onClose={() => setShowForm(false)} onPosted={topic => { setTopics(prev => [topic, ...prev]); setShowForm(false) }} />
      )}
    </div>
  )
}

function NewTopicModal({ uid, onClose, onPosted }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'general' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!form.title || !form.body) return setError('Please add a title and message.')
    setSaving(true)
    const ref = await createForumTopic(uid, form)
    onPosted({ id: ref.id, ...form, replyCount: 0, createdAt: { toMillis: () => Date.now() } })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={e => e.stopPropagation()}>
        <h2>New Topic</h2>
        <label className="field"><span>Title</span>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What would you like to discuss?" /></label>
        <label className="field"><span>Category</span>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {FORUM_CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></label>
        <label className="field"><span>Message</span>
          <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} placeholder="Share your thoughts..." /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn-post" onClick={submit} disabled={saving}>{saving ? 'Posting...' : 'Post Topic'}</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
