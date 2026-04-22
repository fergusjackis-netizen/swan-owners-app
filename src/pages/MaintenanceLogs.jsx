import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import './MaintenanceLogs.css'

export default function MaintenanceLogs() {
  const { user, userProfile } = useAuth()
  const [assignedYachts, setAssignedYachts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    loadAssignedYachts()
  }, [user?.uid])

  async function loadAssignedYachts() {
    try {
      const { getDocs, collection } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const snap = await getDocs(collection(db, 'yachts'))
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const mine = all.filter(y => {
        if (y.id === user.uid) return true
        const crew = y.crew || {}
        return (
          (crew.linkedSkippers || []).includes(user.uid) ||
          (crew.linkedGardiennes || []).includes(user.uid)
        )
      })
      setAssignedYachts(mine)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function crewRole(yacht) {
    if (yacht.id === user.uid) return 'Owner'
    const crew = yacht.crew || {}
    if ((crew.linkedSkippers || []).includes(user.uid)) return 'Skipper'
    if ((crew.linkedGardiennes || []).includes(user.uid)) return 'Gardienne'
    return 'Crew'
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <h1>Maintenance Log{assignedYachts.length !== 1 ? 's' : ''}</h1>
        <p className="maintlogs-subtitle">
          {assignedYachts.length === 0
            ? 'No vessels assigned'
            : assignedYachts.length === 1
            ? '1 vessel assigned'
            : assignedYachts.length + ' vessels assigned'}
        </p>
      </div>

      {assignedYachts.length === 0 && (
        <div className="maintlogs-empty">
          <p>You are not currently linked as crew on any vessel.</p>
          <p>Ask the yacht owner to add you from their My Yacht page.</p>
        </div>
      )}

      {!selected && assignedYachts.length > 0 && (
        <div className="maintlogs-fleet">
          {assignedYachts.map(yacht => (
            <button key={yacht.id} className="maintlogs-card" onClick={() => setSelected(yacht)}>
              <div className="maintlogs-card-main">
                <span className="maintlogs-boat-name">{yacht.name || 'Unnamed vessel'}</span>
                <span className="maintlogs-model">{yacht.model || 'Unknown model'}</span>
                {yacht.homeMarina?.name && (
                  <span className="maintlogs-marina">{yacht.homeMarina.name}{yacht.homeMarina.country ? ', ' + yacht.homeMarina.country : ''}</span>
                )}
              </div>
              <div className="maintlogs-card-right">
                <span className="maintlogs-role">{crewRole(yacht)}</span>
                {yacht.flag && <span className="maintlogs-flag">{yacht.flag}</span>}
                <span className="maintlogs-arrow">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="maintlogs-detail">
          <button className="maintlogs-back" onClick={() => setSelected(null)}>
            ‹ Back to vessels
          </button>
          <div className="maintlogs-detail-header">
            <h2>{selected.name || 'Unnamed vessel'}</h2>
            <span className="maintlogs-detail-model">{selected.model}{selected.flag ? ' — ' + selected.flag : ''}</span>
          </div>
          <div className="log-holding">
            <div className="log-holding-lock">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="log-holding-soon">Coming soon</span>
            </div>
            <p className="log-holding-text">A private workspace for your yacht's crew team — owner, skippers and gardiennes together.</p>
            <p className="log-holding-text">Log ongoing issues, track repairs and share updates across your team. Run through routine checks — engine, rigging, safety equipment, bilges — and sign them off watch by watch.</p>
            <p className="log-holding-text">Issues logged here are automatically shared anonymously to the community Issues &amp; Fixes board, attributed only to your Swan model. If yours is the only vessel of that model registered, the issue will be held privately until a second vessel of the same model joins the community.</p>
            <p className="log-holding-restricted">Access is restricted to your linked crew only.</p>
          </div>
        </div>
      )}
    </div>
  )
}
