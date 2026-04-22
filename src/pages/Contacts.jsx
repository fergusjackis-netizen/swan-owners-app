import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import './Contacts.css'

const TRADES = [
  'Rigger', 'Sailmaker', 'Marine Engineer', 'Electrician', 'Painter & Fairing',
  'Shipwright / Carpenter', 'Upholstery', 'Gardienne', 'Delivery Skipper',
  'Yacht Broker', 'Marine Surveyor', 'Diver / Antifouling', 'Electronics',
  'Plumber / Watermaker', 'Refrigeration', 'Canvas & Covers', 'Photography',
  'Chandlery', 'Fuel & Provisioning', 'Transport & Haulage', 'Other',
]

export default function Contacts() {
  const { user, userProfile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTrade, setFilterTrade] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showCommentFor, setShowCommentFor] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', trade: '', customTrade: '', location: '', country: '',
    phone: '', email: '', address: '', website: '', notes: '',
  })

  useEffect(() => {
    getDocs(collection(db, 'contacts')).then(snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAdd() {
    if (!form.name || (!form.trade && !form.customTrade) || !form.location) return
    setSaving(true)
    const trade = form.trade === 'Other' ? form.customTrade : form.trade
    const ref = await addDoc(collection(db, 'contacts'), {
      name: form.name,
      trade,
      location: form.location,
      country: form.country || '',
      phone: form.phone || '',
      email: form.email || '',
      address: form.address || '',
      website: form.website || '',
      notes: form.notes || '',
      addedBy: userProfile?.name || user?.email || 'Anonymous',
      addedByUid: user?.uid || '',
      comments: [],
      createdAt: serverTimestamp(),
    })
    const newContact = {
      id: ref.id, name: form.name, trade, location: form.location,
      country: form.country, phone: form.phone, email: form.email,
      address: form.address, website: form.website, notes: form.notes,
      addedBy: userProfile?.name || user?.email, comments: [],
    }
    setContacts(prev => [newContact, ...prev])
    setForm({ name: '', trade: '', customTrade: '', location: '', country: '', phone: '', email: '', address: '', website: '', notes: '' })
    setShowAdd(false)
    setSaving(false)
  }

  async function handleAddComment(contactId) {
    if (!comment.trim()) return
    setSaving(true)
    const newComment = {
      text: comment.trim(),
      author: userProfile?.name || user?.email || 'Member',
      createdAt: new Date().toISOString(),
    }
    await updateDoc(doc(db, 'contacts', contactId), {
      comments: arrayUnion(newComment)
    })
    setContacts(prev => prev.map(c => c.id === contactId
      ? { ...c, comments: [...(c.comments || []), newComment] }
      : c
    ))
    setComment('')
    setShowCommentFor(null)
    setSaving(false)
  }

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.trade?.toLowerCase().includes(search.toLowerCase()) ||
      c.location?.toLowerCase().includes(search.toLowerCase()) ||
      c.notes?.toLowerCase().includes(search.toLowerCase())
    const matchTrade = !filterTrade || c.trade === filterTrade
    const matchLocation = !filterLocation ||
      c.location?.toLowerCase().includes(filterLocation.toLowerCase()) ||
      c.country?.toLowerCase().includes(filterLocation.toLowerCase())
    return matchSearch && matchTrade && matchLocation
  })

  const locations = [...new Set(contacts.map(c => c.country).filter(Boolean))].sort()

  return (
    <div className="contacts-page">
      <div className="contacts-header">
        <div>
          <h1>Marine Contacts</h1>
          <p className="contacts-subtitle">Community-recommended trades and services</p>
        </div>
        {user && (
          <button className="btn-add-contact" onClick={() => setShowAdd(true)}>
            + Add Contact
          </button>
        )}
      </div>

      <div className="contacts-search">
        <input className="search-input" type="text" placeholder="Search by name, trade or location..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-row">
          <select className="filter-select" value={filterTrade} onChange={e => setFilterTrade(e.target.value)}>
            <option value="">All Trades</option>
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {(search || filterTrade || filterLocation) && (
            <button className="btn-clear-filters" onClick={() => { setSearch(''); setFilterTrade(''); setFilterLocation('') }}>Clear</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="contacts-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="contacts-empty">
          <p>{contacts.length === 0 ? 'No contacts yet. Be the first to add a recommended trade.' : 'No contacts match your search.'}</p>
        </div>
      ) : (
        <div className="contacts-list">
          {filtered.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-card-header">
                <div className="contact-main">
                  <div className="contact-name-row">
                    <h3>{contact.name}</h3>
                    <span className="trade-badge">{contact.trade}</span>
                  </div>
                  <p className="contact-location">
                    {contact.location}{contact.country ? ', ' + contact.country : ''}
                  </p>
                  {contact.notes && <p className="contact-notes">{contact.notes}</p>}
                </div>
                <div className="contact-actions">
                  {contact.phone && (
                    <a href={'tel:' + contact.phone} className="contact-btn contact-btn-phone">
                      <span>Call</span>
                      <span className="contact-detail">{contact.phone}</span>
                    </a>
                  )}
                  {contact.email && (
                    <a href={'mailto:' + contact.email} className="contact-btn contact-btn-email">
                      <span>Email</span>
                      <span className="contact-detail">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a href={'https://wa.me/' + contact.phone.replace(/[^0-9]/g, '')}
                      target="_blank" rel="noopener noreferrer" className="contact-btn contact-btn-whatsapp">
                      WhatsApp
                    </a>
                  )}
                  {contact.website && (
                    <a href={contact.website} target="_blank" rel="noopener noreferrer"
                      className="contact-btn contact-btn-web">
                      Website
                    </a>
                  )}
                </div>
              </div>

              {contact.address && (
                <p className="contact-address">{contact.address}</p>
              )}

              <div className="contact-comments">
                {(contact.comments || []).length > 0 && (
                  <div className="comments-list">
                    <p className="comments-label">Recommendations ({contact.comments.length})</p>
                    {(contact.comments || []).map((c, i) => (
                      <div key={i} className="comment">
                        <p className="comment-text">"{c.text}"</p>
                        <span className="comment-author">- {c.author}</span>
                      </div>
                    ))}
                  </div>
                )}
                {user && showCommentFor !== contact.id && (
                  <button className="btn-add-comment" onClick={() => setShowCommentFor(contact.id)}>
                    + Add recommendation
                  </button>
                )}
                {user && showCommentFor === contact.id && (
                  <div className="add-comment-form">
                    <textarea className="comment-input" rows={2} value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Why do you recommend this contact? What work did they do?" />
                    <div className="comment-form-actions">
                      <button className="btn-submit-comment" onClick={() => handleAddComment(contact.id)}
                        disabled={saving || !comment.trim()}>
                        {saving ? 'Saving...' : 'Post'}
                      </button>
                      <button className="btn-cancel-comment" onClick={() => setShowCommentFor(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="contact-footer">
                <span className="contact-added">Added by {contact.addedBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="add-contact-overlay" onClick={() => setShowAdd(false)}>
          <div className="add-contact-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add a Contact</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>&#x2715;</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="af-field">
                  <span>Name / Business *</span>
                  <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Jean-Pierre Rigging" />
                </label>
                <label className="af-field">
                  <span>Trade *</span>
                  <select value={form.trade} onChange={e => updateForm('trade', e.target.value)}>
                    <option value="">Select trade</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              {form.trade === 'Other' && (
                <label className="af-field">
                  <span>Specify trade *</span>
                  <input value={form.customTrade} onChange={e => updateForm('customTrade', e.target.value)} placeholder="e.g. Teak Deck Specialist" />
                </label>
              )}
              <div className="form-row">
                <label className="af-field">
                  <span>Location / Port *</span>
                  <input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="e.g. Antibes" />
                </label>
                <label className="af-field">
                  <span>Country</span>
                  <input value={form.country} onChange={e => updateForm('country', e.target.value)} placeholder="e.g. France" />
                </label>
              </div>
              <div className="form-row">
                <label className="af-field">
                  <span>Phone</span>
                  <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="+33 6 00 00 00 00" />
                </label>
                <label className="af-field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="contact@example.com" />
                </label>
              </div>
              <label className="af-field">
                <span>Address (optional)</span>
                <input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Full address" />
              </label>
              <label className="af-field">
                <span>Website (optional)</span>
                <input value={form.website} onChange={e => updateForm('website', e.target.value)} placeholder="https://" />
              </label>
              <label className="af-field">
                <span>Why do you recommend them?</span>
                <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={3}
                  placeholder="What work have they done? What makes them special for Swan yachts?" />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-submit" onClick={handleAdd}
                disabled={saving || !form.name || (!form.trade && !form.customTrade) || !form.location}>
                {saving ? 'Adding...' : 'Add Contact'}
              </button>
              <button className="btn-cancel-modal" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
