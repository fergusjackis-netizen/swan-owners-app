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
    if (user) loadMyYacht()
  }, [user])

  async function loadMyYacht() {
    try {
      const yacht = await getYacht(user.uid)
      setMyYacht(yacht)
    } catch (e) {
      console.log('No yacht registered yet')
    }
  }

  async function loadLocations() {
    try {
      const locs = await getActiveLocations()
      setLocations(locs)
    } catch (e) {
      console.log('Could not load locations:', e)
    }
  }

  async function loadMap() {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) {
      setError('Map not configured. Please contact the administrator.')
      return
    }

    try {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxgl.accessToken = token

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [10, 45],
        zoom: 4,
      })

      map.current.on('load', () => {
        setMapLoaded(true)
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    } catch (e) {
      setError('Could not load map. Please refresh the page.')
      console.error('Map load error:', e)
    }
  }

  useEffect(() => {
    if (!mapLoaded || !map.current) return
    updateMarkers()
  }, [mapLoaded, locations])

  async function updateMarkers() {
    const mapboxgl = (await import('mapbox-gl')).default

    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    locations.forEach(loc => {
      if (!loc.lat || !loc.lng) return

      const el = document.createElement('div')
      el.className = 'map-marker'
      el.style.background = APPROACHABILITY_COLORS[loc.approachability] || '#c9a84c'

      const popupHTML = '<div class="map-popup">' +
        '<strong>' + (loc.boatName || 'Swan') + '</strong>' +
        (loc.model ? '<span>' + loc.model + '</span>' : '') +
        '<span class="popup-status">' + (APPROACHABILITY_LABELS[loc.approachability] || 'At sea') + '</span>' +
        '</div>'

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(popupHTML)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map.current)

      el.addEventListener('click', () => setSelectedBoat(loc))

      markers.current[loc.uid] = marker
    })
  }

  async function handleShareToggle() {
    if (sharing) {
      try {
        await hideLocation(user.uid)
        setSharing(false)
        setLocations(prev => prev.filter(l => l.uid !== user.uid))
      } catch (e) {
        setError('Could not hide location. Please try again.')
      }
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const locationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: myYacht?.name || userProfile?.name || 'Swan',
            model: myYacht?.model || '',
            approachability: myYacht?.approachability || 'chat',
          }
          await updateLocation(user.uid, locationData)
          setSharing(true)
          await loadLocations()
          if (map.current) {
            map.current.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 8,
            })
          }
        } catch (e) {
          setError('Could not share location. Please try again.')
          console.error('Share location error:', e)
        }
      },
      () => setError('Could not get your location. Please check browser permissions.')
    )
  }

  const myApproachability = myYacht?.approachability || 'chat'

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1>Live Map</h1>
          <p className="map-subtitle">
            {locations.length} Swan{locations.length !== 1 ? 's' : ''} currently visible
          </p>
        </div>
        <button
          className={"btn-share-location" + (sharing ? " sharing" : "")}
          onClick={handleShareToggle}
        >
          {sharing ? 'Hide My Position' : 'Share My Position'}
        </button>
      </div>

      {error && <p className="map-error">{error}</p>}

      {!sharing && (
        <div className="map-notice">
          <p>Your position is private by default. Tap Share My Position to appear on the map for other members.</p>
          <p className="map-approachability">
            Approachability: <strong>{APPROACHABILITY_LABELS[myApproachability]}</strong>
            <a href="/my-yacht"> Change in My Yacht</a>
          </p>
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
            <div className="boat-panel-avatar">
              {(selectedBoat.boatName || 'S')[0].toUpperCase()}
            </div>
            <div>
              <h3>{selectedBoat.boatName || 'Swan'}</h3>
              <p>{selectedBoat.model || ''}</p>
            </div>
          </div>
          <div className="boat-panel-status">
            <div className="status-dot-large"
              style={{ background: APPROACHABILITY_COLORS[selectedBoat.approachability] || '#c9a84c' }} />
            <span>{APPROACHABILITY_LABELS[selectedBoat.approachability] || 'At sea'}</span>
          </div>
          {user && selectedBoat.uid !== user.uid && (
            <a href={'/messages?to=' + selectedBoat.uid} className="btn-message">
              Send a Message
            </a>
          )}
        </div>
      )}
    </div>
  )
}
