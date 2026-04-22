import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { SWAN_MODELS, SWAN_CATEGORIES } from '../data/swanModels'
import './Models.css'

const FIELD_GROUPS = [
  'Engine & Mechanical',
  'Fuel & Tanks',
  'Rigging & Sails',
  'Electrical',
  'Plumbing & Water',
  'Deck & Hardware',
  'General',
]

export default function Models() {
  const { user, isAdmin } = useAuth()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeModel, setActiveModel] = useState(null)
  const [modelData, setModelData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState({ group: 'Engine & Mechanical', label: '', value: '' })
  const [saving, setSaving] = useState(false)

  const filtered = activeCategory === 'all'
    ? SWAN_MODELS
    : SWAN_MODELS.filter(m => m.category === activeCategory)

  const selected = activeModel ? SWAN_MODELS.find(m => m.id === activeModel) : null

  useEffect(() => {
    if (!activeModel) return
    setLoading(true)
    setModelData(null)
    getDoc(doc(db, 'models', activeModel)).then(snap => {
      if (snap.exists()) setModelData(snap.data())
      else setModelData({ fields: [] })
      setLoading(false)
    }).catch(() => {
      setModelData({ fields: [] })
      setLoading(false)
    })
  }, [activeModel])

  async function handleAddField() {
    if (!newField.label || !newField.value) return
    setSaving(true)
    const field = {
      group: newField.group,
      label: newField.label,
      value: newField.value,
      addedBy: user?.email || 'unknown',
      addedAt: new Date().toISOString(),
    }
    const ref = doc(db, 'models', activeModel)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { fields: arrayUnion(field) })
    } else {
      await setDoc(ref, { modelId: activeModel, fields: [field] })
    }
    setModelData(prev => ({ ...prev, fields: [...(prev?.fields || []), field] }))
    setNewField({ group: 'Engine & Mechanical', label: '', value: '' })
    setShowAddField(false)
    setSaving(false)
  }

  async function handleDeleteField(idx) {
    if (!isAdmin) return
    const updated = (modelData?.fields || []).filter((_, i) => i !== idx)
    await setDoc(doc(db, 'models', activeModel), { ...modelData, fields: updated })
    setModelData(prev => ({ ...prev, fields: updated }))
  }

  const groupedFields = (modelData?.fields || []).reduce((acc, f, idx) => {
    const g = f.group || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push({ ...f, idx })
    return acc
  }, {})

  return (
    <div className="models-page">
      <div className="models-header">
        <h1>Swan Models</h1>
        <p className="models-subtitle">German Frers-designed Nautor's Swan yachts</p>
      </div>

      <div className="models-categories">
        {[{ id: 'all', label: 'All Models' }, ...SWAN_CATEGORIES].map(c => (
          <button key={c.id}
            className={"cat-btn" + (activeCategory === c.id ? " active" : "")}
            onClick={() => { setActiveCategory(c.id); setActiveModel(null) }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="models-layout">
        <div className="models-list">
          {filtered.map(m => (
            <button key={m.id}
              className={"model-item" + (activeModel === m.id ? " active" : "")}
              onClick={() => setActiveModel(m.id)}>
              <span className="model-item-name">{m.name}</span>
              <span className="model-item-years">{m.yearFrom}-{m.yearTo || 'present'}</span>
            </button>
          ))}
        </div>

        <div className="model-detail">
          {!selected ? (
            <div className="model-placeholder"><p>Select a model to view specifications</p></div>
          ) : (
            <>
              <div className="model-detail-header">
                <div>
                  <h2>{selected.name}</h2>
                  <span className="model-detail-cat">{SWAN_CATEGORIES.find(c => c.id === selected.category)?.label}</span>
                </div>
                {user && (
                  <button className="btn-add-field" onClick={() => setShowAddField(true)}>
                    Add Field
                  </button>
                )}
              </div>

              <div className="specs-grid">
                {selected.loa && <div className="spec"><span className="spec-label">Length Overall</span><span className="spec-value">{selected.loa}m</span></div>}
                {selected.beam && <div className="spec"><span className="spec-label">Beam</span><span className="spec-value">{selected.beam}m</span></div>}
                {selected.displacement && <div className="spec"><span className="spec-label">Displacement</span><span className="spec-value">{selected.displacement?.toLocaleString()}kg</span></div>}
                <div className="spec"><span className="spec-label">Production</span><span className="spec-value">{selected.yearFrom}-{selected.yearTo || 'present'}</span></div>
              </div>

              {loading && <div className="model-loading"><div className="spinner" /></div>}

              {!loading && Object.keys(groupedFields).length > 0 && (
                <div className="model-community-fields">
                  <h3 className="community-fields-title">Community Specifications</h3>
                  {FIELD_GROUPS.filter(g => groupedFields[g]).map(group => (
                    <div key={group} className="field-group">
                      <h4 className="field-group-title">{group}</h4>
                      {groupedFields[group].map(f => (
                        <div key={f.idx} className="community-field">
                          <span className="cf-label">{f.label}</span>
                          <span className="cf-value">{f.value}</span>
                          {isAdmin && (
                            <button className="cf-delete" onClick={() => handleDeleteField(f.idx)}>x</button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {!loading && Object.keys(groupedFields).length === 0 && (
                <div className="model-no-fields">
                  <p>No community specifications yet for this model.</p>
                  {user && <p>Be the first to add details like engine oil capacity, tank sizes, cordage lengths and more.</p>}
                </div>
              )}

              <p className="model-disclaimer">Base specification data from publicly available sources. Community fields added by members.</p>

              {showAddField && (
                <div className="add-field-modal-overlay" onClick={() => setShowAddField(false)}>
                  <div className="add-field-modal" onClick={e => e.stopPropagation()}>
                    <h3>Add Specification</h3>
                    <p className="add-field-hint">Add a field for the {selected.name}. Other members can see and use this information.</p>
                    <label className="af-field">
                      <span>Group</span>
                      <select value={newField.group} onChange={e => setNewField(p => ({ ...p, group: e.target.value }))}>
                        {FIELD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>
                    <label className="af-field">
                      <span>Label</span>
                      <input value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                        placeholder="e.g. Engine oil capacity" />
                    </label>
                    <label className="af-field">
                      <span>Value</span>
                      <input value={newField.value} onChange={e => setNewField(p => ({ ...p, value: e.target.value }))}
                        placeholder="e.g. 7 litres (Volvo D2-55)" />
                    </label>
                    <div className="af-actions">
                      <button className="btn-af-save" onClick={handleAddField} disabled={saving || !newField.label || !newField.value}>
                        {saving ? 'Saving...' : 'Add Field'}
                      </button>
                      <button className="btn-af-cancel" onClick={() => setShowAddField(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
