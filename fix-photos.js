const fs = require('fs')

const files = {

'src/components/PhotoUpload.jsx': `import { useState, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import './PhotoUpload.css'

export default function PhotoUpload({ storagePath, onUploaded, maxPhotos = 5, existingPhotos = [] }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const totalPhotos = existingPhotos.length

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const remaining = maxPhotos - totalPhotos
    if (remaining <= 0) return setError('Maximum ' + maxPhotos + ' photos allowed.')

    const toUpload = files.slice(0, remaining)
    setUploading(true)
    setError('')

    const urls = []
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      if (file.size > 10 * 1024 * 1024) {
        setError('Each photo must be under 10MB.')
        continue
      }
      const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const storageRef = ref(storage, storagePath + '/' + fileName)
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file)
        task.on('state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            urls.push({ url, caption: '' })
            resolve()
          }
        )
      })
    }

    setUploading(false)
    setProgress(0)
    if (urls.length) onUploaded(urls)
    fileInputRef.current.value = ''
  }

  return (
    <div className="photo-upload">
      {totalPhotos < maxPhotos && (
        <label className={"upload-btn" + (uploading ? " uploading" : "")}>
          {uploading ? (
            <span>Uploading {progress}%</span>
          ) : (
            <span>+ Add Photo{maxPhotos > 1 ? 's' : ''} ({totalPhotos}/{maxPhotos})</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxPhotos > 1}
            onChange={handleFiles}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      )}
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
`,

'src/components/PhotoUpload.css': `
.photo-upload {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px dashed #1e3a5f;
  color: #6b8cae;
  padding: 0.6rem 1.25rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.upload-btn:hover { border-color: #c9a84c; color: #c9a84c; }
.upload-btn.uploading { border-color: #c9a84c; color: #c9a84c; cursor: wait; }

.upload-error {
  font-size: 0.78rem;
  color: #ef4444;
}
`,

'src/components/PhotoGallery.jsx': `import { useState } from 'react'
import './PhotoGallery.css'

export default function PhotoGallery({ photos = [], onCaptionChange = null, onRemove = null }) {
  const [lightbox, setLightbox] = useState(null)

  if (!photos.length) return null

  return (
    <>
      <div className="photo-gallery">
        {photos.map((photo, idx) => (
          <div key={idx} className="gallery-item">
            <div className="gallery-thumb-wrap" onClick={() => setLightbox(idx)}>
              <img src={photo.url} alt={'Photo ' + (idx + 1)} className="gallery-thumb" />
              <div className="gallery-thumb-overlay">
                <span>View</span>
              </div>
            </div>
            {onCaptionChange ? (
              <input
                className="caption-input"
                value={photo.caption || ''}
                onChange={e => onCaptionChange(idx, e.target.value)}
                placeholder="Add a caption or note..."
              />
            ) : photo.caption ? (
              <p className="caption-text">{photo.caption}</p>
            ) : null}
            {onRemove && (
              <button className="remove-photo" onClick={() => onRemove(idx)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {lightbox !== null && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>x</button>
            <button
              className="lightbox-prev"
              onClick={() => setLightbox(l => l > 0 ? l - 1 : photos.length - 1)}
              disabled={photos.length <= 1}
            >
              &lt;
            </button>
            <div className="lightbox-content">
              <img src={photos[lightbox].url} alt={'Photo ' + (lightbox + 1)} className="lightbox-img" />
              {photos[lightbox].caption && (
                <p className="lightbox-caption">{photos[lightbox].caption}</p>
              )}
              <p className="lightbox-counter">{lightbox + 1} / {photos.length}</p>
            </div>
            <button
              className="lightbox-next"
              onClick={() => setLightbox(l => l < photos.length - 1 ? l + 1 : 0)}
              disabled={photos.length <= 1}
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
`,

'src/components/PhotoGallery.css': `
.photo-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.gallery-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 140px;
}

.gallery-thumb-wrap {
  position: relative;
  width: 140px;
  height: 100px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid #1e3a5f;
}

.gallery-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.gallery-thumb-wrap:hover .gallery-thumb {
  transform: scale(1.05);
}

.gallery-thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: #e8e4d8;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.gallery-thumb-wrap:hover .gallery-thumb-overlay {
  opacity: 1;
}

.caption-input {
  background: #0a0f1e;
  border: 1px solid #1e3a5f;
  color: #e8e4d8;
  padding: 0.4rem 0.6rem;
  font-size: 0.75rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  transition: border-color 0.2s;
}

.caption-input:focus { border-color: #c9a84c; }
.caption-input::placeholder { color: #3d5a78; }

.caption-text {
  font-size: 0.75rem;
  color: #6b8cae;
  font-style: italic;
  line-height: 1.4;
}

.remove-photo {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-align: left;
}

.remove-photo:hover { text-decoration: underline; }

/* LIGHTBOX */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}

.lightbox-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 90vw;
  max-height: 90vh;
  position: relative;
}

.lightbox-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.lightbox-img {
  max-width: 80vw;
  max-height: 75vh;
  object-fit: contain;
  border: 1px solid #1e3a5f;
}

.lightbox-caption {
  font-size: 0.88rem;
  color: #8aa4be;
  text-align: center;
  max-width: 600px;
}

.lightbox-counter {
  font-size: 0.72rem;
  color: #3d5a78;
  letter-spacing: 0.1em;
}

.lightbox-close {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  background: #0d1629;
  border: 1px solid #1e3a5f;
  color: #e8e4d8;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: border-color 0.2s;
}

.lightbox-close:hover { border-color: #c9a84c; color: #c9a84c; }

.lightbox-prev,
.lightbox-next {
  background: #0d1629;
  border: 1px solid #1e3a5f;
  color: #e8e4d8;
  width: 40px;
  height: 40px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: all 0.2s;
  flex-shrink: 0;
}

.lightbox-prev:hover,
.lightbox-next:hover { border-color: #c9a84c; color: #c9a84c; }
.lightbox-prev:disabled,
.lightbox-next:disabled { opacity: 0.3; cursor: default; }
`,

'src/pages/IssueDetail.jsx': `import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc, collection, getDocs, orderBy, query, updateDoc, serverTimestamp } from 'firebase/firestore'
import { postIssueReply, upvoteIssue, markIssueResolved } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import { SYSTEM_TAGS } from '../data/swanModels'
import PhotoUpload from '../components/PhotoUpload'
import PhotoGallery from '../components/PhotoGallery'
import './Issues.css'
import './IssueDetail.css'

export default function IssueDetail() {
  const { issueId } = useParams()
  const { user, isAdmin } = useAuth()
  const [issue, setIssue] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyPhotos, setReplyPhotos] = useState([])
  const [posting, setPosting] = useState(false)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'issues', issueId))
      if (snap.exists()) {
        setIssue({ id: snap.id, ...snap.data() })
        setVoted(snap.data().upvotedBy?.includes(user?.uid))
      }
      const repliesSnap = await getDocs(
        query(collection(db, 'issues', issueId, 'replies'), orderBy('createdAt', 'asc'))
      )
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
    if (!replyText.trim() && !replyPhotos.length) return
    if (!user) return
    setPosting(true)
    const { addDoc } = await import('firebase/firestore')
    const { containsBadLanguage } = await import('../data/swanModels')
    const flagged = containsBadLanguage(replyText)
    const replyRef = await addDoc(
      collection(db, 'issues', issueId, 'replies'),
      {
        text: replyText,
        photos: replyPhotos,
        authorUid: user.uid,
        flagged,
        createdAt: serverTimestamp(),
      }
    )
    setReplies(prev => [...prev, {
      id: replyRef.id,
      text: replyText,
      photos: replyPhotos,
      authorUid: user.uid,
      flagged,
      createdAt: { toMillis: () => Date.now() }
    }])
    setReplyText('')
    setReplyPhotos([])
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
  if (!issue) return (
    <div className="issue-detail-page">
      <p>Issue not found. <Link to="/issues">Back to issues</Link></p>
    </div>
  )

  return (
    <div className="issue-detail-page">
      <Link to="/issues" className="back-link">Back to Issues</Link>

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
            <PhotoGallery photos={issue.photos || []} />
          </section>

          {(issue.fix || (issue.fixPhotos && issue.fixPhotos.length > 0)) && (
            <section className="issue-section fix-section">
              <h2>Fix</h2>
              {issue.fix && <p>{issue.fix}</p>}
              <PhotoGallery photos={issue.fixPhotos || []} />
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
            <PhotoGallery photos={r.photos || []} />
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
            <div className="reply-form-footer">
              <PhotoUpload
                storagePath={"issues/" + issueId + "/replies"}
                maxPhotos={3}
                existingPhotos={replyPhotos}
                onUploaded={newPhotos => setReplyPhotos(prev => [...prev, ...newPhotos])}
              />
              <button
                className="btn-post"
                onClick={handleReply}
                disabled={posting || (!replyText.trim() && !replyPhotos.length)}
              >
                {posting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
            {replyPhotos.length > 0 && (
              <PhotoGallery
                photos={replyPhotos}
                onCaptionChange={(idx, caption) => {
                  setReplyPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))
                }}
                onRemove={idx => setReplyPhotos(prev => prev.filter((_, i) => i !== idx))}
              />
            )}
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

'src/pages/Issues.jsx': `import { useState, useEffect } from 'react'
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
  const [issueId, setIssueId] = useState(null)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function submit() {
    if (!form.title || !form.description) return setError('Please add a title and description.')
    setSaving(true)
    const ref = await postIssue(uid, { ...form, photos, fixPhotos })
    const newIssue = {
      id: ref.id, ...form, photos, fixPhotos,
      upvotes: 0, resolved: false,
      createdAt: { toMillis: () => Date.now() }
    }
    onPosted(newIssue)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={e => e.stopPropagation()}>
        <h2>Post an Issue</h2>
        <p className="modal-hint">Describe a problem you have encountered. Add a fix and photos if you have them - this is what makes this community valuable.</p>

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
          <PhotoGallery
            photos={photos}
            onCaptionChange={(idx, caption) => setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))}
            onRemove={idx => setPhotos(prev => prev.filter((_, i) => i !== idx))}
          />
          {issueId ? (
            <PhotoUpload
              storagePath={"issues/" + issueId + "/problem"}
              maxPhotos={5}
              existingPhotos={photos}
              onUploaded={newPhotos => setPhotos(prev => [...prev, ...newPhotos])}
            />
          ) : (
            <p className="upload-note">Save the issue first to upload photos, or add them after posting.</p>
          )}
        </div>

        <label className="field">
          <span>Fix or workaround (if known)</span>
          <textarea value={form.fix} onChange={e => update('fix', e.target.value)} rows={3} placeholder="What resolved the issue? Leave blank if unsolved..." />
        </label>

        <div className="field">
          <span>Fix photos (optional, up to 5)</span>
          <p className="upload-note">You can add fix photos after posting the issue.</p>
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

.issue-detail-votes { flex-shrink: 0; }

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
  margin-bottom: 0.5rem;
}

.reply-time {
  font-size: 0.72rem;
  color: #3d5a78;
  display: block;
  margin-top: 0.5rem;
}

.reply-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.reply-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
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

.upload-note {
  font-size: 0.75rem;
  color: #3d5a78;
  font-style: italic;
  margin-top: 0.25rem;
}

.tag-photos { background: #1a1a2e; color: #8888cc; }
`
}

Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Written: ' + filePath + ' (' + content.length + ' chars)')
})

console.log('All done!')
