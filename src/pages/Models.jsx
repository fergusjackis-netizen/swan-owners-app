import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { collection, getDocs } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { SWAN_MODELS, SWAN_CATEGORIES } from '../data/swanModels'
import './Models.css'

export default function Models() {
  const { user, isAdmin } = useAuth()
  const [fleetModels, setFleetModels] = useState([])
  const [activeModel, setActiveModel] = useState(null)
  const [modelDoc, setModelDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAddHeading, setShowAddHeading] = useState(false)
  const [showAddField, setShowAddField] = useState(null)
  const [newHeading, setNewHeading] = useState('')
  const [newField, setNewField] = useState({ label: '', value: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'yachts')).then(snap => {
      const models = [...new Set(snap.docs.map(d => d.data().model).filter(Boolean))].sort()
      setFleetModels(models)
      if (models.length > 0) setActiveModel(models[0])
    })
  }, [])

  useEffect(() => {
    if (!activeModel) return
    setLoading(true)
    setModelDoc(null)
    const unsub = onSnapshot(doc(db, 'models', activeModel), snap => {
      if (snap.exists()) setModelDoc(snap.data())
      else setModelDoc({ headings: [], rigging: [] })
      setLoading(false)
    })
    return unsub
  }, [activeModel])

  const selected = SWAN_MODELS.find(m => m.name === activeModel)

  async function saveModelDoc(updated) {
    await setDoc(doc(db, 'models', activeModel), updated, { merge: true })
  }

  async function handleAddHeading() {
    if (!newHeading.trim()) return
    setSaving(true)
    const headings = modelDoc?.headings || []
    const updated = {
      ...modelDoc,
      headings: [...headings, {
        id: Date.now().toString(),
        title: newHeading.trim(),
        fields: [],
        addedBy: user?.email,
        addedAt: new Date().toISOString(),
      }]
    }
    await saveModelDoc(updated)
    setNewHeading('')
    setShowAddHeading(false)
    setSaving(false)
  }

  async function handleAddField(headingId) {
    if (!newField.label.trim() || !newField.value.trim()) return
    setSaving(true)
    const headings = (modelDoc?.headings || []).map(h => {
      if (h.id !== headingId) return h
      return {
        ...h,
        fields: [...(h.fields || []), {
          id: Date.now().toString(),
          label: newField.label.trim(),
          value: newField.value.trim(),
          addedBy: user?.email,
          addedAt: new Date().toISOString(),
        }]
      }
    })
    await saveModelDoc({ ...modelDoc, headings })
    setNewField({ label: '', value: '' })
    setShowAddField(null)
    setSaving(false)
  }

  async function handleDeleteField(headingId, fieldId) {
    if (!isAdmin) return
    const headings = (modelDoc?.headings || []).map(h => {
      if (h.id !== headingId) return h
      return { ...h, fields: h.fields.filter(f => f.id !== fieldId) }
    })
    await saveModelDoc({ ...modelDoc, headings })
  }

  async function handleDeleteHeading(headingId) {
    if (!isAdmin) return
    if (!window.confirm('Delete this entire section and all its fields?')) return
    const headings = (modelDoc?.headings || []).filter(h => h.id !== headingId)
    await saveModelDoc({ ...modelDoc, headings })
  }

  return (
    <div className="models-page">
      <div className="models-header">
        <div>
          <h1>Swan Models</h1>
          <p className="models-subtitle">Community-built technical reference</p>
        </div>
      </div>

      {fleetModels.length === 0 ? (
        <div className="models-empty">
          <p>No models registered yet. Register your yacht in My Yacht to add your model here.</p>
        </div>
      ) : (
        <div className="models-layout">
          <div className="models-list">
            {fleetModels.map(m => (
              <button key={m}
                className={"model-item" + (activeModel === m ? " active" : "")}
                onClick={() => setActiveModel(m)}>
                <span className="model-item-name">{m}</span>
                {SWAN_MODELS.find(sm => sm.name === m) && (
                  <span className="model-item-years">{SWAN_MODELS.find(sm => sm.name === m).loa}m</span>
                )}
              </button>
            ))}
          </div>

          <div className="model-detail">
            {selected && (
              <div className="model-base-specs">
                <div className="model-detail-header">
                  <div>
                    <h2>{activeModel}</h2>
                    <span className="model-detail-cat">{SWAN_CATEGORIES.find(c => c.id === selected?.category)?.label}</span>
                  </div>
                </div>
                <div className="specs-grid">
                  {selected.loa && <div className="spec"><span className="spec-label">Length Overall</span><span className="spec-value">{selected.loa}m</span></div>}
                  {selected.beam && <div className="spec"><span className="spec-label">Beam</span><span className="spec-value">{selected.beam}m</span></div>}
                  {selected.displacement && <div className="spec"><span className="spec-label">Displacement</span><span className="spec-value">{selected.displacement?.toLocaleString()}kg</span></div>}
                  <div className="spec"><span className="spec-label">Production</span><span className="spec-value">{selected.yearFrom}-{selected.yearTo || 'present'}</span></div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="model-loading"><div className="spinner" /></div>
            ) : (
              <>
                {/* Rigging Tables */}
                {(modelDoc?.rigging || []).map(section => (
                  <div key={section.id} className="rigging-section">
                    <div className="rigging-section-header">
                      <div>
                        <h4>{section.title}</h4>
                        {section.source && <p className="rigging-source">Source: {section.source}</p>}
                      </div>
                    </div>
                    <div className="rigging-table-wrap">
                      <table className="rigging-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Part No.</th>
                            <th>Qty</th>
                            <th>Length (m)</th>
                            <th>Product</th>
                            <th>Diam (mm)</th>
                            <th>Hardware</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows?.basic && (
                            <>
                              <tr className="rigging-group-row"><td colSpan={7}>Basic Package</td></tr>
                              {section.rows.basic.map((row, i) => (
                                <tr key={i} className={!row.product ? 'rigging-empty-row' : ''}>
                                  <td className="rig-desc">{row.description}</td>
                                  <td>{row.partNo}</td>
                                  <td>{row.qty}</td>
                                  <td>{row.length}</td>
                                  <td>{row.product}</td>
                                  <td>{row.diameter}</td>
                                  <td className="rig-hardware">{row.hardware}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {section.rows?.optionals && (
                            <>
                              <tr className="rigging-group-row"><td colSpan={7}>Optional Extras</td></tr>
                              {section.rows.optionals.map((row, i) => (
                                <tr key={i} className={!row.product ? 'rigging-empty-row' : ''}>
                                  <td className="rig-desc">{row.description}</td>
                                  <td>{row.partNo}</td>
                                  <td>{row.qty}</td>
                                  <td>{row.length}</td>
                                  <td>{row.product}</td>
                                  <td>{row.diameter}</td>
                                  <td className="rig-hardware">{row.hardware}</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Community Knowledge Base */}
                <div className="model-community">
                  <div className="community-header">
                    <h3>Community Knowledge Base</h3>
                    {user && (
                      <button className="btn-add-heading" onClick={() => setShowAddHeading(true)}>
                        + Add Section
                      </button>
                    )}
                  </div>

                  {(!modelDoc?.headings || modelDoc.headings.length === 0) && (
                    <div className="model-no-fields">
                      <p>No community data yet for this model.</p>
                      {user && <p>Start building the knowledge base — add a section like "Engine", "Rigging", "Tanks" or anything useful.</p>}
                      {!user && <p><a href="/login">Sign in</a> to contribute.</p>}
                    </div>
                  )}

                  {(modelDoc?.headings || []).map(heading => (
                    <div key={heading.id} className="community-section">
                      <div className="community-section-header">
                        <h4>{heading.title}</h4>
                        <div className="section-actions">
                          {user && (
                            <button className="btn-add-field-inline"
                              onClick={() => { setShowAddField(heading.id); setNewField({ label: '', value: '' }) }}>
                              + Add field
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn-delete-section" onClick={() => handleDeleteHeading(heading.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="community-fields">
                        {(heading.fields || []).length === 0 && (
                          <p className="no-fields-yet">No fields yet. Add the first one.</p>
                        )}
                        {(heading.fields || []).map(field => (
                          <div key={field.id} className="community-field">
                            <span className="cf-label">{field.label}</span>
                            <span className="cf-value">{field.value}</span>
                            {isAdmin && (
                              <button className="cf-delete" onClick={() => handleDeleteField(heading.id, field.id)}>x</button>
                            )}
                          </div>
                        ))}
                      </div>

                      {showAddField === heading.id && (
                        <div className="add-field-inline">
                          <input className="af-input" value={newField.label}
                            onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                            placeholder="Label e.g. Engine oil capacity" />
                          <input className="af-input" value={newField.value}
                            onChange={e => setNewField(p => ({ ...p, value: e.target.value }))}
                            placeholder="Value e.g. 7 litres (Volvo D2-55)" />
                          <div className="af-inline-actions">
                            <button className="btn-af-save" onClick={() => handleAddField(heading.id)}
                              disabled={saving || !newField.label || !newField.value}>
                              {saving ? 'Saving...' : 'Add'}
                            </button>
                            <button className="btn-af-cancel" onClick={() => setShowAddField(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {showAddHeading && (
                    <div className="add-heading-form">
                      <input className="af-input" value={newHeading}
                        onChange={e => setNewHeading(e.target.value)}
                        placeholder="Section name e.g. Engine, Tanks, Electrics..." />
                      <div className="af-inline-actions">
                        <button className="btn-af-save" onClick={handleAddHeading}
                          disabled={saving || !newHeading.trim()}>
                          {saving ? 'Saving...' : 'Add Section'}
                        </button>
                        <button className="btn-af-cancel" onClick={() => setShowAddHeading(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {user && (modelDoc?.headings || []).length > 0 && !showAddHeading && (
                    <button className="btn-add-heading-bottom" onClick={() => setShowAddHeading(true)}>
                      + Add another section
                    </button>
                  )}
                </div>
              </>
            )}

            <p className="model-disclaimer">
              Community-contributed data. Not affiliated with Nautor's Swan Oy.
              Base specifications from publicly available sources.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
