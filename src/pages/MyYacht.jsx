import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveYacht, getYacht } from '../services/firestore'
import { SWAN_MODELS, YACHT_STATUS } from '../data/swanModels'
import PhotoUpload from '../components/PhotoUpload'
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
  skipperName: '', skipperEmail: '', skipperPhone: '', skipperPhonePublic: false,
  skipperWhatsapp: '', skipperWebsite: '', skipperLanguages: '', skipperNationality: '', skipperUid: '',
  gardienneName: '', gardienneEmail: '', gardiennePhone: '', gardiennePhonePublic: false,
  gardienneWhatsapp: '', gardienneWebsite: '', gardienneLocation: '', gardienneLanguages: '', gardienneUid: '',
  marineName: '', marinaCountry: '', notes: '',
}

export default function MyYacht() {
  const { user, userProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [skipperMode, setSkipperMode] = useState('owner')
  const [gardienneMode, setGardienneMode] = useState('none')
  const [photos, setPhotos] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!user?.uid) return
    getYacht(user.uid).then(data => {
      if (data) {
        setSkipperMode(data.skipperMode || 'owner')
        setGardienneMode(data.gardienneMode || 'none')
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
          skipperName: data.skipper?.name || '',
          skipperEmail: data.skipper?.email || '',
          skipperPhone: data.skipper?.phone || '',
          skipperPhonePublic: data.skipper?.phonePublic || false,
          skipperWhatsapp: data.skipper?.whatsapp || '',
          skipperWebsite: data.skipper?.website || '',
          skipperLanguages: data.skipper?.languages || '',
          skipperNationality: data.skipper?.nationality || '',
          skipperUid: data.skipper?.uid || '',
          gardienneName: data.gardienne?.name || '',
          gardienneEmail: data.gardienne?.email || '',
          gardiennePhone: data.gardienne?.phone || '',
          gardiennePhonePublic: data.gardienne?.phonePublic || false,
          gardienneWhatsapp: data.gardienne?.whatsapp || '',
          gardienneWebsite: data.gardienne?.website || '',
          gardienneLocation: data.gardienne?.location || '',
          gardienneLanguages: data.gardienne?.languages || '',
          gardienneUid: data.gardienne?.uid || '',
          marineName: data.homeMarina?.name || '',
          marinaCountry: data.homeMarina?.country || '',
          notes: data.notes || '',
        })
      }
      setLoaded(true)
    }).catch(e => {
      console.error('Failed to load yacht:', e)
      setLoaded(true)
    })
  }, [user?.uid])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)

    const skipperData = skipperMode === 'owner'
      ? { mode: 'owner', name: userProfile?.name || '', email: user?.email || '' }
      : skipperMode === 'linked'
      ? { mode: 'linked', uid: form.skipperUid || '' }
      : {
          mode: 'manual',
          name: form.skipperName || '',
          email: form.skipperEmail || '',
          phone: form.skipperPhone || '',
          phonePublic: form.skipperPhonePublic || false,
          whatsapp: form.skipperWhatsapp || '',
          website: form.skipperWebsite || '',
          languages: form.skipperLanguages || '',
          nationality: form.skipperNationality || '',
        }

    const gardienneData = gardienneMode === 'none' ? null
      : gardienneMode === 'linked'
      ? { mode: 'linked', uid: form.gardienneUid || '' }
      : {
          mode: 'manual',
          name: form.gardienneName || '',
          email: form.gardienneEmail || '',
          phone: form.gardiennePhone || '',
          phonePublic: form.gardiennePhonePublic || false,
          whatsapp: form.gardienneWhatsapp || '',
          website: form.gardienneWebsite || '',
          location: form.gardienneLocation || '',
          languages: form.gardienneLanguages || '',
        }

    try {
      await saveYacht(user.uid, {
        name: form.name || '',
        model: form.model || '',
        hullNumber: form.hullNumber || '',
        year: parseInt(form.year) || '',
        flag: (form.flag || '').toUpperCase(),
        currentStatus: form.currentStatus || 'berth',
        hullColour: form.hullColour || '',
        approachability: form.approachability || 'chat',
        phone: form.phone || '',
        phonePublic: form.phonePublic || false,
        whatsapp: form.whatsapp || '',
        whatsappPublic: form.whatsappPublic !== false,
        skipperMode,
        skipper: skipperData,
        gardienneMode,
        gardienne: gardienneData,
        homeMarina: { name: form.marineName || '', country: form.marinaCountry || '' },
        notes: form.notes || '',
        ownerName: userProfile?.name || '',
        ownerEmail: user?.email || '',
        photos: photos,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Save failed:', e)
      alert('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  if (!loaded) return <div className="loading-screen"><div className="spinner" /></div>

  const allModels = SWAN_MODELS.map(m => m.name)

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
            <select value={form.model} onChange={e => update('model', e.target.value)}>
              <option value="">Select model</option>
              {allModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select></label>
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
        <p className="section-hint">Only visible to logged-in members. You control what is shown.</p>
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

      <section className="yacht-section">
        <h2>Skipper / Captain</h2>
        <div className="mode-selector">
          {[{ id: 'owner', label: 'I am the skipper' }, { id: 'linked', label: 'Link a member' }, { id: 'manual', label: 'Enter manually' }].map(m => (
            <button key={m.id} className={"mode-btn" + (skipperMode === m.id ? " active" : "")} onClick={() => setSkipperMode(m.id)}>{m.label}</button>
          ))}
        </div>
        {skipperMode === 'owner' && (
          <div className="mode-info"><p>Your profile will be shown as the skipper: <strong>{userProfile?.name || user?.email}</strong></p></div>
        )}
        {skipperMode === 'linked' && (
          <div className="form-grid">
            <label className="field field-full"><span>Skipper email (registered member)</span>
              <input value={form.skipperUid} onChange={e => update('skipperUid', e.target.value)} placeholder="their@email.com" /></label>
          </div>
        )}
        {skipperMode === 'manual' && (
          <div className="form-grid">
            <label className="field"><span>Full Name</span><input value={form.skipperName} onChange={e => update('skipperName', e.target.value)} /></label>
            <label className="field"><span>Nationality</span><input value={form.skipperNationality} onChange={e => update('skipperNationality', e.target.value)} /></label>
            <label className="field"><span>Email</span><input type="email" value={form.skipperEmail} onChange={e => update('skipperEmail', e.target.value)} /></label>
            <label className="field"><span>Phone</span><input type="tel" value={form.skipperPhone} onChange={e => update('skipperPhone', e.target.value)} /></label>
            <div className="field">
              <span>Show phone to members</span>
              <label className="ios-toggle" style={{ marginTop: '0.5rem' }}>
                <input type="checkbox" checked={form.skipperPhonePublic} onChange={e => update('skipperPhonePublic', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <label className="field"><span>WhatsApp</span><input type="tel" value={form.skipperWhatsapp} onChange={e => update('skipperWhatsapp', e.target.value)} /></label>
            <label className="field"><span>Website</span><input value={form.skipperWebsite} onChange={e => update('skipperWebsite', e.target.value)} placeholder="https://" /></label>
            <label className="field"><span>Languages</span><input value={form.skipperLanguages} onChange={e => update('skipperLanguages', e.target.value)} /></label>
          </div>
        )}
      </section>

      <section className="yacht-section">
        <h2>Gardienne</h2>
        <div className="mode-selector">
          {[{ id: 'none', label: 'No gardienne' }, { id: 'linked', label: 'Link a member' }, { id: 'manual', label: 'Enter manually' }].map(m => (
            <button key={m.id} className={"mode-btn" + (gardienneMode === m.id ? " active" : "")} onClick={() => setGardienneMode(m.id)}>{m.label}</button>
          ))}
        </div>
        {gardienneMode === 'linked' && (
          <div className="form-grid">
            <label className="field field-full"><span>Gardienne email (registered member)</span>
              <input value={form.gardienneUid} onChange={e => update('gardienneUid', e.target.value)} placeholder="their@email.com" /></label>
          </div>
        )}
        {gardienneMode === 'manual' && (
          <div className="form-grid">
            <label className="field"><span>Full Name</span><input value={form.gardienneName} onChange={e => update('gardienneName', e.target.value)} /></label>
            <label className="field"><span>Based at</span><input value={form.gardienneLocation} onChange={e => update('gardienneLocation', e.target.value)} /></label>
            <label className="field"><span>Email</span><input type="email" value={form.gardienneEmail} onChange={e => update('gardienneEmail', e.target.value)} /></label>
            <label className="field"><span>Phone</span><input type="tel" value={form.gardiennePhone} onChange={e => update('gardiennePhone', e.target.value)} /></label>
            <div className="field">
              <span>Show phone to members</span>
              <label className="ios-toggle" style={{ marginTop: '0.5rem' }}>
                <input type="checkbox" checked={form.gardiennePhonePublic} onChange={e => update('gardiennePhonePublic', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <label className="field"><span>WhatsApp</span><input type="tel" value={form.gardienneWhatsapp} onChange={e => update('gardienneWhatsapp', e.target.value)} /></label>
            <label className="field"><span>Website</span><input value={form.gardienneWebsite} onChange={e => update('gardienneWebsite', e.target.value)} placeholder="https://" /></label>
            <label className="field"><span>Languages</span><input value={form.gardienneLanguages} onChange={e => update('gardienneLanguages', e.target.value)} /></label>
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
        <h2>Notes for Members</h2>
        <div className="form-grid">
          <label className="field field-full">
            <span>Anything you would like other members to know</span>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3}
              placeholder="Sailing plans, current location, looking for crew..." /></label>
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
