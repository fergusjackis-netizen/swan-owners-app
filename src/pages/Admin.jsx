import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { sendApprovalEmail } from '../services/email'
import './Admin.css'

export default function Admin() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [yachts, setYachts] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [flagged, setFlagged] = useState([])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [usersSnap, yachtsSnap, issuesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'yachts')),
      getDocs(collection(db, 'issues')),
    ])

    const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setUsers(usersData)

    const yachtsMap = {}
    yachtsSnap.docs.forEach(d => { yachtsMap[d.id] = d.data() })
    setYachts(yachtsMap)

    const flaggedItems = issuesSnap.docs
      .filter(d => d.data().flagged)
      .map(d => ({ id: d.id, type: 'issue', ...d.data() }))
    setFlagged(flaggedItems)

    setLoading(false)
  }

  async function handleApprove(uid) {
    const u = users.find(x => x.id === uid)
    await updateDoc(doc(db, 'users', uid), { status: 'approved' })
    setUsers(prev => prev.map(x => x.id === uid ? { ...x, status: 'approved' } : x))
    try {
      await sendApprovalEmail({ to: u.email, toName: u.name })
    } catch (e) { console.log('Email failed:', e) }
  }

  async function handleReject(uid) {
    if (!window.confirm('Reject and delete this user?')) return
    await deleteDoc(doc(db, 'users', uid))
    setUsers(prev => prev.filter(x => x.id !== uid))
  }

  async function handleClearFlag(issueId) {
    await updateDoc(doc(db, 'issues', issueId), { flagged: false })
    setFlagged(prev => prev.filter(x => x.id !== issueId))
  }

  async function handleDeleteFlagged(issueId) {
    if (!window.confirm('Delete this flagged issue?')) return
    await deleteDoc(doc(db, 'issues', issueId))
    setFlagged(prev => prev.filter(x => x.id !== issueId))
  }

  const pending = users.filter(u => u.status === 'pending')
  const approved = users.filter(u => u.status === 'approved')

  const filtered = filter === 'all' ? users
    : filter === 'pending' ? pending
    : filter === 'approved' ? approved
    : users.filter(u => u.role === filter)

  function getRoleLabel(role) {
    const labels = { owner: 'Owner', skipper: 'Skipper', gardienne: 'Gardienne', enthusiast: 'Enthusiast', admin: 'Admin' }
    return labels[role] || role
  }

  function getYachtInfo(uid) {
    const yacht = yachts[uid]
    if (!yacht) return null
    return yacht.name ? yacht.name + (yacht.model ? ' - ' + yacht.model : '') : null
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-stats">
          <span className="stat-pill">{users.length} total members</span>
          {pending.length > 0 && <span className="stat-pill pending">{pending.length} pending</span>}
          {flagged.length > 0 && <span className="stat-pill flagged">{flagged.length} flagged</span>}
        </div>
      </div>

      {pending.length > 0 && (
        <section className="admin-section">
          <h2>Pending Approval</h2>
          {pending.map(u => (
            <div key={u.id} className="admin-card pending-card">
              <div className="admin-card-info">
                <strong>{u.name}</strong>
                <span>{u.email}</span>
                <span className="role-tag">{getRoleLabel(u.role)}</span>
                {u.nationality && <span>{u.nationality}</span>}
                {u.yachtName && <span>Yacht: {u.yachtName}</span>}
                {u.basedAt && <span>Based: {u.basedAt}</span>}
              </div>
              <div className="admin-card-actions">
                <button className="btn-approve" onClick={() => handleApprove(u.id)}>Approve</button>
                <button className="btn-reject" onClick={() => handleReject(u.id)}>Reject</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="admin-section">
        <div className="section-header-row">
          <h2>All Members</h2>
          <div className="admin-filters">
            {['all', 'pending', 'approved', 'owner', 'skipper', 'gardienne', 'enthusiast'].map(f => (
              <button key={f} className={"admin-filter" + (filter === f ? " active" : "")}
                onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : getRoleLabel(f)}
              </button>
            ))}
          </div>
        </div>

        <div className="members-table">
          <div className="members-table-header">
            <span>Name</span>
            <span>Role</span>
            <span>Yacht / Info</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {filtered.map(u => (
            <div key={u.id} className="members-table-row">
              <div className="member-name-cell">
                <strong>{u.name}</strong>
                <span className="member-email">{u.email}</span>
              </div>
              <span className={"role-badge role-" + u.role}>{getRoleLabel(u.role)}</span>
              <span className="member-yacht">
                {getYachtInfo(u.id) || u.yachtName || u.basedAt || '-'}
              </span>
              <span className={"status-badge status-" + u.status}>{u.status}</span>
              <div className="member-actions">
                {u.status === 'pending' && (
                  <>
                    <button className="btn-approve-sm" onClick={() => handleApprove(u.id)}>Approve</button>
                    <button className="btn-reject-sm" onClick={() => handleReject(u.id)}>Reject</button>
                  </>
                )}
                {u.status === 'approved' && u.id !== user.uid && (
                  <button className="btn-reject-sm" onClick={() => handleReject(u.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {flagged.length > 0 && (
        <section className="admin-section">
          <h2>Flagged Content</h2>
          {flagged.map(item => (
            <div key={item.id} className="admin-card flagged-card">
              <div className="admin-card-info">
                <strong>{item.title || 'Untitled'}</strong>
                <span>{item.description?.substring(0, 100)}...</span>
              </div>
              <div className="admin-card-actions">
                <button className="btn-clear" onClick={() => handleClearFlag(item.id)}>Clear Flag</button>
                <button className="btn-reject" onClick={() => handleDeleteFlagged(item.id)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
