import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveYacht, getYacht, updateLocation, hideLocation } from '../services/firestore'
import { SWAN_MODELS, YACHT_STATUS } from '../data/swanModels'
import { proposeModel } from '../services/firestore'
import './MyYacht.css'

export default function MyYacht() {
  const { user, userProfile } = useAuth()
  const [yacht, setYacht] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locationSharing, setLocationSharing] = useState(false)
  const [showProposeModel, setShowProposeModel] = useState(false)

  // Skipper mode: 'owner' | 'linked' | 'manual'
  const [skipperMode, setSkipperMode] = useState('owner')
  // Gardienne mode: 'none' | 'linked' | 'manual'
  const [gardiенneMode, setGardienneMode] = useState('none')

  const [form, setForm] = useState({
    name: '',
    model: '',
    hullNumber: '',
    year: '',
    flag: '',
    currentStatus: 'berth',
    // Skipper manual
    skipperName: '',
    skipperEmail: '',
    skipperPhone: '',
    skipperWebsite: '',
    skipperLanguages: '',
    skipperNationality: '',
    // Skipper linked UID
    skipperUid: '',
    // Gardienne manual
    gardienneName: '',
    gardiенneEmail: '',
    gardiеnnePhone: '',
    gardienneWebsite: '',
    gardienneLocation: '',
    gardienneLanguages: '',
    // Gardienne linked UID
    gardiеnneUid: '',
    // Home marina
    marineName: '',
    marinaCountry: '',
    // Notes
    notes: '',
  })

  useEffect(() => {
    getYacht(user.uid).then(data => {
      if (data) {
        setYacht(data)
        setSkipperMode(data.skipperMode || 'owner')
        setGardienneMode(data.gardiенneMode || 'none')
        setForm({
          name: data.name || '',
          model: data.model || '',
          hullNumber: data.hullNumber || '',
          year: data.year || '',
          flag: data.flag || '',
          currentStatus: data.currentStatus || 'berth',
          skipperName: data.skipper?.name || '',
          skipperEmail: data.skipper?.email || '',
          skipperPhone: data.skipper?.phone || '',
          skipperWebsite: data.skipper?.website || '',
          skipperLanguages: data.skipper?.languages || '',
          skipperNationality: data.skipper?.nationality || '',
          skipperUid: data.skipper?.uid || '',
          gardienneName: data.gardienne?.name || '',
          gardiеnneEmail: data.gardienne?.email || '',
          gardiеnnePhone: data.gardienne?.phone || '',
          gardienneWebsite: data.gardienne?.website || '',
          gardienneLocation: data.gardienne?.location || '',
          gardienneLanguages: data.gardienne?.languages || '',
          gardiеnneUid: data.gardienne?.uid || '',
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

    const skipperData = skipperMode === 'owner'
      ? { mode: 'owner', name: userProfile?.name, email: user.email }
      : skipperMode === 'linked'
      ? { mode: 'linked', uid: form.skipperUid }
      : {
          mode: 'manual',
          name: form.skipperName,
          email: form.skipperEmail,
          phone: form.skipperPhone,
          website: form.skipperWebsite,
          languages: form.skipperLanguages,
          nationality: form.skipperNationality,
        }

    const gardiеnneData = gardiенneMode === 'none'
      ? null
      : gardiенneMode === 'linked'
      ? { mode: 'linked', uid: form.gardiеnneUid }
      : {
          mode: 'manual',
          name: form.gardienneName,
          email: form.gardiеnneEmail,
          phone: form.gardiеnnePhone,
          website: form.gardienneWebsite,
          location: form.gardienneLocation,
          languages: form.gardienneLanguages,
        }

    await saveYacht(user.uid, {
      name: form.name,
      model: form.model,
      hullNumber: form.hullNumber,
      year: parseInt(form.year) || '',
      flag: form.flag.toUpperCase(),
      currentStatus: form.currentStatus,
      skipperMode,
      skipper: skipperData,
      gardiеnneMode: gardiенneMode,
      gardienne: gardiеnneData,
      homeMarina: {
        name: form.marineName,
        country: form.marinaCountry,
      },
      notes: form.notes,
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
            boatName: form.name,
            model: form.model,
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
          <p className="my-yacht-subtitle">
            {form.model ? `${form.model}${form.flag ? ' · ' + form.flag : ''}` : 'Register your Swan'}
          </p>
        </div>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* STATUS */}
      <section className="yacht-section">
        <h2>Current Status</h2>
        <div className="status-buttons">
          {YACHT_STATUS.map(s => (
            <button
              key={s.id}
              className={`status-btn ${form.currentStatus === s.id ? 'active' : ''}`}
              style={form.currentStatus === s.id ? { background: s.color, borderColor: s.color, color: '#0a0f1e' } : {}}
              onClick={() => update('currentStatus', s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {yacht && (
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
        )}
      </section>

      {/* BOAT DETAILS */}
      <section className="yacht-section">
        <h2>Boat Details</h2>
        <div className="form-grid">
          <label className="field">
            <span>Boat Name</span>
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Tiger" />
          </label>
          <label className="field">
            <span>Model</span>
            <select value={form.model} onChange={e => update('model', e.target.value)}>
              <option value="">Select model</option>
              {allModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Hull Number</span>
            <input value={form.hullNumber} onChange={e => update('hullNumber', e.target.value)} placeholder="e.g. 48-042" />
          </label>
          <label className="field">
            <span>Year Built</span>
            <input type="number" value={form.year} onChange={e => update('year', e.target.value)} placeholder="e.g. 2022" min="1980" max="2030" />
          </label>
          <label className="field">
            <span>Flag (3-letter code)</span>
            <input value={form.flag} onChange={e => update('flag', e.target.value)} placeholder="e.g. GBR" maxLength={3} />
          </label>
        </div>
        <button className="btn-text-link" onClick={() => setShowProposeModel(true)}>
          My model isn't listed — propose it →
        </button>
      </section>

      {/* SKIPPER */}
      <section className="yacht-section">
        <h2>Skipper / Captain</h2>
        <div className="mode-selector">
          {[
            { id: 'owner', label: 'I am the skipper' },
            { id: 'linked', label: 'Link a registered member' },
            { id: 'manual', label: 'Enter details manually' },
          ].map(m => (
            <button
              key={m.id}
              className={`mode-btn ${skipperMode === m.id ? 'active' : ''}`}
              onClick={() => setSkipperMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {skipperMode === 'owner' && (
          <div className="mode-info">
            <p>Your profile details will be shown as the skipper: <strong>{userProfile?.name}</strong></p>
          </div>
        )}

        {skipperMode === 'linked' && (
          <div className="form-grid">
            <label className="field field-full">
              <span>Skipper's email address (must be a registered member)</span>
              <input
                value={form.skipperUid}
                onChange={e => update('skipperUid', e.target.value)}
                placeholder="their@email.com"
              />
            </label>
          </div>
        )}

        {skipperMode === 'manual' && (
          <div className="form-grid">
            <label className="field">
              <span>Full Name</span>
              <input value={form.skipperName} onChange={e => update('skipperName', e.target.value)} />
            </label>
            <label className="field">
              <span>Nationality</span>
              <input value={form.skipperNationality} onChange={e => update('skipperNationality', e.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.skipperEmail} onChange={e => update('skipperEmail', e.target.value)} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input type="tel" value={form.skipperPhone} onChange={e => update('skipperPhone', e.target.value)} />
            </label>
            <label className="field">
              <span>Website (optional)</span>
              <input value={form.skipperWebsite} onChange={e => update('skipperWebsite', e.target.value)} placeholder="https://" />
            </label>
            <label className="field">
              <span>Languages Spoken</span>
              <input value={form.skipperLanguages} onChange={e => update('skipperLanguages', e.target.value)} placeholder="e.g. English, French" />
            </label>
          </div>
        )}
      </section>

      {/* GARDIENNE */}
      <section className="yacht-section">
        <h2>Gardienne</h2>
        <div className="mode-selector">
          {[
            { id: 'none', label: 'No gardienne' },
            { id: 'linked', label: 'Link a registered member' },
            { id: 'manual', label: 'Enter details manually' },
          ].map(m => (
            <button
              key={m.id}
              className={`mode-btn ${gardiенneMode === m.id ? 'active' : ''}`}
              onClick={() => setGardienneMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {gardiенneMode === 'linked' && (
          <div className="form-grid">
            <label className="field field-full">
              <span>Gardienne's email address (must be a registered member)</span>
              <input
                value={form.gardiеnneUid}
                onChange={e => update('gardiеnneUid', e.target.value)}
                placeholder="their@email.com"
              />
            </label>
          </div>
        )}

        {gardiенneMode === 'manual' && (
          <div className="form-grid">
            <label className="field">
              <span>Full Name</span>
              <input value={form.gardienneName} onChange={e => update('gardienneName', e.target.value)} />
            </label>
            <label className="field">
              <span>Based at (Marina / Port)</span>
              <input value={form.gardienneLocation} onChange={e => update('gardienneLocation', e.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.gardiеnneEmail} onChange={e => update('gardiеnneEmail', e.target.value)} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input type="tel" value={form.gardiеnnePhone} onChange={e => update('gardiеnnePhone', e.target.value)} />
            </label>
            <label className="field">
              <span>Website (optional)</span>
              <input value={form.gardienneWebsite} onChange={e => update('gardienneWebsite', e.target.value)} placeholder="https://" />
            </label>
            <label className="field">
              <span>Languages Spoken</span>
              <input value={form.gardienneLanguages} onChange={e => update('gardienneLanguages', e.target.value)} placeholder="e.g. French, English" />
            </label>
          </div>
        )}
      </section>

      {/* HOME MARINA */}
      <section className="yacht-section">
        <h2>Home Marina</h2>
        <div className="form-grid">
          <label className="field">
            <span>Marina Name</span>
            <input value={form.marineName} onChange={e => update('marineName', e.target.value)} />
          </label>
          <label className="field">
            <span>Country</span>
            <input value={form.marinaCountry} onChange={e => update('marinaCountry', e.target.value)} />
          </label>
        </div>
      </section>

      {/* NOTES */}
      <section className="yacht-section">
        <h2>Notes for Members</h2>
        <div className="form-grid">
          <label className="field field-full">
            <span>Anything you'd like other members to know</span>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Sailing plans, current location, looking for crew, etc." />
          </label>
        </div>
      </section>

      <div className="save-footer">
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {showProposeModel && (
        <ProposeModelModal uid={user.uid} onClose={() => setShowProposeModel(false)} />
      )}
    </div>
  )
}

function ProposeModelModal({ uid, onClose }) {
  const [form, setForm] = useState({ name: '', loa: '', yearFrom: '', yearTo: '', category: 'cruiser-racer' })
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!form.name) return
    await proposeModel(uid, form)
    setSent(true)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2>Propose a New Model</h2>
        {sent ? (
          <>
            <p>Thank you — your proposal has been sent for review.</p>
            <button className="btn-save" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <label className="field"><span>Model Name</span>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Swan 54" />
            </label>
            <label className="field"><span>LOA (metres)</span>
              <input type="number" value={form.loa} onChange={e => setForm(p => ({ ...p, loa: e.target.value }))} />
            </label>
            <label className="field"><span>Year From</span>
              <input type="number" value={form.yearFrom} onChange={e => setForm(p => ({ ...p, yearFrom: e.target.value }))} />
            </label>
            <label className="field"><span>Year To (blank if current)</span>
              <input type="number" value={form.yearTo} onChange={e => setForm(p => ({ ...p, yearTo: e.target.value }))} />
            </label>
            <label className="field"><span>Category</span>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="performance">Performance / ClubSwan</option>
                <option value="cruiser-racer">Cruiser-Racer</option>
                <option value="cruiser">Cruiser</option>
                <option value="superyacht">Superyacht</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn-save" onClick={submit}>Submit</button>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
