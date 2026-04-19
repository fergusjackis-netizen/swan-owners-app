import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getFleet } from '../services/firestore'
import { SWAN_MODELS, SWAN_CATEGORIES, YACHT_STATUS } from '../data/swanModels'
import './Fleet.css'

export default function Fleet() {
  const [yachts, setYachts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterFlag, setFilterFlag] = useState('')

  useEffect(() => {
    getFleet().then(data => {
      setYachts(data)
      setLoading(false)
    })
  }, [])

  const filtered = yachts.filter(y => {
    const matchSearch = !search ||
      y.name?.toLowerCase().includes(search.toLowerCase()) ||
      y.model?.toLowerCase().includes(search.toLowerCase()) ||
      y.homeMarina?.country?.toLowerCase().includes(search.toLowerCase())
    const matchModel = !filterModel || y.model === filterModel
    const matchFlag = !filterFlag || y.flag?.toUpperCase() === filterFlag.toUpperCase()
    const matchCategory = filterCategory === 'all' || (() => {
      const modelData = SWAN_MODELS.find(m => m.name === y.model)
      return modelData?.category === filterCategory
    })()
    return matchSearch && matchModel && matchFlag && matchCategory
  })

  function getStatusInfo(statusId) {
    return YACHT_STATUS.find(s => s.id === statusId) || YACHT_STATUS[1]
  }

  function clearFilters() {
    setSearch('')
    setFilterModel('')
    setFilterCategory('all')
    setFilterFlag('')
  }

  const hasFilters = search || filterModel || filterFlag || filterCategory !== 'all'

  return (
    <div className="fleet-page">
      <div className="fleet-header">
        <div>
          <h1>The Fleet</h1>
          <p className="fleet-subtitle">
            {loading ? 'Loading...' : yachts.length + ' yacht' + (yachts.length !== 1 ? 's' : '') + ' registered'}
          </p>
        </div>
        <Link to="/my-yacht" className="btn-register">Register Your Swan</Link>
      </div>

      <div className="fleet-filters">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name, model or country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <select className="filter-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterModel('') }}>
            {SWAN_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="filter-select" value={filterModel} onChange={e => setFilterModel(e.target.value)}>
            <option value="">All Models</option>
            {SWAN_MODELS.filter(m => filterCategory === 'all' || m.category === filterCategory).map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
          <input className="filter-select flag-input" type="text" placeholder="Flag e.g. GBR" value={filterFlag} onChange={e => setFilterFlag(e.target.value)} maxLength={3} />
          {hasFilters && <button className="btn-clear" onClick={clearFilters}>Clear filters</button>}
        </div>
      </div>

      {loading ? (
        <div className="fleet-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="fleet-empty">
          <p>{hasFilters ? 'No yachts match your filters.' : 'No yachts registered yet.'}</p>
          {hasFilters && <button className="btn-clear" onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : (
        <div className="fleet-grid">
          {filtered.map(yacht => {
            const status = getStatusInfo(yacht.currentStatus)
            const modelData = SWAN_MODELS.find(m => m.name === yacht.model)
            return (
              <Link key={yacht.id} to={'/fleet/' + yacht.id} className="yacht-card">
                <div className="yacht-card-top">
                  <div className="yacht-photo-placeholder">
                    <span>{yacht.name?.[0] || '?'}</span>
                  </div>
                  <div className="yacht-status-dot" style={{ background: status.color }} title={status.label} />
                </div>
                <div className="yacht-card-body">
                  <div className="yacht-name-row">
                    <h3 className="yacht-name">{yacht.name || 'Unnamed'}</h3>
                    <span className="yacht-flag">{yacht.flag || ''}</span>
                  </div>
                  <p className="yacht-model">{yacht.model || 'Unknown model'}</p>
                  <div className="yacht-meta">
                    {yacht.year && <span>{yacht.year}</span>}
                    {yacht.homeMarina?.country && <span>{yacht.homeMarina.country}</span>}
                    {modelData && <span>{modelData.loa}m</span>}
                  </div>
                  {yacht.notes && (
                    <p className="yacht-notes-preview">
                      {yacht.notes.length > 80 ? yacht.notes.substring(0, 80) + '...' : yacht.notes}
                    </p>
                  )}
                </div>
                <div className="yacht-card-footer">
                  <span className="yacht-status-label" style={{ color: status.color }}>{status.label}</span>
                  <span className="yacht-view">View ???</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
