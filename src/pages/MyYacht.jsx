import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveYacht, getYacht, updateLocation, hideLocation } from '../services/firestore'
import { SWAN_MODELS, YACHT_STATUS } from '../data/swanModels'
import './MyYacht.css'

const APPROACHABILITY = [
  { id: 'open', label: 'Open to visitors', desc: 'Feel free to come say hi if you see us!' },
  { id: 'chat', label: 'Happy to chat', desc: 'Message us, we are friendly' },
  { id: 'private', label: 'Private', desc: 'Please message before approaching' },
]

export default function MyYacht() {
  const { user, userProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locationSharing, setLocationSharing] = useState(false)
  const [skipperMode, setSkipperMode] = useState('owner')
  const [gardienneMode, setGardienneMode] = useState('none')

  const [form, setForm] = useState({
    name: '', model: '', hullNumber: '', year: '', flag: '',
    currentStatus: 'berth', hullColour: '', approachability: 'chat',
    skipperName: '', skipperEmail: '', skipperPhone: '', skipperWebsite: '',
    skipperLanguages: '', skipperNationality: '', skipperUid: '',
    gardienneName: '', gardienneEmail: '', gardiennePhone: '', gardienneWebsite: '',
    gardienneLocation: '', gardienneLanguages: '', gardienneUid: '',
    marineName: '', marinaCountry: '', notes: '',
  })

  useEffect(() => {
    getYacht(user.uid).then(data => {
      if (data) {
        setSkipperMode(data.skipperMode || 'owner')
        setGardienneMode(data.gardienneMode || 'none')
        setForm({
          name: data.name || '',
          model: data.model || '',
          hullNumber: data.hullNumber || '',
          year: data.year || '',
          flag: data.flag || '',
          currentStatus: data.currentStatus || 'berth',
          hullColour: data.hullColour || '',
          approachability: data.approachability || 'chat',
          skipperName: data.skipper?.name || '',
          skipperEmail: data.skipper?.email || '',
          skipperPhone: data.skipper?.phone || '',
          skipperWebsite: data.skipper?.website || '',
          skipperLanguages: data.skipper?.languages || '',
          skipperNationality: data.skipper?.nationality || '',
          skipperUid: data.skipper?.uid || '',
          gardienneName: data.gardienne?.name || '',
          gardienneEmail: data.gardienne?.email || '',
          gardiennePhone: data.gardienne?.phone || '',
          gardienneWebsite: data.gardienne?.website || '',
          gardienneLocation: data.gardienne?.location || '',
          gardienneLanguages: data.gardienne?.languages || '',
          gardienneUid: data.gardienne?.uid || '',
          marineName: data.homeMarina?.name || '',
          marinaCountry: data.homeMarina?.country || '',
          notes: data.notes || '',
        })
      }
    })
  }, [user.uid])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)

    let skipperData = {}
    if (skipperMode === 'owner') {
      skipperData = {
        mode: 'owner',
        name: userProfile?.name || '',
        email: user.email || '',
      }
    } else if (skipperMode === 'linked') {
      skipperData = { mode: 'linked', uid: form.skipperUid || '' }
    } else {
      skipperData = {
        mode: 'manual',
        name: form.skipperName || '',
        email: form.skipperEmail || '',
        phone: form.skipperPhone || '',
        website: form.skipperWebsite || '',
        languages: form.skipperLanguages || '',
        nationality: form.skipperNationality || '',
      }
    }

    let gardienneData = null
    if (gardienneMode === 'linked') {
      gardienneData = { mode: 'linked', uid: form.gardienneUid || '' }
    } else if (gardienneMode === 'manual') {
      gardienneData = {
        mode: 'manual',
        name: form.gardienneName || '',
        email: form.gardienneEmail || '',
        phone: form.gardiennePhone || '',
        website: form.gardienneWebsite || '',
        location: form.gardienneLocation || '',
        languages: form.gardienneLanguages || '',
      }
    }

    await saveYacht(user.uid, {
      name: form.name || '',
      model: form.model || '',
      hullNumber: form.hullNumber || '',
      year: parseInt(form.year) || '',
      flag: form.flag?.toUpperCase() || '',
      currentStatus: form.currentStatus || 'berth',
      hullColour: form.hullColour || '',
      approachability: form.approachability || 'chat',
      skipperMode,
      skipper: skipperData,
      gardienneMode,
      gardienne: gardienneData,
      homeMarina: {
        name: form.marineName || '',
        country: form.marinaCountry || '',
      },
      notes: form.notes || '',
      ownerName: userProfile?.name || '',
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleLocationToggle() {
    if (locationSharing) {
      await hideLocation(user.uid)
      setLocationSharing(false)
    } else {
      if (!navigator.geolocation) return alert('Geolocation not supported.')
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await updateLocation(user.uid, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: form.name || userProfile?.name || 'Swan',
            model: form.model || '',
            approachability: form.approachability || 'chat',
          })
          setLocationSharing(true)
        },
        () => alert('Could not get location. Please check browser permissions.')
      )
    }
  }

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
        <div className="location-panel">
          <div className="location-info">
            <strong>Share position on Live Map</strong>
            <p>Only visible to logged-in members. Turn off at any time.</p>
          </div>
          <label className="ios-toggle">
            <input type="checkbox" checked={locationSharing} onChange={handleLocationToggle} />
            <span className="toggle-slider" />
          </label>
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
            <input type="number" value={form.year} onChange={e => update('year', e.target.value)} placeholder="e.g. 2004" min="1970" max="2030" /></label>
          <label className="field"><span>Flag (3-letter code)</span>
            <input value={form.flag} onChange={e => update('flag', e.target.value)} placeholder="e.g. GBR" maxLength={3} /></label>
          <label className="field"><span>Hull Colour</span>
            <input value={form.hullColour} onChange={e => update('hullColour', e.target.value)} placeholder="e.g. Navy blue with gold cove stripe" /></label>
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
          <div className="mode-info"><p>Your profile will be shown as the skipper: <strong>{userProfile?.name || user.email}</strong></p></div>
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
            <label className="field"><span>Website</span><input value={form.skipperWebsite} onChange={e => update('skipperWebsite', e.target.value)} placeholder="https://" /></label>
            <label className="field"><span>Languages</span><input value={form.skipperLanguages} onChange={e => update('skipperLanguages', e.target.value)} placeholder="e.g. English, French" /></label>
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
            <label className="field"><span>Website</span><input value={form.gardienneWebsite} onChange={e => update('gardienneWebsite', e.target.value)} placeholder="https://" /></label>
            <label className="field"><span>Languages</span><input value={form.gardienneLanguages} onChange={e => update('gardienneLanguages', e.target.value)} placeholder="e.g. French, English" /></label>
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
        <h2>Notes for Members</h2>
        <div className="form-grid">
          <label className="field field-full"><span>Anything you would like other members to know</span>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3}
              placeholder="Sailing plans, current location, looking for crew, etc." /></label>
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
