import { useState } from 'react'
import { SWAN_MODELS, SWAN_CATEGORIES } from '../data/swanModels'
import './Models.css'

export default function Models() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeModel, setActiveModel] = useState(null)

  const filtered = activeCategory === 'all' ? SWAN_MODELS : SWAN_MODELS.filter(m => m.category === activeCategory)
  const selected = activeModel ? SWAN_MODELS.find(m => m.id === activeModel) : null

  return (
    <div className="models-page">
      <div className="models-header">
        <h1>Swan Models</h1>
        <p className="models-subtitle">German Frers-designed Nautor's Swan yachts</p>
      </div>

      <div className="models-categories">
        {SWAN_CATEGORIES.map(c => (
          <button key={c.id} className={"cat-btn" + (activeCategory === c.id ? " active" : "")}
            onClick={() => { setActiveCategory(c.id); setActiveModel(null) }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="models-layout">
        <div className="models-list">
          {filtered.map(m => (
            <button key={m.id} className={"model-item" + (activeModel === m.id ? " active" : "")}
              onClick={() => setActiveModel(m.id)}>
              <span className="model-item-name">{m.name}</span>
              <span className="model-item-years">{m.yearFrom}-{m.yearTo || 'present'}</span>
            </button>
          ))}
        </div>

        <div className="model-detail">
          {selected ? (
            <>
              <div className="model-detail-header">
                <h2>{selected.name}</h2>
                <span className="model-detail-cat">{SWAN_CATEGORIES.find(c => c.id === selected.category)?.label}</span>
              </div>
              <div className="specs-grid">
                <div className="spec"><span className="spec-label">Length Overall</span><span className="spec-value">{selected.loa}m</span></div>
                <div className="spec"><span className="spec-label">Beam</span><span className="spec-value">{selected.beam}m</span></div>
                <div className="spec"><span className="spec-label">Displacement</span><span className="spec-value">{selected.displacement?.toLocaleString()}kg</span></div>
                <div className="spec"><span className="spec-label">Production</span><span className="spec-value">{selected.yearFrom}-{selected.yearTo || 'present'}</span></div>
              </div>
              <div className="model-links">
                <a href={"https://www.nautorswan.com"} target="_blank" rel="noopener noreferrer" className="model-link">
                  Nautor's Swan official site
                </a>
              </div>
              <p className="model-disclaimer">Specification data sourced from publicly available information only. Not affiliated with Nautor's Swan Oy.</p>
            </>
          ) : (
            <div className="model-placeholder">
              <p>Select a model to view specifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
