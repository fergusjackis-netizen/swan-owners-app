const fs = require('fs')

// Read current Issues.jsx and replace just the PostIssueModal function
let content = fs.readFileSync('src/pages/Issues.jsx', 'utf8')

const newModal = `function PostIssueModal({ uid, onClose, onPosted }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    fix: '',
    swanModel: '',
    system: '',
  })
  const [photos, setPhotos] = useState([])
  const [fixPhotos, setFixPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Pre-generate a document ID so we can upload photos before posting
  const [draftId] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let id = ''
    for (let i = 0; i < 20; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
    return id
  })

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function submit() {
    if (!form.title || !form.description) return setError('Please add a title and description.')
    setSaving(true)
    const { setDoc, doc, serverTimestamp, collection } = await import('firebase/firestore')
    const { db } = await import('../firebase')
    const { containsBadLanguage } = await import('../data/swanModels')
    const flagged = containsBadLanguage(form.title + ' ' + form.description)
    await setDoc(doc(db, 'issues', draftId), {
      ...form,
      photos,
      fixPhotos,
      authorUid: uid,
      upvotes: 0,
      upvotedBy: [],
      resolved: false,
      flagged,
      createdAt: serverTimestamp(),
    })
    const newIssue = {
      id: draftId, ...form, photos, fixPhotos,
      upvotes: 0, resolved: false,
      createdAt: { toMillis: () => Date.now() }
    }
    onPosted(newIssue)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={e => e.stopPropagation()}>
        <h2>Post an Issue</h2>
        <p className="modal-hint">Describe a problem you have encountered. Add photos and a fix if you have them.</p>

        <label className="field">
          <span>Title</span>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Autopilot losing heading in following seas" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Swan Model</span>
            <select value={form.swanModel} onChange={e => update('swanModel', e.target.value)}>
              <option value="">Select model</option>
              {SWAN_MODELS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>System</span>
            <select value={form.system} onChange={e => update('system', e.target.value)}>
              <option value="">Select system</option>
              {SYSTEM_TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description of the problem</span>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Describe what happened, when, and under what conditions..." />
        </label>

        <div className="field">
          <span>Problem photos (optional, up to 5)</span>
          <PhotoUpload
            storagePath={"issues/" + draftId + "/problem"}
            maxPhotos={5}
            existingPhotos={photos}
            onUploaded={newPhotos => setPhotos(prev => [...prev, ...newPhotos])}
          />
          {photos.length > 0 && (
            <PhotoGallery
              photos={photos}
              onCaptionChange={(idx, caption) => setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))}
              onRemove={idx => setPhotos(prev => prev.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        <label className="field">
          <span>Fix or workaround (if known)</span>
          <textarea value={form.fix} onChange={e => update('fix', e.target.value)} rows={3} placeholder="What resolved the issue? Leave blank if unsolved..." />
        </label>

        <div className="field">
          <span>Fix photos (optional, up to 5)</span>
          <PhotoUpload
            storagePath={"issues/" + draftId + "/fix"}
            maxPhotos={5}
            existingPhotos={fixPhotos}
            onUploaded={newPhotos => setFixPhotos(prev => [...prev, ...newPhotos])}
          />
          {fixPhotos.length > 0 && (
            <PhotoGallery
              photos={fixPhotos}
              onCaptionChange={(idx, caption) => setFixPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p))}
              onRemove={idx => setFixPhotos(prev => prev.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-post" onClick={submit} disabled={saving}>
            {saving ? 'Posting...' : 'Post Issue'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}`

// Replace the PostIssueModal function
const start = content.indexOf('function PostIssueModal(')
const end = content.lastIndexOf('}') + 1
if (start === -1) {
  console.log('Could not find PostIssueModal - writing full replacement')
} else {
  content = content.substring(0, start) + newModal + '\n'
  fs.writeFileSync('src/pages/Issues.jsx', content, 'utf8')
  console.log('Updated PostIssueModal in Issues.jsx (' + content.length + ' chars)')
}

console.log('Done!')
