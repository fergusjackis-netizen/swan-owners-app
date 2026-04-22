import { useState, useRef } from 'react'
import { saveVesselDocument } from '../services/firestore'
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import './BulkDocumentUpload.css'

const CATEGORY_MAP = {
  'hull': '01 Hull',
  'deck': '02 Deck',
  'interior': '03 Interior',
  'engine': '04 Engine',
  'plumbing': '05 Plumbing',
  'electrical': '06 Electrical',
  'electronics': '07 Electronics',
  'rig': '08 Rig',
  'equipment': '09 Equipment',
  'domestic': 'Domestic Appliances',
  'navigation': 'Navigation',
  'sailing': 'Sailing Instruments',
  'entertainment': 'Entertainment',
  'certificate': 'Certificates & Insurance',
  'insurance': 'Certificates & Insurance',
  'survey': 'Survey Reports',
}

const ALL_CATEGORIES = [
  '01 Hull', '02 Deck', '03 Interior', '04 Engine', '05 Plumbing',
  '06 Electrical', '07 Electronics', '08 Rig', '09 Equipment',
  'Domestic Appliances', 'Navigation', 'Sailing Instruments',
  'Entertainment', 'Certificates & Insurance', 'Survey Reports', 'Other'
]

function detectCategory(filePath) {
  const lower = filePath.toLowerCase()
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return cat
  }
  return 'Other'
}

function detectManufacturer(filePath) {
  const parts = filePath.split(/[/\]/)
  // Manufacturer is usually the second-to-last folder
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2]
    // Skip if it looks like a category folder (starts with number or matches category)
    if (!/^0[0-9]/.test(candidate) && candidate !== candidate.toUpperCase()) {
      return candidate
    }
  }
  return ''
}

