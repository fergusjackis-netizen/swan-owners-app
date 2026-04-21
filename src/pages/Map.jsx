import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const mapContainer = useRef(null)
  const map = useRef(null)
  const mapboxRef = useRef(null)
  const markers = useRef({})
  const myMarker = useRef(null)
  const [locations, setLocations] = useState([])
  const [myYacht, setMyYacht] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [myPosition, setMyPosition] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    initMap()
    if (user) loadMyYacht()
    loadLocations()
  }, [user])

  async function loadMyYacht() {
    try {
      const yacht = await getYacht(user.uid)
      setMyYacht(yacht)
    } catch (e) {}
  }

  async function loadLocations() {
    try {
      const locs = await getActiveLocations()
      setLocations(locs)
      return locs
    } catch (e) { return [] }
  }

  async function initMap() {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) { setError('Map not configured.'); return }
    try {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxRef.current = mapboxgl
      mapboxgl.accessToken = token
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [10, 45],
        zoom: 4,
      })
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.on('load', () => setMapReady(true))
    } catch (e) { setError('Could not load map.') }
  }

  // Draw other boats - clicking navigates to their yacht profile
  useEffect(() => {
    if (!mapReady || !mapboxRef.current) return
    const mapboxgl = mapboxRef.current
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    locations.filter(loc => loc.uid !== user?.uid).forEach(loc => {
      if (!loc.lat || !loc.lng) return
      const el = document.createElement('div')
      el.className = 'map-marker-other'
      el.style.background = APPROACHABILITY_COLORS[loc.approachability] || '#c9a84c'
      el.style.cursor = 'pointer'
      el.title = loc.boatName || 'Swan'

      const popupHTML = '<div style="font-family:Georgia,serif;padding:6px 8px;min-width:130px;background:#0d1629;border:1px solid #1e3a5f;">' +
        '<strong style="color:#e8e4d8;display:block;margin-bottom:3px;font-size:14px">' + (loc.boatName || 'Swan') + '</strong>' +
        (loc.model ? '<span style="color:#6b8cae;font-size:12px;display:block;margin-bottom:4px">' + loc.model + '</span>' : '') +
        '<span style="color:' + (APPROACHABILITY_COLORS[loc.approachability] || '#c9a84c') + ';font-size:11px;display:block;font-weight:600">' +
        (APPROACHABILITY_LABELS[loc.approachability] || '') + '</span>' +
        '<span style="color:#c9a84c;font-size:11px;display:block;margin-top:6px;cursor:pointer;">Click to view profile</span>' +
        '</div>'

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(popupHTML)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map.current)

      el.addEventListener('click', () => {
        if (loc.yachtId) {
          navigate('/fleet/' + loc.yachtId)
        }
      })

      markers.current[loc.uid] = marker
    })
  }, [mapReady, locations])

  // My own pulsing gold marker
  useEffect(() => {
    if (!mapReady || !mapboxRef.current || !myPosition) return
    const mapboxgl = mapboxRef.current
    if (myMarker.current) myMarker.current.remove()
    const el = document.createElement('div')
    el.className = 'map-marker-me'
    myMarker.current = new mapboxgl.Marker(el)
      .setLngLat([myPosition.lng, myPosition.lat])
      .addTo(map.current)
  }, [mapReady, myPosition])

  useEffect(() => {
    if (!sharing && myMarker.current) {
      myMarker.current.remove()
      myMarker.current = null
    }
  }, [sharing])

  async function handleShareToggle() {
    if (sharing) {
      try {
        await hideLocation(user.uid)
        setSharing(false)
        setMyPosition(null)
        setLocations(prev => prev.filter(l => l.uid !== user.uid))
      } catch (e) { setError('Could not hide location.') }
      return
    }
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation(user.uid, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: myYacht?.name || userProfile?.name || 'Swan',
            model: myYacht?.model || '',
            approachability: myYacht?.approachability || 'chat',
            yachtId: user.uid,
          })
          setMyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setSharing(true)
          await loadLocations()
          if (map.current) map.current.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 9, duration: 2000 })
        } catch (e) { setError('Could not share location.'); console.error(e) }
      },
      () => setError('Could not get location. Please allow location access.')
    )
  }

  async function handleRefresh() {
    if (!sharing) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation(user.uid, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: myYacht?.name || userProfile?.name || 'Swan',
            model: myYacht?.model || '',
            approachability: myYacht?.approachability || 'chat',
            yachtId: user.uid,
          })
          setMyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          await loadLocations()
        } catch (e) { setError('Could not refresh location.') }
      },
      () => setError('Could not get location.')
    )
  }

  const myApproachability = myYacht?.approachability || 'chat'

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1>Live Map</h1>
          <p className="map-subtitle">{locations.length} Swan{locations.length !== 1 ? 's' : ''} currently sharing position</p>
        </div>
        <div className="map-header-buttons">
          {sharing && <button className="btn-refresh-location" onClick={handleRefresh}>Refresh Position</button>}
          <button className={"btn-share-location" + (sharing ? " sharing" : "")} onClick={handleShareToggle}>
            {sharing ? 'Hide My Position' : 'Share My Position'}
          </button>
        </div>
      </div>

      {error && <p className="map-error">{error}</p>}

      {!sharing && (
        <div className="map-notice">
          <p className="notice-title">How the Live Map works</p>
          <ul className="notice-list">
            <li>The app must be open and active to share your position</li>
            <li>Your position is never shared without your explicit consent</li>
            <li>Tap Share My Position to appear on the map</li>
            <li>Tap a dot to view that yacht's profile and make contact</li>
            <li>Tap Refresh Position to update your location while sharing</li>
            <li>Tap Hide My Position to disappear from the map at any time</li>
            <li>Set your approachability preference in My Yacht</li>
          </ul>
          <p className="map-approachability">
            Your approachability: <strong style={{ color: APPROACHABILITY_COLORS[myApproachability] }}>
              {APPROACHABILITY_LABELS[myApproachability]}
            </strong>{' - '}<a href="/my-yacht">Change in My Yacht</a>
          </p>
        </div>
      )}

      {sharing && (
        <div className="map-sharing-banner">
          <div className="sharing-dot" style={{ background: APPROACHABILITY_COLORS[myApproachability] }} />
          <span>You are visible as <strong>{myYacht?.name || userProfile?.name || 'Swan'}</strong></span>
          <span className="sharing-approachability" style={{ color: APPROACHABILITY_COLORS[myApproachability] }}>
            {APPROACHABILITY_LABELS[myApproachability]}
          </span>
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
    </div>
  )
}
