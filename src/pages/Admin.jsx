import { useState, useEffect } from 'react'
import {
  getPendingUsers, approveUser, suspendUser,
  getFlaggedContent, clearFlag, deleteContent,
  getPendingModelProposals, approveModel
} from '../services/firestore'
import './Admin.css'

export default function Admin() {
  const [tab, setTab] = useState('users')
  const [pendingUsers, setPendingUsers] = useState([])
  const [flagged, setFlagged] = useState({ issues: [], forum: [], messages: [] })
  const [modelProposals, setModelProposals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [users, flags, models] = await Promise.all([
      getPendingUsers(),
      getFlaggedContent(),
      getPendingModelProposals(),
    ])
    setPendingUsers(users)
    setFlagged(flags)
    setModelProposals(models)
    setLoading(false)
  }

  const flaggedAll = [...(flagged.issues || []), ...(flagged.forum || [])]
  const totalAlerts = pendingUsers.length + flaggedAll.length + modelProposals.length

  const tabs = [
    { id: 'users', label: 'Pending Users', count: pendingUsers.length },
    { id: 'flagged', label: 'Flagged Content', count: flaggedAll.length },
    { id: 'models', label: 'Model Proposals', count: modelProposals.length },
  ]

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Admin Panel</h1>
          <p className="admin-subtitle">
            {totalAlerts > 0 ? totalAlerts + ' item' + (totalAlerts !== 1 ? 's' : '') + ' need attention' : 'All clear'}
          </p>
        </div>
        <button className="btn-refresh" onClick={loadAll}>Refresh</button>
      </div>

      <div className="admin-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={"admin-tab" + (tab === t.id ? " active" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count > 0 && <span className="tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading"><div className="spinner" /></div>
      ) : (
        <div className="admin-content">

          {tab === 'users' && (
            <div className="admin-section">
              <h2>Pending Registrations</h2>
              {pendingUsers.length === 0 ? (
                <p className="admin-empty">No pending users  -  all clear.</p>
              ) : pendingUsers.map(u => (
                <div key={u.id} className="admin-card">
                  <div className="admin-card-info">
                    <strong className="admin-card-name">{u.name}</strong>
                    <span className="admin-card-email">{u.email}</span>
                    <div className="admin-card-meta">
                      <span className="role-tag">{u.role}</span>
                      <span>{u.nationality}</span>
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button
                      className="btn-approve"
                      onClick={async () => {
                        await approveUser(u.id)
                        setPendingUsers(prev => prev.filter(x => x.id !== u.id))
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={async () => {
                        await suspendUser(u.id)
                        setPendingUsers(prev => prev.filter(x => x.id !== u.id))
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'flagged' && (
            <div className="admin-section">
              <h2>Flagged Content</h2>
              <p className="admin-hint">These posts were automatically flagged for language. They are live  -  clear the flag to keep them or delete to remove.</p>
              {flaggedAll.length === 0 ? (
                <p className="admin-empty">No flagged content  -  all clear.</p>
              ) : flaggedAll.map(item => (
                <div key={item.id} className="admin-card flagged">
                  <div className="admin-card-info">
                    <span className="type-tag">{item.type}</span>
                    <strong className="admin-card-name">{item.title || item.text?.substring(0, 100)}</strong>
                    {item.description && (
                      <p className="admin-card-preview">{item.description.substring(0, 120)}...</p>
                    )}
                  </div>
                  <div className="admin-card-actions">
                    <button
                      className="btn-approve"
                      onClick={async () => {
                        await clearFlag(item.type === 'issue' ? 'issues' : 'forum', item.id)
                        loadAll()
                      }}
                    >
                      Clear Flag
                    </button>
                    <button
                      className="btn-reject"
                      onClick={async () => {
                        await deleteContent(item.type === 'issue' ? 'issues' : 'forum', item.id)
                        loadAll()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'models' && (
            <div className="admin-section">
              <h2>Proposed New Models</h2>
              <p className="admin-hint">Members have proposed these Swan models to be added to the site.</p>
              {modelProposals.length === 0 ? (
                <p className="admin-empty">No pending model proposals.</p>
              ) : modelProposals.map(p => (
                <div key={p.id} className="admin-card">
                  <div className="admin-card-info">
                    <strong className="admin-card-name">{p.name}</strong>
                    <div className="admin-card-meta">
                      {p.loa && <span>LOA: {p.loa}m</span>}
                      <span>{p.yearFrom} - {p.yearTo || 'present'}</span>
                      <span className="role-tag">{p.category}</span>
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button
                      className="btn-approve"
                      onClick={async () => {
                        await approveModel(p.id, {
                          id: p.name.toLowerCase().replace(/\s+/g, '-'),
                          name: p.name,
                          loa: parseFloat(p.loa) || 0,
                          beam: 0,
                          displacement: 0,
                          yearFrom: parseInt(p.yearFrom) || 2000,
                          yearTo: p.yearTo ? parseInt(p.yearTo) : null,
                          category: p.category,
                        })
                        setModelProposals(prev => prev.filter(x => x.id !== p.id))
                      }}
                    >
                      Add to Site
                    </button>
                    <button
                      className="btn-reject"
                      onClick={async () => {
                        await deleteContent('modelProposals', p.id)
                        setModelProposals(prev => prev.filter(x => x.id !== p.id))
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
