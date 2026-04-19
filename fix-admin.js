const fs = require('fs')

const files = {

'src/pages/Admin.jsx': `import { useState, useEffect } from 'react'
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
                <p className="admin-empty">No pending users — all clear.</p>
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
              <p className="admin-hint">These posts were automatically flagged for language. They are live — clear the flag to keep them or delete to remove.</p>
              {flaggedAll.length === 0 ? (
                <p className="admin-empty">No flagged content — all clear.</p>
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
                      <span>{p.yearFrom}–{p.yearTo || 'present'}</span>
                      <span className="role-tag">{p.category}</span>
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button
                      className="btn-approve"
                      onClick={async () => {
                        await approveModel(p.id, {
                          id: p.name.toLowerCase().replace(/\\s+/g, '-'),
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
`,

'src/pages/Admin.css': `
.admin-page {
  padding-bottom: 4rem;
  max-width: 900px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #1e3a5f;
}

.admin-header h1 {
  font-size: 2rem;
  color: #c9a84c;
  letter-spacing: 0.03em;
  margin-bottom: 0.25rem;
}

.admin-subtitle {
  font-size: 0.82rem;
  color: #6b8cae;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.btn-refresh {
  background: transparent;
  border: 1px solid #1e3a5f;
  color: #6b8cae;
  padding: 0.5rem 1.25rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-refresh:hover { border-color: #c9a84c; color: #c9a84c; }

.admin-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 2rem;
  border-bottom: 1px solid #1e3a5f;
}

.admin-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b8cae;
  padding: 0.75rem 1.5rem;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: -1px;
}

.admin-tab:hover { color: #e8e4d8; }

.admin-tab.active {
  color: #c9a84c;
  border-bottom-color: #c9a84c;
}

.tab-badge {
  background: #c9a84c;
  color: #0a0f1e;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.admin-loading {
  display: flex;
  justify-content: center;
  padding: 4rem;
}

.admin-section h2 {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6b8cae;
  margin-bottom: 0.5rem;
}

.admin-hint {
  font-size: 0.82rem;
  color: #3d5a78;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.admin-empty {
  font-size: 0.88rem;
  color: #3d5a78;
  padding: 2rem;
  text-align: center;
  background: #0d1629;
  border: 1px solid #1e3a5f;
}

.admin-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  background: #0d1629;
  border: 1px solid #1e3a5f;
  padding: 1.25rem;
  margin-bottom: 0.75rem;
}

.admin-card.flagged {
  border-left: 3px solid #ef4444;
}

.admin-card-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  min-width: 0;
}

.admin-card-name {
  font-size: 1rem;
  color: #e8e4d8;
}

.admin-card-email {
  font-size: 0.82rem;
  color: #6b8cae;
}

.admin-card-preview {
  font-size: 0.82rem;
  color: #6b8cae;
  line-height: 1.4;
}

.admin-card-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.78rem;
  color: #3d5a78;
  margin-top: 0.15rem;
}

.role-tag {
  background: #1e3a5f;
  color: #6b8cae;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
}

.type-tag {
  background: #2a1a1a;
  color: #ef4444;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  width: fit-content;
}

.admin-card-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-approve {
  background: transparent;
  border: 1px solid #22c55e;
  color: #22c55e;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-approve:hover { background: rgba(34,197,94,0.1); }

.btn-reject {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-reject:hover { background: rgba(239,68,68,0.1); }
`
}

Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Written: ' + filePath + ' (' + content.length + ' chars)')
})

console.log('All done!')
