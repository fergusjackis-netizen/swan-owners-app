import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getYacht } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'
import { sendContactEmail } from '../services/email'
import { SWAN_MODELS, YACHT_STATUS } from '../data/swanModels'
import './YachtProfile.css'

export default function YachtProfile() {
  const { yachtId } = useParams()
  const { user, userProfile } = useAuth()
  const [yacht, setYacht] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getYacht(yachtId).then(data => {
      setYacht(data)
      setLoading(false)
    })
  }, [yachtId])

  async function handleSendEmail() {
    if (!yacht?.ownerEmail) return setError('No contact email available for this yacht.')
    setSending(true)
    try {
      await sendContactEmail({
        to: yacht.ownerEmail,
        toName: yacht.ownerName || 'Swan Owner',
        fromBoat: userProfile?.yachtName || 'a fellow Swan',
        fromName: userProfile?.name || '',
        message,
        marina: yacht.homeMarina?.name || '',
      })
      setSent(true)
      setShowContact(false)
    } catch (e) {
      setError('Could not send email. Please try again.')
    }
    setSending(false)
  }

  function getStatusInfo(statusId) {
    return YACHT_STATUS?.find(s => s.id === statusId) || { label: 'Unknown', color: '#6b8cae' }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!yacht) return <div className="yacht-profile-page"><p>Yacht not found. <Link to="/fleet">Back to fleet</Link></p></div>

  const status = getStatusInfo(yacht.currentStatus)
  const modelData = SWAN_MODELS?.find(m => m.name === yacht.model)

  const whatsappNumber = yacht.whatsappPublic && yacht.whatsapp
    ? yacht.whatsapp.replace(/[^0-9]/g, '')
    : null

  const whatsappMessage = encodeURIComponent(
    'Hi! We spotted ' + (yacht.name || 'your Swan') + ' on Swan Owners Community and would love to connect. We are on ' + (userProfile?.name || 'a fellow Swan') + '.'
  )

  return (
    <div className="yacht-profile-page">
      <Link to="/fleet" className="back-link">Back to Fleet</Link>

      <div className="yacht-profile-hero">
        <div className="yacht-profile-photo">
          <span>{yacht.name?.[0] || 'S'}</span>
        </div>
        <div className="yacht-profile-title">
          <h1>{yacht.name}</h1>
          <p className="yacht-profile-model">{yacht.model}{yacht.flag ? ' - ' + yacht.flag : ''}</p>
          <div className="yacht-profile-status">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
            <span>{status.label}</span>
          </div>
        </div>
      </div>

      <div className="yacht-profile-grid">
        <div className="yacht-profile-main">
          <section className="profile-section">
            <h2>Boat Details</h2>
            <div className="profile-details">
              {yacht.year && <div className="detail-row"><span>Year</span><strong>{yacht.year}</strong></div>}
              {yacht.hullNumber && <div className="detail-row"><span>Hull Number</span><strong>{yacht.hullNumber}</strong></div>}
              {modelData?.loa && <div className="detail-row"><span>Length Overall</span><strong>{modelData.loa}m</strong></div>}
              {yacht.hullColour && <div className="detail-row"><span>Hull Colour</span><strong>{yacht.hullColour}</strong></div>}
              {yacht.homeMarina?.name && <div className="detail-row"><span>Home Marina</span><strong>{yacht.homeMarina.name}{yacht.homeMarina.country ? ', ' + yacht.homeMarina.country : ''}</strong></div>}
            </div>
          </section>

          {yacht.skipper && (
            <section className="profile-section">
              <h2>Skipper</h2>
              <div className="profile-details">
                {yacht.skipper.name && <div className="detail-row"><span>Name</span><strong>{yacht.skipper.name}</strong></div>}
                {yacht.skipper.nationality && <div className="detail-row"><span>Nationality</span><strong>{yacht.skipper.nationality}</strong></div>}
                {yacht.skipper.languages && <div className="detail-row"><span>Languages</span><strong>{yacht.skipper.languages}</strong></div>}
                {yacht.skipper.phonePublic && yacht.skipper.phone && <div className="detail-row"><span>Phone</span><strong>{yacht.skipper.phone}</strong></div>}
                {yacht.skipper.whatsapp && (
                  <div className="detail-row">
                    <span>WhatsApp</span>
                    <a href={'https://wa.me/' + yacht.skipper.whatsapp.replace(/[^0-9]/g,'') + '?text=' + whatsappMessage}
                      target="_blank" rel="noopener noreferrer" className="btn-whatsapp-small">
                      Message on WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {yacht.gardienne && yacht.gardienneMode !== 'none' && (
            <section className="profile-section">
              <h2>Gardienne</h2>
              <div className="profile-details">
                {yacht.gardienne.name && <div className="detail-row"><span>Name</span><strong>{yacht.gardienne.name}</strong></div>}
                {yacht.gardienne.location && <div className="detail-row"><span>Based at</span><strong>{yacht.gardienne.location}</strong></div>}
                {yacht.gardienne.languages && <div className="detail-row"><span>Languages</span><strong>{yacht.gardienne.languages}</strong></div>}
                {yacht.gardienne.phonePublic && yacht.gardienne.phone && <div className="detail-row"><span>Phone</span><strong>{yacht.gardienne.phone}</strong></div>}
                {yacht.gardienne.whatsapp && (
                  <div className="detail-row">
                    <span>WhatsApp</span>
                    <a href={'https://wa.me/' + yacht.gardienne.whatsapp.replace(/[^0-9]/g,'') + '?text=' + whatsappMessage}
                      target="_blank" rel="noopener noreferrer" className="btn-whatsapp-small">
                      Message on WhatsApp
                    </a>
                  </div>
                )}
                {yacht.gardienne.website && <div className="detail-row"><span>Website</span><a href={yacht.gardienne.website} target="_blank" rel="noopener noreferrer" className="profile-link">{yacht.gardienne.website}</a></div>}
              </div>
            </section>
          )}

          {yacht.notes && (
            <section className="profile-section">
              <h2>Notes from the Owner</h2>
              <p className="profile-notes">{yacht.notes}</p>
            </section>
          )}
        </div>

        <div className="yacht-profile-sidebar">
          <div className="contact-card">
            <h3>Contact</h3>
            <div className="approachability-badge" style={{ borderColor: yacht.approachability === 'open' ? '#22c55e' : yacht.approachability === 'private' ? '#6b8cae' : '#c9a84c' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: yacht.approachability === 'open' ? '#22c55e' : yacht.approachability === 'private' ? '#6b8cae' : '#c9a84c' }} />
              <span>{yacht.approachability === 'open' ? 'Open to visitors' : yacht.approachability === 'private' ? 'Private' : 'Happy to chat'}</span>
            </div>

            {sent && <p className="contact-sent">Message sent! They will receive an email from Swan Owners.</p>}

            {user && !sent && (
              <div className="contact-actions">
                {whatsappNumber && (
                  <a href={'https://wa.me/' + whatsappNumber + '?text=' + whatsappMessage}
                    target="_blank" rel="noopener noreferrer" className="btn-contact-whatsapp">
                    WhatsApp
                  </a>
                )}
                {yacht.phonePublic && yacht.phone && (
                  <a href={'tel:' + yacht.phone} className="btn-contact-phone">
                    {yacht.phone}
                  </a>
                )}
                {!showContact ? (
                  <button className="btn-contact-email" onClick={() => setShowContact(true)}>
                    Send Email
                  </button>
                ) : (
                  <div className="contact-form">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Optional message to include..."
                      rows={3}
                      className="contact-textarea"
                    />
                    {error && <p className="contact-error">{error}</p>}
                    <div className="contact-form-buttons">
                      <button className="btn-send-email" onClick={handleSendEmail} disabled={sending}>
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                      <button className="btn-cancel-email" onClick={() => setShowContact(false)}>Cancel</button>
                    </div>
                    <p className="contact-privacy">Your email address is not shared. They reply to hello@swan-owners.com.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
