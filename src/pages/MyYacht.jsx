import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveYacht, getYacht } from '../services/firestore'
import { YACHT_STATUS } from '../data/swanModels'
import PhotoUpload from '../components/PhotoUpload'
import VesselDocuments from '../components/VesselDocuments'
import './MyYacht.css'

const APPROACHABILITY = [
  { id: 'open', label: 'Open to visitors', desc: 'Feel free to come say hi!' },
  { id: 'chat', label: 'Happy to chat', desc: 'Message us, we are friendly' },
  { id: 'private', label: 'Private', desc: 'Please message before approaching' },
]

const EMPTY_FORM = {
  name: '', model: '', hullNumber: '', year: '', flag: '',
  currentStatus: 'berth', hullColour: '', approachability: 'chat',
  phone: '', phonePublic: false, whatsapp: '', whatsappPublic: true,
  marineName: '', marinaCountry: '', notes: '',
}

const EMPTY_MANUAL = {
  name: '', email: '', phone: '', phonePublic: false,
  whatsapp: '', website: '', languages: '', nationality: '', location: ''
}

export default function MyYacht() {
  const { user, userProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [customModel, setCustomModel] = useState(false)
  const [fleetModels, setFleetModels] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [photos, setPhotos] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)

  // Crew team state
  const [linkedSkippers, setLinkedSkippers] = useState([])   // array of uids
  const [linkedGardiennes, setLinkedGardiennes] = useState([]) // array of uids
  const [manualSkippers, setManualSkippers] = useState([])   // array of manual entries
  const [manualGardiennes, setManualGardiennes] = useState([]) // array of manual entries

  // UI state
  const [addingSkipper, setAddingSkipper] = useState(null)   // 'linked' | 'manual' | null
  const [addingGardienne, setAddingGardienne] = useState(null)
  const [newSkipperUid, setNewSkipperUid] = useState('')
  const [newGardienneUid, setNewGardienneUid] = useState('')
  const [newSkipperManual, setNewSkipperManual] = useState(EMPTY_MANUAL)
  const [newGardienneManual, setNewGardienneManual] = useState(EMPTY_MANUAL)

  useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs, query, where }) => {
      import('../firebase').then(({ db }) => {
        getDocs(query(collection(db, 'users'), where('status', '==', 'approved'))).then(snap => {
          setAllMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
        })
        getDocs(collection(db, 'yachts')).then(snap => {
          const models = [...new Set(snap.docs.map(d => d.data().model).filter(Boolean))].sort()
          setFleetModels(models)
        })
      })
    })
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    getYacht(user.uid).then(data => {
      if (data) {
        setPhotos(data.photos || [])
        setForm({
          name: data.name || '',
          model: data.model || '',
          hullNumber: data.hullNumber || '',
          year: data.year || '',
          flag: data.flag || '',
          currentStatus: data.currentStatus || 'berth',
          hullColour: data.hullColour || '',
          approachability: data.approachability || 'chat',
          phone: data.phone || '',
          phonePublic: data.phonePublic || false,
          whatsapp: data.whatsapp || '',
          whatsappPublic: data.whatsappPublic !== false,
          marineName: data.homeMarina?.name || '',
          marinaCountry: data.homeMarina?.country || '',
          notes: data.notes || '',
        })
        // Load crew arrays - handle legacy single skipper/gardienne format too
        setLinkedSkippers(data.crew?.linkedSkippers || (data.skipper?.uid ? [data.skipper.uid] : []))
        setLinkedGardiennes(data.crew?.linkedGardiennes || (data.gardienne?.uid ? [data.gardienne.uid] : []))
        setManualSkippers(data.crew?.manualSkippers || (data.skipper?.mode === 'manual' ? [data.skipper] : []))
        setManualGardiennes(data.crew?.manualGardiennes || (data.gardienne?.mode === 'manual' ? [data.gardienne] : []))
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [user?.uid])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function addLinkedSkipper() {
    if (!newSkipperUid || linkedSkippers.includes(newSkipperUid)) return
    setLinkedSkippers(prev => [...prev, newSkipperUid])
    setNewSkipperUid('')
    setAddingSkipper(null)
  }

  function addManualSkipper() {
    if (!newSkipperManual.name.trim()) return
    setManualSkippers(prev => [...prev, { ...newSkipperManual, id: Date.now().toString() }])
    setNewSkipperManual(EMPTY_MANUAL)
    setAddingSkipper(null)
  }

  function addLinkedGardienne() {
    if (!newGardienneUid || linkedGardiennes.includes(newGardienneUid)) return
    setLinkedGardiennes(prev => [...prev, newGardienneUid])
    setNewGardienneUid('')
    setAddingGardienne(null)
  }

  function addManualGardienne() {
    if (!newGardienneManual.name.trim()) return
    setManualGardiennes(prev => [...prev, { ...newGardienneManual, id: Date.now().toString() }])
    setNewGardienneManual(EMPTY_MANUAL)
    setAddingGardienne(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveYacht(user.uid, {
        ...form,
        flag: (form.flag || '').toUpperCase(),
        year: parseInt(form.year) || '',
        homeMarina: { name: form.marineName || '', country: form.marinaCountry || '' },
        ownerName: userProfile?.name || '',
        ownerEmail: user?.email || '',
        photos,
        crew: {
          ownerUid: user.uid,
          linkedSkippers,
          linkedGardiennes,
          manualSkippers,
          manualGardiennes,
        },
        // Keep legacy fields for YachtProfile compatibility during transition
        skipperMode: linkedSkippers.length > 0 ? 'linked' : manualSkippers.length > 0 ? 'manual' : 'owner',
        skipper: linkedSkippers.length > 0
          ? { mode: 'linked', uid: linkedSkippers[0] }
          : manualSkippers.length > 0
          ? { mode: 'manual', ...manualSkippers[0] }
          : { mode: 'owner', name: userProfile?.name || '', email: user?.email || '' },
        gardienneMode: linkedGardiennes.length > 0 ? 'linked' : manualGardiennes.length > 0 ? 'manual' : 'none',
        gardienne: linkedGardiennes.length > 0
          ? { mode: 'linked', uid: linkedGardiennes[0] }
          : manualGardiennes.length > 0
          ? { mode: 'manual', ...manualGardiennes[0] }
          : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  const memberById = (uid) => allMembers.find(m => m.uid === uid)
  const availableSkippers = allMembers.filter(m =>
    ['skipper', 'owner', 'admin'].includes(m.role) && !linkedSkippers.includes(m.uid)
  )
  const availableGardiennes = allMembers.filter(m =>
    ['gardienne', 'admin'].includes(m.role) && !linkedGardiennes.includes(m.uid)
  )

  if (!loaded) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="my-yacht-page">
      <div className="my-yacht-header">
        <div>
          <h1>{form.name || 'My Yacht'}</h1>
          <p className="my-yacht-subtitle">{form.model ? form.model + (form.flag ? ' - ' + form.flag : '') : 'Register your Swan'}</p>
        </div>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <section className="yacht-section">
        <h2>Current Status</h2>
        <div className="status-buttons">
          {YACHT_STATUS.map(s => (
            <button key={s.id}
              className={"status-btn" + (form.currentStatus === s.id ? " active" : "")}
              style={form.currentStatus === s.id ? { background: s.color, borderColor: s.color, color: '#0a0f1e' } : {}}
              onClick={() => update('currentStatus', s.id)}>{s.label}</button>
          ))}
        </div>
      </section>

      <section className="yacht-section">
        <h2>Approachability</h2>
        <p className="section-hint">Let other members know if they can come say hello when they see you in a marina.</p>
        <div className="approach-options">
          {APPROACHABILITY.map(a => (
            <button key={a.id}
              className={"approach-btn" + (form.approachability === a.id ? " active" : "")}
              onClick={() => update('approachability', a.id)}>
              <span className="approach-label">{a.label}</span>
              <span className="approach-desc">{a.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="yacht-section">
        <h2>Boat Details</h2>
        <div className="form-grid">
          <label className="field"><span>Boat Name</span>
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Tiger" /></label>
          <label className="field"><span>Model</span>
            {!customModel ? (
              <select value={form.model} onChange={e => {
                if (e.target.value === '__custom__') { setCustomModel(true); update('model', '') }
                else update('model', e.target.value)
              }}>
                <option value="">Select model</option>
                {fleetModels.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom__">My model is not listed - add it</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={form.model} onChange={e => update('model', e.target.value)} placeholder="e.g. Swan 48 Mk2" style={{ flex: 1 }} autoFocus />
                <button type="button" onClick={() => setCustomModel(false)}
                  style={{ background: 'transparent', border: '1px solid #1e3a5f', color: '#6b8cae', padding: '0 0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  Cancel
                </button>
              </div>
            )}
          </label>
          <label className="field"><span>Hull Number</span>
            <input value={form.hullNumber} onChange={e => update('hullNumber', e.target.value)} placeholder="e.g. 48-042" /></label>
          <label className="field"><span>Year Built</span>
            <input type="number" value={form.year} onChange={e => update('year', e.target.value)} placeholder="e.g. 2004" /></label>
          <label className="field"><span>Flag (3-letter code)</span>
            <input value={form.flag} onChange={e => update('flag', e.target.value)} placeholder="e.g. GBR" maxLength={3} /></label>
          <label className="field"><span>Hull Colour</span>
            <input value={form.hullColour} onChange={e => update('hullColour', e.target.value)} placeholder="e.g. Navy blue" /></label>
        </div>
      </section>

      <section className="yacht-section">
        <h2>Owner Contact</h2>
        <p className="section-hint">Only visible to logged-in members.</p>
        <div className="form-grid">
          <label className="field"><span>Phone Number</span>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+44 7700 000000" /></label>
          <div className="field">
            <span>Show phone to members</span>
            <label className="ios-toggle" style={{ marginTop: '0.5rem' }}>
              <input type="checkbox" checked={form.phonePublic} onChange={e => update('phonePublic', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <label className="field"><span>WhatsApp (with country code)</span>
            <input type="tel" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="+44 7700 000000" /></label>
          <div className="field">
            <span>Show WhatsApp to members</span>
            <label className="ios-toggle" style={{ marginTop: '0.5rem' }}>
              <input type="checkbox" checked={form.whatsappPublic} onChange={e => update('whatsappPublic', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </section>

      {/* ── CREW TEAM ─────────────────────────────────────────── */}

      <section className="yacht-section">
        <h2>Yacht Crew</h2>
        <p className="section-hint">Link registered members or add contacts manually. All linked members will have access to the private maintenance log.</p>

        {/* Owner - always shown */}
        <div className="crew-role-header"><span className="crew-role-label">Owner</span></div>
        <div className="crew-card crew-card-owner">
          <span className="crew-name">{userProfile?.name || user?.email}</span>
          <span className="crew-badge">You</span>
        </div>

        {/* Skippers */}
        <div className="crew-role-header">
          <span className="crew-role-label">Skippers / Captains</span>
          {!addingSkipper && (
            <div className="crew-add-btns">
              {availableSkippers.length > 0 && <button className="btn-crew-add" onClick={() => setAddingSkipper('linked')}>+ Link member</button>}
              <button className="btn-crew-add" onClick={() => setAddingSkipper('manual')}>+ Add manually</button>
            </div>
          )}
        </div>

        {linkedSkippers.map(uid => {
          const m = memberById(uid)
          return m ? (
            <div key={uid} className="crew-card">
              <div className="crew-card-info">
                <span className="crew-name">{m.name}</span>
                {m.nationality && <span className="crew-detail">{m.nationality}</span>}
                <span className="crew-badge crew-badge-linked">Linked member</span>
              </div>
              <button className="btn-crew-remove" onClick={() => setLinkedSkippers(prev => prev.filter(u => u !== uid))}>Remove</button>
            </div>
          ) : null
        })}

        {manualSkippers.map((s, i) => (
          <div key={s.id || i} className="crew-card">
            <div className="crew-card-info">
              <span className="crew-name">{s.name}</span>
              {s.nationality && <span className="crew-detail">{s.nationality}</span>}
              <span className="crew-badge">Manual entry</span>
            </div>
            <button className="btn-crew-remove" onClick={() => setManualSkippers(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        ))}

        {linkedSkippers.length === 0 && manualSkippers.length === 0 && !addingSkipper && (
          <p className="crew-empty">No skipper linked. Owner shown by default.</p>
        )}

        {addingSkipper === 'linked' && (
          <div className="crew-add-form">
            <select value={newSkipperUid} onChange={e => setNewSkipperUid(e.target.value)} autoFocus>
              <option value="">Select a member...</option>
              {availableSkippers.map(m => (
                <option key={m.uid} value={m.uid}>{m.name}{m.nationality ? ' (' + m.nationality + ')' : ''}</option>
              ))}
            </select>
            <button className="btn-crew-confirm" onClick={addLinkedSkipper} disabled={!newSkipperUid}>Add</button>
            <button className="btn-crew-cancel" onClick={() => { setAddingSkipper(null); setNewSkipperUid('') }}>Cancel</button>
          </div>
        )}

        {addingSkipper === 'manual' && (
          <div className="crew-manual-form">
            <div className="form-grid">
              <label className="field"><span>Full Name</span><input value={newSkipperManual.name} onChange={e => setNewSkipperManual(p => ({...p, name: e.target.value}))} autoFocus /></label>
              <label className="field"><span>Nationality</span><input value={newSkipperManual.nationality} onChange={e => setNewSkipperManual(p => ({...p, nationality: e.target.value}))} /></label>
              <label className="field"><span>Email</span><input type="email" value={newSkipperManual.email} onChange={e => setNewSkipperManual(p => ({...p, email: e.target.value}))} /></label>
              <label className="field"><span>Phone</span><input type="tel" value={newSkipperManual.phone} onChange={e => setNewSkipperManual(p => ({...p, phone: e.target.value}))} /></label>
              <label className="field"><span>WhatsApp</span><input type="tel" value={newSkipperManual.whatsapp} onChange={e => setNewSkipperManual(p => ({...p, whatsapp: e.target.value}))} /></label>
              <label className="field"><span>Languages</span><input value={newSkipperManual.languages} onChange={e => setNewSkipperManual(p => ({...p, languages: e.target.value}))} /></label>
            </div>
            <div className="crew-form-actions">
              <button className="btn-crew-confirm" onClick={addManualSkipper} disabled={!newSkipperManual.name.trim()}>Add Skipper</button>
              <button className="btn-crew-cancel" onClick={() => { setAddingSkipper(null); setNewSkipperManual(EMPTY_MANUAL) }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Gardiennes */}
        <div className="crew-role-header" style={{ marginTop: '1.5rem' }}>
          <span className="crew-role-label">Gardiennes</span>
          {!addingGardienne && (
            <div className="crew-add-btns">
              {availableGardiennes.length > 0 && <button className="btn-crew-add" onClick={() => setAddingGardienne('linked')}>+ Link member</button>}
              <button className="btn-crew-add" onClick={() => setAddingGardienne('manual')}>+ Add manually</button>
            </div>
          )}
        </div>

        {linkedGardiennes.map(uid => {
          const m = memberById(uid)
          return m ? (
            <div key={uid} className="crew-card">
              <div className="crew-card-info">
                <span className="crew-name">{m.name}</span>
                {m.basedAt && <span className="crew-detail">{m.basedAt}</span>}
                <span className="crew-badge crew-badge-linked">Linked member</span>
              </div>
              <button className="btn-crew-remove" onClick={() => setLinkedGardiennes(prev => prev.filter(u => u !== uid))}>Remove</button>
            </div>
          ) : null
        })}

        {manualGardiennes.map((g, i) => (
          <div key={g.id || i} className="crew-card">
            <div className="crew-card-info">
              <span className="crew-name">{g.name}</span>
              {g.location && <span className="crew-detail">{g.location}</span>}
              <span className="crew-badge">Manual entry</span>
            </div>
            <button className="btn-crew-remove" onClick={() => setManualGardiennes(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        ))}

        {linkedGardiennes.length === 0 && manualGardiennes.length === 0 && !addingGardienne && (
          <p className="crew-empty">No gardienne linked.</p>
        )}

        {addingGardienne === 'linked' && (
          <div className="crew-add-form">
            <select value={newGardienneUid} onChange={e => setNewGardienneUid(e.target.value)} autoFocus>
              <option value="">Select a member...</option>
              {availableGardiennes.map(m => (
                <option key={m.uid} value={m.uid}>{m.name}{m.basedAt ? ' — ' + m.basedAt : ''}</option>
              ))}
            </select>
            <button className="btn-crew-confirm" onClick={addLinkedGardienne} disabled={!newGardienneUid}>Add</button>
            <button className="btn-crew-cancel" onClick={() => { setAddingGardienne(null); setNewGardienneUid('') }}>Cancel</button>
          </div>
        )}

        {addingGardienne === 'manual' && (
          <div className="crew-manual-form">
            <div className="form-grid">
              <label className="field"><span>Full Name</span><input value={newGardienneManual.name} onChange={e => setNewGardienneManual(p => ({...p, name: e.target.value}))} autoFocus /></label>
              <label className="field"><span>Based at</span><input value={newGardienneManual.location} onChange={e => setNewGardienneManual(p => ({...p, location: e.target.value}))} /></label>
              <label className="field"><span>Email</span><input type="email" value={newGardienneManual.email} onChange={e => setNewGardienneManual(p => ({...p, email: e.target.value}))} /></label>
              <label className="field"><span>Phone</span><input type="tel" value={newGardienneManual.phone} onChange={e => setNewGardienneManual(p => ({...p, phone: e.target.value}))} /></label>
              <label className="field"><span>WhatsApp</span><input type="tel" value={newGardienneManual.whatsapp} onChange={e => setNewGardienneManual(p => ({...p, whatsapp: e.target.value}))} /></label>
              <label className="field"><span>Languages</span><input value={newGardienneManual.languages} onChange={e => setNewGardienneManual(p => ({...p, languages: e.target.value}))} /></label>
            </div>
            <div className="crew-form-actions">
              <button className="btn-crew-confirm" onClick={addManualGardienne} disabled={!newGardienneManual.name.trim()}>Add Gardienne</button>
              <button className="btn-crew-cancel" onClick={() => { setAddingGardienne(null); setNewGardienneManual(EMPTY_MANUAL) }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="yacht-section">
        <h2>Home Marina</h2>
        <div className="form-grid">
          <label className="field"><span>Marina Name</span><input value={form.marineName} onChange={e => update('marineName', e.target.value)} /></label>
          <label className="field"><span>Country</span><input value={form.marinaCountry} onChange={e => update('marinaCountry', e.target.value)} /></label>
        </div>
      </section>

      <section className="yacht-section">
        <h2>Yacht Photos</h2>
        <p className="section-hint">First photo appears on your fleet card and the home page. Up to 6 photos.</p>
        <div className="photos-grid">
          {photos.map((p, i) => (
            <div key={i} className="photo-thumb-wrap">
              <img src={p.url} alt={"Photo " + (i+1)} className="photo-thumb" />
              <button className="photo-remove" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>x</button>
            </div>
          ))}
        </div>
        {photos.length < 6 && (
          <PhotoUpload
            storagePath={"yachts/" + user.uid + "/photos"}
            maxPhotos={6 - photos.length}
            existingPhotos={photos}
            onUploaded={newPhotos => setPhotos(prev => [...prev, ...newPhotos])}
          />
        )}
      </section>

      <section className="yacht-section">
        <h2>Vessel Documents</h2>
        <p className="section-hint">PDF manuals, drawings and certificates. Private to your linked crew. Used by the Ask Claude feature to give vessel-specific advice.</p>
        <VesselDocuments yachtId={user?.uid} canUpload={true} />
      </section>

      <section className="yacht-section">
        <h2>Notes for Members</h2>
        <div className="form-grid">
          <label className="field field-full">
            <span>Anything you would like other members to know</span>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3}
              placeholder="Sailing plans, current location, looking for crew..." /></label>
        </div>
      </section>


      <section className="yacht-section log-holding">
        <h2>Maintenance &amp; Crew Log</h2>
        <div className="log-holding-inner">
          <div className="log-holding-lock">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="log-holding-soon">Coming soon</span>
          </div>
          <p className="log-holding-text">A private workspace for your yacht's crew team — owner, skippers and gardiennes together.</p>
          <p className="log-holding-text">Log ongoing issues, track repairs and share updates across your team. Run through routine checks — engine, rigging, safety equipment, bilges — and sign them off watch by watch.</p>
          <p className="log-holding-text">Issues logged here are automatically shared anonymously to the community Issues &amp; Fixes board, attributed only to your Swan model. If yours is the only vessel of that model registered, the issue will be held privately until a second vessel of the same model joins the community.</p>
          <p className="log-holding-text log-holding-restricted">Access is restricted to your linked crew only.</p>
        </div>
      </section>
      <div className="save-footer">
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
