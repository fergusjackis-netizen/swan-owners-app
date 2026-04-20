import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc, collection, getDocs, orderBy, query, serverTimestamp, addDoc } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { containsBadLanguage } from '../data/swanModels'
import './Forum.css'
import './ForumTopic.css'

export default function ForumTopic() {
  const { topicId } = useParams()
  const { user } = useAuth()
  const [topic, setTopic] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'forum', topicId))
      if (snap.exists()) setTopic({ id: snap.id, ...snap.data() })
      const repliesSnap = await getDocs(query(collection(db, 'forum', topicId, 'replies'), orderBy('createdAt', 'asc')))
      setReplies(repliesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [topicId])

  async function handleReply() {
    if (!replyText.trim() || !user) return
    setPosting(true)
    const flagged = containsBadLanguage(replyText)
    const ref = await addDoc(collection(db, 'forum', topicId, 'replies'), {
      text: replyText, authorUid: user.uid, flagged, createdAt: serverTimestamp()
    })
    setReplies(prev => [...prev, { id: ref.id, text: replyText, authorUid: user.uid, flagged, createdAt: { toMillis: () => Date.now() } }])
    setReplyText('')
    setPosting(false)
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
  if (!topic) return <div className="topic-page"><p>Topic not found. <Link to="/forum">Back to forum</Link></p></div>

  return (
    <div className="topic-page">
      <Link to="/forum" className="back-link">Back to Forum</Link>
      <div className="topic-detail-card">
        <h1 className="topic-detail-title">{topic.title}</h1>
        <p className="topic-detail-time">{timeAgo(topic.createdAt)}</p>
        <p className="topic-detail-body">{topic.body}</p>
      </div>
      <div className="replies-section">
        <h2>Replies ({replies.length})</h2>
        {replies.length === 0 && <p className="no-replies">No replies yet. Be the first to respond.</p>}
        {replies.map(r => (
          <div key={r.id} className={"reply-card" + (r.flagged ? " flagged" : "")}>
            <p className="reply-text">{r.text}</p>
            <span className="reply-time">{timeAgo(r.createdAt)}</span>
          </div>
        ))}
        {user ? (
          <div className="reply-form">
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Add your reply..." className="reply-input" />
            <button className="btn-post" onClick={handleReply} disabled={posting || !replyText.trim()}>
              {posting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        ) : (
          <p className="issues-notice"><Link to="/login">Sign in</Link> to reply.</p>
        )}
      </div>
    </div>
  )
}
