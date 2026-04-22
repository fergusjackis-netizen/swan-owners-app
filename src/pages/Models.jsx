import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getModelData, saveModelData, getAllModels
} from '../services/firestore'
import { SWAN_MODELS } from '../data/swanModels'
import './Models.css'

const newId = () => Math.random().toString(36).slice(2, 10)

export default function Models() {
  const { userProfile, isAdmin } = useAuth()
  const approved = userProfile?.status === 'approved'

  const [allModels, setAllModels] = useState([])   // models with Firestore data
  const [fleetModels, setFleetModels] = useState([]) // models from yachts collection
  const [selected, setSelected] = useState(null)
  const [modelData, setModelData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create / copy modal state
  const [showCreate, setShowCreate] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit states
  const [editingField, setEditingField] = useState(null)   // {sectionId, fieldId}
  const [editingRow, setEditingRow] = useState(null)        // {tableId, rowType, rowId}
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [addingField, setAddingField] = useState(null)      // sectionId
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')

  useEffect(() => {
    loadAllModels()
  }, [])

  async function loadAllModels() {
    try {
      const [firestoreModels, fleetList] = await Promise.all([
        getAllModels(),
        getFleetModelNames()
      ])
      setAllModels(firestoreModels)
      setFleetModels(fleetList)
    } catch (e) {
      console.error(e)
    }
  }

  async function getFleetModelNames() {
    try {
      const { getDocs, collection } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const snap = await getDocs(collection(db, 'yachts'))
      const names = new Set()
      snap.forEach(d => { if (d.data().model) names.add(d.data().model) })
      return Array.from(names)
    } catch { return [] }
  }

  async function selectModel(name) {
    setSelected(name)
    setModelData(null)
    setLoading(true)
    try {
      const data = await getModelData(name)
      setModelData(data || { modelId: name, headings: [], rigging: [] })
    } catch (e) {
      setModelData({ modelId: name, headings: [], rigging: [] })
    }
    setLoading(false)
  }

  async function createModel() {
    if (!newModelName.trim()) return
    setCreating(true)
    try {
      let base = { modelId: newModelName.trim(), headings: [], rigging: [] }
      if (copyFrom) {
        const src = await getModelData(copyFrom)
        if (src) {
          base.headings = (src.headings || []).map(s => ({
            ...s,
            id: newId(),
            fields: (s.fields || []).map(f => ({
              ...f,
              id: newId(),
              addedBy: userProfile?.name || 'Unknown',
              addedAt: new Date().toISOString(),
              copiedFrom: copyFrom
            })),
            addedBy: userProfile?.name || 'Unknown',
            addedAt: new Date().toISOString(),
            copiedFrom: copyFrom
          }))
          base.rigging = (src.rigging || []).map(t => ({
            ...t,
            id: newId(),
            addedBy: userProfile?.name || 'Unknown',
            addedAt: new Date().toISOString(),
            copiedFrom: copyFrom,
            source: 'Copied from ' + copyFrom + ' — please verify values',
            rows: {
              basic: (t.rows?.basic || []).map(r => ({ ...r, id: newId() })),
              optionals: (t.rows?.optionals || []).map(r => ({ ...r, id: newId() }))
            }
          }))
        }
      }
      await saveModelData(newModelName.trim(), base)
      await loadAllModels()
      setShowCreate(false)
      setNewModelName('')
      setCopyFrom('')
      selectModel(newModelName.trim())
    } catch (e) {
      alert('Error creating model: ' + e.message)
    }
    setCreating(false)
  }

  async function save(data) {
    if (!selected) return
    setSaving(true)
    try {
      await saveModelData(selected, data)
      setModelData(data)
      await loadAllModels()
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  // --- Knowledge base operations ---

  function addSection() {
    if (!newSectionTitle.trim()) return
    const updated = {
      ...modelData,
      headings: [...(modelData.headings || []), {
        id: newId(),
        title: newSectionTitle.trim(),
        fields: [],
        addedBy: userProfile?.name || 'Unknown',
        addedAt: new Date().toISOString()
      }]
    }
    save(updated)
    setAddingSection(false)
    setNewSectionTitle('')
  }

  function deleteSection(sectionId) {
    if (!confirm('Delete this section and all its fields?')) return
    save({ ...modelData, headings: modelData.headings.filter(s => s.id !== sectionId) })
  }

  function addField(sectionId) {
    if (!newFieldLabel.trim()) return
    const updated = {
      ...modelData,
      headings: modelData.headings.map(s => s.id !== sectionId ? s : {
        ...s,
        fields: [...(s.fields || []), {
          id: newId(),
          label: newFieldLabel.trim(),
          value: newFieldValue.trim(),
          addedBy: userProfile?.name || 'Unknown',
          addedAt: new Date().toISOString()
        }]
      })
    }
    save(updated)
    setAddingField(null)
    setNewFieldLabel('')
    setNewFieldValue('')
  }

  function saveField(sectionId, fieldId, label, value) {
    const updated = {
      ...modelData,
      headings: modelData.headings.map(s => s.id !== sectionId ? s : {
        ...s,
        fields: s.fields.map(f => f.id !== fieldId ? f : { ...f, label, value })
      })
    }
    save(updated)
    setEditingField(null)
  }

  function deleteField(sectionId, fieldId) {
    if (!confirm('Delete this field?')) return
    const updated = {
      ...modelData,
      headings: modelData.headings.map(s => s.id !== sectionId ? s : {
        ...s,
        fields: s.fields.filter(f => f.id !== fieldId)
      })
    }
    save(updated)
  }

  // --- Rigging table operations ---

  function saveRow(tableId, rowType, rowId, rowData) {
    const updated = {
      ...modelData,
      rigging: modelData.rigging.map(t => t.id !== tableId ? t : {
        ...t,
        rows: {
          ...t.rows,
          [rowType]: (t.rows?.[rowType] || []).map(r => r.id !== rowId ? r : { ...r, ...rowData })
        }
      })
    }
    save(updated)
    setEditingRow(null)
  }

  function deleteRow(tableId, rowType, rowId) {
    if (!confirm('Delete this row?')) return
    const updated = {
      ...modelData,
      rigging: modelData.rigging.map(t => t.id !== tableId ? t : {
        ...t,
        rows: {
          ...t.rows,
          [rowType]: (t.rows?.[rowType] || []).filter(r => r.id !== rowId)
        }
      })
    }
    save(updated)
  }

  function addRiggingRow(tableId, rowType) {
    const updated = {
      ...modelData,
      rigging: modelData.rigging.map(t => t.id !== tableId ? t : {
        ...t,
        rows: {
          ...t.rows,
          [rowType]: [...(t.rows?.[rowType] || []), {
            id: newId(),
            description: '',
            partNo: '',
            qty: '',
            length: '',
            product: '',
            diameter: '',
            hardware: ''
          }]
        }
      })
    }
    save(updated)
  }

  // Build full model list: SWAN_MODELS + any custom ones in Firestore not already in list
  const swanModelNames = SWAN_MODELS.map(m => typeof m === 'string' ? m : m.name || m)
  const firestoreOnlyNames = allModels
    .map(m => m.id || m.modelId || m)
    .filter(n => !swanModelNames.includes(n))
  const displayModels = [...swanModelNames, ...firestoreOnlyNames]

  const hasData = (name) => allModels.some(m => (m.id || m.modelId || m) === name)
  const inFleet = (name) => fleetModels.includes(name)

  return (
    <div className="models-page">
      <div className="models-sidebar">
        <div className="models-sidebar-header">
          <h2>Swan Models</h2>
          {approved && (
            <button className="btn-add-model" onClick={() => setShowCreate(true)}>
              + Add Model
            </button>
          )}
        </div>

        <div className="models-list">
          {displayModels.map(name => (
            <button
              key={name}
              className={'model-item' + (selected === name ? ' active' : '')}
              onClick={() => selectModel(name)}
            >
              <span className="model-name">{name}</span>
              <span className="model-badges">
                {inFleet(name) && <span className="badge badge-fleet">In fleet</span>}
                {hasData(name) && <span className="badge badge-data">Has data</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="models-content">
        {!selected && (
          <div className="models-empty">
            <p>Select a model to view community knowledge</p>
          </div>
        )}

        {selected && loading && <div className="models-loading">Loading...</div>}

        {selected && !loading && modelData && (
          <div className="model-detail">
            <div className="model-detail-header">
              <h1>{selected}</h1>
              {saving && <span className="saving-indicator">Saving...</span>}
            </div>

            {/* Knowledge Base Sections */}
            <div className="model-section">
              <div className="section-header">
                <h2>Community Knowledge Base</h2>
                {approved && !addingSection && (
                  <button className="btn-add-section" onClick={() => setAddingSection(true)}>
                    + Add Section
                  </button>
                )}
              </div>

              {addingSection && (
                <div className="add-section-form">
                  <input
                    placeholder="Section title (e.g. Dimensions, Engine, Sails)"
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSection()}
                    autoFocus
                  />
                  <button onClick={addSection}>Add</button>
                  <button onClick={() => { setAddingSection(false); setNewSectionTitle('') }}>Cancel</button>
                </div>
              )}

              {(!modelData.headings || modelData.headings.length === 0) && !addingSection && (
                <p className="no-data">No knowledge base entries yet.{approved ? ' Be the first to add one.' : ''}</p>
              )}

              {(modelData.headings || []).map(section => (
                <div key={section.id} className="kb-section">
                  <div className="kb-section-header">
                    <h3>{section.title}</h3>
                    {section.copiedFrom && (
                      <span className="copied-notice">Copied from {section.copiedFrom} — please verify</span>
                    )}
                    <div className="kb-section-actions">
                      {approved && (
                        <button className="btn-add-field" onClick={() => { setAddingField(section.id); setNewFieldLabel(''); setNewFieldValue('') }}>
                          + Field
                        </button>
                      )}
                      {(isAdmin || section.addedBy === userProfile?.name) && (
                        <button className="btn-delete-section" onClick={() => deleteSection(section.id)}>
                          Delete section
                        </button>
                      )}
                    </div>
                  </div>

                  <table className="kb-table">
                    <tbody>
                      {(section.fields || []).map(field => (
                        <tr key={field.id}>
                          {editingField?.sectionId === section.id && editingField?.fieldId === field.id ? (
                            <EditFieldRow
                              field={field}
                              onSave={(l, v) => saveField(section.id, field.id, l, v)}
                              onCancel={() => setEditingField(null)}
                            />
                          ) : (
                            <>
                              <td className="kb-label">{field.label}</td>
                              <td className="kb-value">{field.value}</td>
                              <td className="kb-actions">
                                {(isAdmin || field.addedBy === userProfile?.name) && (
                                  <>
                                    <button onClick={() => setEditingField({ sectionId: section.id, fieldId: field.id })}>Edit</button>
                                    <button onClick={() => deleteField(section.id, field.id)}>x</button>
                                  </>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {addingField === section.id && (
                        <tr>
                          <td>
                            <input
                              placeholder="Label"
                              value={newFieldLabel}
                              onChange={e => setNewFieldLabel(e.target.value)}
                              autoFocus
                            />
                          </td>
                          <td>
                            <input
                              placeholder="Value"
                              value={newFieldValue}
                              onChange={e => setNewFieldValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addField(section.id)}
                            />
                          </td>
                          <td>
                            <button onClick={() => addField(section.id)}>Save</button>
                            <button onClick={() => setAddingField(null)}>Cancel</button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Rigging Tables */}
            {(modelData.rigging || []).length > 0 && (
              <div className="model-section">
                <h2>Rigging Data</h2>
                {modelData.rigging.map(table => (
                  <div key={table.id} className="rigging-section">
                    <div className="rigging-section-header">
                      <h3>{table.title}</h3>
                      {table.copiedFrom && (
                        <span className="copied-notice">Copied from {table.copiedFrom} — please verify values</span>
                      )}
                      {table.source && !table.copiedFrom && (
                        <span className="rigging-source">Source: {table.source}</span>
                      )}
                    </div>

                    {['basic', 'optionals'].map(rowType => (
                      <div key={rowType} className="rigging-subsection">
                        <div className="rigging-subsection-header">
                          <h4>{rowType === 'basic' ? 'Standing & Running Rigging' : 'Optional Equipment'}</h4>
                          {approved && (
                            <button className="btn-add-row" onClick={() => addRiggingRow(table.id, rowType)}>
                              + Row
                            </button>
                          )}
                        </div>
                        {(table.rows?.[rowType] || []).length > 0 && (
                          <div className="rigging-table-wrap">
                            <table className="rigging-table">
                              <thead>
                                <tr>
                                  <th>Description</th>
                                  <th>Part No</th>
                                  <th>Qty</th>
                                  <th>Length</th>
                                  <th>Product</th>
                                  <th>Diameter</th>
                                  <th>Hardware</th>
                                  {approved && <th></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {(table.rows?.[rowType] || []).map(row => (
                                  <tr key={row.id}>
                                    {editingRow?.tableId === table.id && editingRow?.rowType === rowType && editingRow?.rowId === row.id ? (
                                      <EditRiggingRow
                                        row={row}
                                        onSave={(data) => saveRow(table.id, rowType, row.id, data)}
                                        onCancel={() => setEditingRow(null)}
                                      />
                                    ) : (
                                      <>
                                        <td>{row.description}</td>
                                        <td>{row.partNo}</td>
                                        <td>{row.qty}</td>
                                        <td>{row.length}</td>
                                        <td>{row.product}</td>
                                        <td>{row.diameter}</td>
                                        <td>{row.hardware}</td>
                                        {approved && (
                                          <td className="row-actions">
                                            <button onClick={() => setEditingRow({ tableId: table.id, rowType, rowId: row.id })}>Edit</button>
                                            {(isAdmin || table.addedBy === userProfile?.name) && (
                                              <button onClick={() => deleteRow(table.id, rowType, row.id)}>x</button>
                                            )}
                                          </td>
                                        )}
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {(table.rows?.[rowType] || []).length === 0 && (
                          <p className="no-data">No {rowType} rows yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Copy Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>Add Model</h2>
            <div className="form-row">
              <label>Model name</label>
              <input
                placeholder="e.g. Swan 51, Swan 68 Mk2"
                value={newModelName}
                onChange={e => setNewModelName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-row">
              <label>Copy data from (optional)</label>
              <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
                <option value="">Start blank</option>
                {allModels.map(m => {
                  const name = m.id || m.modelId || m
                  return <option key={name} value={name}>{name}</option>
                })}
              </select>
              {copyFrom && (
                <p className="copy-note">
                  All rigging tables and knowledge base sections from {copyFrom} will be copied across.
                  You can edit or delete any field after copying.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={createModel} disabled={creating || !newModelName.trim()}>
                {creating ? 'Creating...' : copyFrom ? 'Copy & Create' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditFieldRow({ field, onSave, onCancel }) {
  const [label, setLabel] = useState(field.label)
  const [value, setValue] = useState(field.value)
  return (
    <>
      <td><input value={label} onChange={e => setLabel(e.target.value)} /></td>
      <td><input value={value} onChange={e => setValue(e.target.value)} /></td>
      <td>
        <button onClick={() => onSave(label, value)}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </td>
    </>
  )
}

function EditRiggingRow({ row, onSave, onCancel }) {
  const [data, setData] = useState({ ...row })
  const f = (key) => (e) => setData(d => ({ ...d, [key]: e.target.value }))
  return (
    <>
      <td><input value={data.description || ''} onChange={f('description')} /></td>
      <td><input value={data.partNo || ''} onChange={f('partNo')} /></td>
      <td><input value={data.qty || ''} onChange={f('qty')} style={{width:'50px'}} /></td>
      <td><input value={data.length || ''} onChange={f('length')} style={{width:'70px'}} /></td>
      <td><input value={data.product || ''} onChange={f('product')} /></td>
      <td><input value={data.diameter || ''} onChange={f('diameter')} style={{width:'70px'}} /></td>
      <td><input value={data.hardware || ''} onChange={f('hardware')} /></td>
      <td>
        <button onClick={() => onSave(data)}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </td>
    </>
  )
}
