import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getAllConversations } from '../services/firestore'
import './Admin.css'

export default function AdminConversations() {
  const { userProfile } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (userProfile?.role !== 'admin') return
    getAllConversations(200).then(c => {
      setConversations(c.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)))
      setLoading(false)
    })
  }, [userProfile])

  if (userProfile?.role !== 'admin') return <div className="admin-page"><p>Access denied.</p></div>

  const filtered = conversations.filter(c =>
    !filter || (c.summary||'').toLowerCase().includes(filter.toLowerCase()) ||
    (c.yachtModel||'').toLowerCase().includes(filter.toLowerCase())
  )

  // Group by model for insights
  const byModel = {}
  conversations.forEach(c => {
    const m = c.yachtModel || 'Unknown'
    if (!byModel[m]) byModel[m] = []
    byModel[m].push(c)
  })

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>SMART Log Conversations</h1>
        <p className="admin-subtitle">{conversations.length} conversations stored</p>
      </div>

      <div className="conv-insights">
        <h2>Fleet Insights</h2>
        <div className="conv-model-grid">
          {Object.entries(byModel).sort((a,b) => b[1].length - a[1].length).map(([model, convos]) => (
            <div key={model} className="conv-model-card">
              <span className="conv-model-name">{model}</span>
              <span className="conv-model-count">{convos.length} conversations</span>
            </div>
          ))}
        </div>
      </div>

      <div className="conv-list-section">
        <div className="conv-filter-row">
          <input
            className="conv-filter"
            placeholder="Filter by model or keyword..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {loading && <p>Loading...</p>}

        <div className="conv-list">
          {filtered.map(conv => (
            <div key={conv.id} className={"conv-item" + (selected?.id === conv.id ? " active" : "")}
              onClick={() => setSelected(selected?.id === conv.id ? null : conv)}>
              <div className="conv-item-header">
                <span className="conv-model-tag">{conv.yachtModel || 'Unknown'}</span>
                <span className="conv-date">{conv.createdAt?.seconds ? new Date(conv.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date'}</span>
              </div>
              <p className="conv-summary">{conv.summary || 'No summary'}</p>
              {selected?.id === conv.id && (
                <div className="conv-messages">
                  {(conv.messages || []).map((msg, i) => (
                    <div key={i} className={"conv-msg conv-msg-" + msg.role}>
                      <span className="conv-msg-role">{msg.role === 'user' ? 'Owner' : 'Claude'}</span>
                      <p className="conv-msg-text">{typeof msg.content === 'string' ? msg.content : msg.text || '[image/media]'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
