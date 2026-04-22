import { useState, useEffect, useRef } from 'react'
import { getVesselDocuments, saveVesselDocument, deleteVesselDocument } from '../services/firestore'
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import './VesselDocuments.css'

const CATEGORIES = [
  '01 Hull', '02 Deck', '03 Interior', '04 Engine', '05 Plumbing',
  '06 Electrical', '07 Electronics', '08 Rig', '09 Equipment',
  'Deck', 'Domestic Appliances', 'Electrical & Generator', 'Engine & Thruster',
  'Entertainment', 'Navigation', 'Plumbing & Ventilation', 'Sailing Instruments',
  'Certificates & Insurance', 'Survey Reports', 'Other'
]

export default function VesselDocuments({ yachtId, canUpload, compact }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [category, setCategory] = useState('04 Engine')
  const [manufacturer, setManufacturer] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const fileRef = useRef()

  useEffect(() => { if (yachtId) loadDocs() }, [yachtId])

  async function loadDocs() {
    setLoading(true)
    try {
      const list = await getVesselDocuments(yachtId)
      setDocs(list.sort((a,b) => (a.category||'').localeCompare(b.category||'')))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    try {
      const storage = getStorage()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = 'yachts/' + yachtId + '/documents/' + category + '/' + (manufacturer ? manufacturer + '/' : '') + safeName
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: 'application/pdf' })

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          resolve
        )
      })

      const url = await getDownloadURL(storageRef)
      await saveVesselDocument(yachtId, {
        filename: file.name,
        displayName: displayName.trim() || file.name.replace('.pdf','').replace(/_/g,' '),
        category,
        manufacturer: manufacturer.trim(),
        type: 'upload',
        storagePath,
        url,
      })
      await loadDocs()
      setShowUpload(false)
      setDisplayName('')
      setManufacturer('')
      if (fileRef.current) fileRef.current.value = ''
    } catch(e) { alert('Upload failed: ' + e.message) }
    setUploading(false)
  }

  async function handleDelete(doc) {
    if (!confirm('Delete ' + doc.displayName + '?')) return
    try {
      const storage = getStorage()
      await deleteObject(ref(storage, doc.storagePath))
      await deleteVesselDocument(yachtId, doc.id)
      await loadDocs()
    } catch(e) { alert('Delete failed: ' + e.message) }
  }

  const categories = ['all', ...new Set(docs.map(d => d.category).filter(Boolean))]
  const filtered = filterCat === 'all' ? docs : docs.filter(d => d.category === filterCat)
  const grouped = filtered.reduce((acc, doc) => {
    const key = doc.category || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(doc)
    return acc
  }, {})

  if (loading) return <div className="vdocs-loading">Loading documents...</div>

  return (
    <div className={'vdocs' + (compact ? ' vdocs-compact' : '')}>
      {!compact && (
        <div className="vdocs-header">
          <div className="vdocs-filter">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
            </select>
          </div>
          {canUpload && (
            <button className="vdocs-upload-btn" onClick={() => setShowUpload(o => !o)}>
              {showUpload ? 'Cancel' : '+ Upload Document'}
            </button>
          )}
        </div>
      )}

      {showUpload && canUpload && (
        <div className="vdocs-upload-form">
          <div className="vdocs-upload-row">
            <div className="vdocs-field">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="vdocs-field">
              <label>Manufacturer / Label (optional)</label>
              <input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Yanmar, Harken" />
            </div>
          </div>
          <div className="vdocs-field">
            <label>Display name (optional — defaults to filename)</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Main Engine Service Manual" />
          </div>
          <div className="vdocs-field">
            <label>PDF File</label>
            <input type="file" accept=".pdf" ref={fileRef} onChange={handleUpload} disabled={uploading} />
          </div>
          {uploading && (
            <div className="vdocs-progress">
              <div className="vdocs-progress-bar" style={{width: uploadProgress + '%'}} />
              <span>{uploadProgress}%</span>
            </div>
          )}
        </div>
      )}

      {docs.length === 0 && !showUpload && (
        <p className="vdocs-empty">No documents uploaded yet.{canUpload ? ' Use the upload button to add PDF manuals and drawings.' : ''}</p>
      )}

      {Object.entries(grouped).map(([cat, catDocs]) => (
        <div key={cat} className="vdocs-category">
          <h3 className="vdocs-cat-header">{cat} <span className="vdocs-cat-count">{catDocs.length}</span></h3>
          {catDocs.map(doc => (
            <div key={doc.id} className="vdocs-doc">
              <div className="vdocs-doc-info">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="vdocs-doc-name">
                  {doc.displayName || doc.filename}
                </a>
                {doc.manufacturer && <span className="vdocs-doc-mfr">{doc.manufacturer}</span>}
              </div>
              <div className="vdocs-doc-actions">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="vdocs-open-btn">Open</a>
                {canUpload && <button className="vdocs-delete-btn" onClick={() => handleDelete(doc)}>x</button>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