export default function BulkDocumentUpload({ yachtId, onComplete }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({}) // {index: percent}
  const [done, setDone] = useState([])
  const [errors, setErrors] = useState([])
  const [step, setStep] = useState('select') // select | preview | uploading | complete
  const folderRef = useRef()

  function handleFolderSelect(e) {
    const selected = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    const parsed = selected.map((file, i) => {
      const relativePath = file.webkitRelativePath || file.name
      return {
        id: i,
        file,
        filename: file.name,
        relativePath,
        displayName: file.name.replace('.pdf','').replace('.PDF','').replace(/_/g,' '),
        category: detectCategory(relativePath),
        manufacturer: detectManufacturer(relativePath),
        size: (file.size / 1024).toFixed(0) + ' KB',
      }
    })
    setFiles(parsed)
    setStep('preview')
  }

  function updateFile(id, field, value) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  async function uploadAll() {
    setUploading(true)
    setStep('uploading')
    const storage = getStorage()
    const doneList = []
    const errorList = []

    for (const f of files) {
      try {
        const safeName = f.filename.replace(/[^a-zA-Z0-9._\- ]/g, '_')
        const storagePath = 'yachts/' + yachtId + '/documents/' + f.category + '/' + (f.manufacturer ? f.manufacturer + '/' : '') + safeName
        const storageRef = ref(storage, storagePath)
        const uploadTask = uploadBytesResumable(storageRef, f.file, { contentType: 'application/pdf' })

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            snap => setProgress(prev => ({ ...prev, [f.id]: Math.round(snap.bytesTransferred / snap.totalBytes * 100) })),
            reject,
            resolve
          )
        })

        const url = await getDownloadURL(storageRef)
        await saveVesselDocument(yachtId, {
          filename: f.filename,
          displayName: f.displayName,
          category: f.category,
          manufacturer: f.manufacturer,
          type: 'bulk-upload',
          storagePath,
          url,
        })
        setProgress(prev => ({ ...prev, [f.id]: 100 }))
        doneList.push(f.id)
        setDone([...doneList])
      } catch(e) {
        errorList.push({ id: f.id, error: e.message })
        setErrors([...errorList])
      }
    }

    setUploading(false)
    setStep('complete')
    if (onComplete) onComplete()
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(1)

  if (step === 'select') return (
    <div className="bulk-upload">
      <div className="bulk-upload-intro">
        <h3>Bulk Document Upload</h3>
        <p>Select your entire vessel documents folder — the app will automatically detect categories from your folder structure and prepare everything for upload. Works with any folder layout.</p>
        <div className="bulk-upload-benefits">
          <div className="bulk-benefit">
            <span className="bulk-benefit-icon">⚡</span>
            <span>Upload 100+ documents in one go</span>
          </div>
          <div className="bulk-benefit">
            <span className="bulk-benefit-icon">🗂</span>
            <span>Folder structure auto-detected as categories</span>
          </div>
          <div className="bulk-benefit">
            <span className="bulk-benefit-icon">✏️</span>
            <span>Review and adjust before uploading</span>
          </div>
          <div className="bulk-benefit">
            <span className="bulk-benefit-icon">🤖</span>
            <span>Ask Claude uses your documents for vessel-specific advice</span>
          </div>
        </div>
      </div>
      <div className="bulk-upload-drop" onClick={() => folderRef.current.click()}>
        <div className="bulk-upload-drop-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p className="bulk-upload-drop-text">Click to select your documents folder</p>
        <p className="bulk-upload-drop-hint">All PDF files within the folder and subfolders will be found automatically</p>
        <input
          ref={folderRef}
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          accept=".pdf"
          onChange={handleFolderSelect}
          style={{display:'none'}}
        />
      </div>
    </div>
  )

  if (step === 'preview') return (
    <div className="bulk-upload">
      <div className="bulk-preview-header">
        <h3>Review Before Upload</h3>
        <p className="bulk-preview-summary">
          Found <strong>{files.length} PDF files</strong> ({totalSizeMB} MB).
          Check categories are correct — adjust any that need changing — then upload.
        </p>
      </div>

      <div className="bulk-preview-table-wrap">
        <table className="bulk-preview-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Manufacturer</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f.id}>
                <td>
                  <input
                    className="bulk-inline-input"
                    value={f.displayName}
                    onChange={e => updateFile(f.id, 'displayName', e.target.value)}
                  />
                  <span className="bulk-filename">{f.filename}</span>
                </td>
                <td>
                  <select
                    className="bulk-inline-select"
                    value={f.category}
                    onChange={e => updateFile(f.id, 'category', e.target.value)}
                  >
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <input
                    className="bulk-inline-input bulk-mfr-input"
                    value={f.manufacturer}
                    onChange={e => updateFile(f.id, 'manufacturer', e.target.value)}
                    placeholder="Optional"
                  />
                </td>
                <td className="bulk-size">{f.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bulk-preview-actions">
        <button className="bulk-btn-secondary" onClick={() => { setFiles([]); setStep('select') }}>Start over</button>
        <button className="bulk-btn-primary" onClick={uploadAll}>
          Upload all {files.length} documents ({totalSizeMB} MB)
        </button>
      </div>
    </div>
  )

  if (step === 'uploading' || step === 'complete') return (
    <div className="bulk-upload">
      <div className="bulk-progress-header">
        <h3>{step === 'complete' ? 'Upload Complete' : 'Uploading...'}</h3>
        <p className="bulk-progress-summary">
          {done.length} of {files.length} uploaded
          {errors.length > 0 ? ' — ' + errors.length + ' errors' : ''}
        </p>
      </div>

      <div className="bulk-progress-overall">
        <div className="bulk-progress-bar-wrap">
          <div className="bulk-progress-bar-fill" style={{width: Math.round(done.length / files.length * 100) + '%'}} />
        </div>
        <span className="bulk-progress-pct">{Math.round(done.length / files.length * 100)}%</span>
      </div>

      <div className="bulk-file-list">
        {files.map(f => {
          const pct = progress[f.id] || 0
          const isDone = done.includes(f.id)
          const hasError = errors.find(e => e.id === f.id)
          return (
            <div key={f.id} className={'bulk-file-row' + (isDone ? ' bulk-file-done' : '') + (hasError ? ' bulk-file-error' : '')}>
              <span className="bulk-file-name">{f.displayName || f.filename}</span>
              <span className="bulk-file-cat">{f.category}</span>
              <div className="bulk-file-progress">
                {isDone && <span className="bulk-file-tick">✓</span>}
                {hasError && <span className="bulk-file-x">✗</span>}
                {!isDone && !hasError && pct > 0 && (
                  <div className="bulk-file-bar-wrap">
                    <div className="bulk-file-bar-fill" style={{width: pct + '%'}} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {step === 'complete' && (
        <div className="bulk-complete-actions">
          {errors.length > 0 && (
            <p className="bulk-error-note">{errors.length} file{errors.length !== 1 ? 's' : ''} failed — these can be uploaded individually using the single file uploader.</p>
          )}
          <button className="bulk-btn-primary" onClick={() => { setStep('select'); setFiles([]); setProgress({}); setDone([]); setErrors([]) }}>
            Upload another folder
          </button>
        </div>
      )}
    </div>
  )

  return null
}
