import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc, collection, getDocs, orderBy, query, serverTimestamp, addDoc } from 'firebase/firestore'
import { markIssueResolved, deleteIssue } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import { SYSTEM_TAGS, containsBadLanguage } from '../data/swanModels'
import PhotoUpload from '../components/PhotoUpload'
import PhotoGallery from '../components/PhotoGallery'
import './Issues.css'
import './IssueDetail.css'

export default function IssueDetail() {
  const { issueId } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [issue, setIssue] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyPhotos, setReplyPhotos] = useState([])
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'issues', issueId))
      if (snap.exists()) setIssue({ id: snap.id, ...snap.data() })
      const repliesSnap = await getDocs(
        query(collection(db, 'issues', issueId, 'replies'), orderBy('createdAt', 'asc'))
      )
      setReplies(repliesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [issueId])

  async function handleReply() {
    if (!replyText.trim() && !replyPhotos.length) return
    if (!user) return
    setPosting(true)
    const flagged = containsBadLanguage(replyText)
    const replyRef = await addDoc(collection(db, 'issues', issueId, 'replies'), {
      text: replyText, photos: replyPhotos, authorUid: user.uid, flagged,
      createdAt: serverTimestamp(),
    })
    setReplies(prev => [...prev, {
      id: replyRef.id, text: replyText, photos: replyPhotos,
      authorUid: user.uid, flagged, createdAt: { toMillis: () => Date.now() }
    }])
    setReplyText('')
    setReplyPhotos([])
    setPosting(false)
  }

  async function handleResolve() {
    await markIssueResolved(issueId, user.uid)
    setIssue(prev => ({ ...prev, resolved: true }))
  }

  async function handleDelete() {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return
    await deleteIssue(issueId)
    navigate('/issues')
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

  const canModify = user && (issue.authorUid === user.uid || isAdmin)

  return (
    <div className="issue-detail-page">
      <Link to="/issues" className="back-link">Back to Issues</Link>
      <div className="issue-detail-card">
        <div className="issue-detail-header">
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

        {canModify && (
          <div className="issue-actions">
            {!issue.resolved && (
              <button className="btn-resolve" onClick={handleResolve}>Mark as Resolved</button>
            )}
            <button className="btn-delete-issue" onClick={handleDelete}>Delete Issue</button>
          </div>
        )}
      </div>

      <div className="replies-section">
        <h2>Discussion ({replies.length})</h2>
        {replies.length === 0 && <p className="no-replies">No replies yet. Be the first to contribute.</p>}
        {replies.map(r => (
          <div key={r.id} className={"reply-card" + (r.flagged ? " flagged" : "")}>
            <p className="reply-text">{r.text}</p>
            <PhotoGallery photos={r.photos || []} />
            <span className="reply-time">{timeAgo(r.createdAt)}</span>
          </div>
        ))}
        {user ? (
          <div className="reply-form">
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              rows={3} placeholder="Add to the discussion..." className="reply-input" />
            <div className="reply-form-footer">
              <PhotoUpload
                storagePath={"issues/" + issueId + "/replies"}
                maxPhotos={3}
                existingPhotos={replyPhotos}
                onUploaded={newPhotos => setReplyPhotos(prev => [...prev, ...newPhotos])}
              />
              <button className="btn-post" onClick={handleReply}
                disabled={posting || (!replyText.trim() && !replyPhotos.length)}>
                {posting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
            {replyPhotos.length > 0 && (
              <PhotoGallery photos={replyPhotos}
                onCaptionChange={(idx, caption) => setReplyPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))}
                onRemove={idx => setReplyPhotos(prev => prev.filter((_, i) => i !== idx))}
              />
            )}
          </div>
        ) : (
          <p className="issues-notice"><Link to="/login">Sign in</Link> to join the discussion.</p>
        )}
      </div>
    </div>
  )
}