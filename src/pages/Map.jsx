import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getActiveLocations, updateLocation, hideLocation, getYacht } from '../services/firestore'
import './Map.css'

const APPROACHABILITY_COLORS = {
  open: '#22c55e',
  chat: '#c9a84c',
  private: '#6b8cae',
}

const APPROACHABILITY_LABELS = {
  open: 'Open to visitors',
  chat: 'Happy to chat',
  private: 'Private',
}

export default function Map() {
  const { user, userProfile } = useAuth()
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const [locations, setLocations] = useState([])
  const [myYacht, setMyYacht] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [selectedBoat, setSelectedBoat] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMap()
    loadLocations()
    loadMyYacht()
  }, [])

  async function loadMyYacht() {
    if (!user) return
    const yacht = await getYacht(user.uid)
    setMyYacht(yacht)
  }

  async function loadLocations() {
    const locs = await getActiveLocations()
    setLocations(locs)
  }

  async function loadMap() {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) {
      setError('Mapbox token not configured.')
      return
    }

    const mapboxgl = await import('mapbox-gl')
    await import('mapbox-gl/dist/mapbox-gl.css')
    mapboxgl.default.accessToken = token

    map.current = new mapboxgl.default.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [10, 45],
      zoom: 4,
    })

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right')
  }

  useEffect(() => {
    if (!mapLoaded || !map.current) return
    updateMarkers()
  }, [mapLoaded, locations])

  function updateMarkers() {
    const mapboxgl = window.mapboxgl
    if (!mapboxgl) return

    // Remove old markers
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    locations.forEach(loc => {
      if (!loc.lat || !loc.lng) return

      const el = document.createElement('div')
      el.className = 'map-marker'
      el.style.background = APPROACHABILITY_COLORS[loc.approachability] || '#c9a84c'
      el.title = loc.boatName

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(createPopupHTML(loc))

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map.current)

      el.addEventListener('click', () => {
        setSelectedBoat(loc)
      })

      markers.current[loc.uid] = marker
    })
  }

  function createPopupHTML(loc) {
    return '<div class="map-popup">' +
      '<strong>' + (loc.boatName || 'Unknown') + '</strong>' +
      '<span>' + (loc.model || '') + '</span>' +
      '<span class="popup-status">' + (APPROACHABILITY_LABELS[loc.approachability] || 'At sea') + '</span>' +
      '</div>'
  }

  async function handleShareToggle() {
    if (sharing) {
      await hideLocation(user.uid)
      setSharing(false)
      setLocations(prev => prev.filter(l => l.uid !== user.uid))
    } else {
      if (!navigator.geolocation) return setError('Geolocation not supported on this device.')
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await updateLocation(user.uid, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: myYacht?.name || userProfile?.name,
            model: myYacht?.model || '',
            approachability: myYacht?.approachability || 'chat',
          })
          setSharing(true)
          loadLocations()
          if (map.current) {
            map.current.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 8,
            })
          }
        },
        () => setError('Could not get your location. Please check browser permissions.')
      )
    }
  }

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1>Live Map</h1>
          <p className="map-subtitle">{locations.length} Swan{locations.length !== 1 ? 's' : ''} currently visible</p>
        </div>
        <div className="map-controls">
          <button
            className={"btn-share-location" + (sharing ? " sharing" : "")}
            onClick={handleShareToggle}
          >
            {sharing ? 'Hide My Position' : 'Share My Position'}
          </button>
        </div>
      </div>

      {error && <p className="map-error">{error}</p>}

      {!sharing && (
        <div className="map-notice">
          <p>Your position is private by default. Tap "Share My Position" to appear on the map for other members.</p>
          {myYacht && (
            <p className="map-approachability">
              Your approachability is set to: <strong>{APPROACHABILITY_LABELS[myYacht.approachability] || 'Happy to chat'}</strong>.
              <a href="/my-yacht"> Change in My Yacht</a>
            </p>
          )}
        </div>
      )}

      <div className="map-legend">
        {Object.entries(APPROACHABILITY_COLORS).map(([key, color]) => (
          <div key={key} className="legend-item">
            <div className="legend-dot" style={{ background: color }} />
            <span>{APPROACHABILITY_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <div className="map-container" ref={mapContainer} />

      {selectedBoat && (
        <div className="boat-panel">
          <button className="boat-panel-close" onClick={() => setSelectedBoat(null)}>x</button>
          <div className="boat-panel-header">
            <div className="boat-panel-avatar">{selectedBoat.boatName?.[0] || 'S'}</div>
            <div>
              <h3>{selectedBoat.boatName}</h3>
              <p>{selectedBoat.model}</p>
            </div>
          </div>
          <div className="boat-panel-status">
            <div className="status-dot-large"
              style={{ background: APPROACHABILITY_COLORS[selectedBoat.approachability] || '#c9a84c' }} />
            <span>{APPROACHABILITY_LABELS[selectedBoat.approachability] || 'At sea'}</span>
          </div>
          {selectedBoat.uid !== user?.uid && (
            <a href={'/messages?to=' + selectedBoat.uid} className="btn-message">
              Send a Message
            </a>
          )}
        </div>
      )}
    </div>
  )
}