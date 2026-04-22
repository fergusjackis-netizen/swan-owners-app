import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp, getDoc } from 'firebase/firestore'
import { getYacht } from '../services/firestore'
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

async function saveLocation(uid, data) {
  await setDoc(doc(db, 'locations', uid), {
    ...data, uid, visible: true, timestamp: serverTimestamp(),
  })
}

async function hideLocationDoc(uid) {
  await setDoc(doc(db, 'locations', uid), { visible: false, uid }, { merge: true })
}

async function loadLocations() {
  const snap = await getDocs(query(collection(db, 'locations'), where('visible', '==', true)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
  const [myLocation, setMyLocation] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    initMap()
    if (user) {
      loadMyYacht()
      checkExistingLocation()
    }
    fetchLocations()
  }, [user])

  async function loadMyYacht() {
    try {
      const yacht = await getYacht(user.uid)
      setMyYacht(yacht)
    } catch (e) {}
  }

  async function checkExistingLocation() {
    // Check if user already has a saved location from previous session
    try {
      const snap = await getDoc(doc(db, 'locations', user.uid))
      if (snap.exists() && snap.data().visible) {
        setMyLocation(snap.data())
        setSharing(true)
      }
    } catch (e) {}
  }

  async function fetchLocations() {
    try {
      const locs = await loadLocations()
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

  // Draw other boats
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

      const lastSeen = loc.timestamp?.toMillis ? timeAgo(loc.timestamp) : 'recently'
      const popupHTML = '<div style="font-family:Georgia,serif;padding:6px 8px;min-width:140px;background:#0d1629;border:1px solid #1e3a5f;">' +
        '<strong style="color:#e8e4d8;display:block;margin-bottom:2px">' + (loc.boatName || 'Swan') + '</strong>' +
        (loc.model ? '<span style="color:#6b8cae;font-size:12px;display:block">' + loc.model + '</span>' : '') +
        '<span style="color:' + (APPROACHABILITY_COLORS[loc.approachability] || '#c9a84c') + ';font-size:11px;display:block;margin-top:3px;font-weight:600">' + (APPROACHABILITY_LABELS[loc.approachability] || '') + '</span>' +
        '<span style="color:#3d5a78;font-size:11px;display:block;margin-top:2px">Last seen ' + lastSeen + '</span>' +
        '<span style="color:#c9a84c;font-size:11px;display:block;margin-top:4px">Click to view profile</span>' +
        '</div>'

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(popupHTML)
      const marker = new mapboxgl.Marker(el).setLngLat([loc.lng, loc.lat]).setPopup(popup).addTo(map.current)
      el.addEventListener('click', () => { if (loc.yachtId) navigate('/fleet/' + loc.yachtId) })
      markers.current[loc.uid] = marker
    })
  }, [mapReady, locations])

  // Draw my own marker
  useEffect(() => {
    if (!mapReady || !mapboxRef.current) return
    const mapboxgl = mapboxRef.current

    if (myMarker.current) myMarker.current.remove()

    if (myLocation && sharing) {
      const el = document.createElement('div')
      el.className = 'map-marker-me'
      myMarker.current = new mapboxgl.Marker(el)
        .setLngLat([myLocation.lng, myLocation.lat])
        .addTo(map.current)
    }
  }, [mapReady, myLocation, sharing])

  async function handleShareToggle() {
    if (sharing) {
      try {
        await hideLocationDoc(user.uid)
        setSharing(false)
        setMyLocation(null)
        if (myMarker.current) { myMarker.current.remove(); myMarker.current = null }
        setLocations(prev => prev.filter(l => l.uid !== user.uid))
      } catch (e) { setError('Could not hide location.') }
      return
    }

    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const locationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: myYacht?.name || userProfile?.name || 'Swan',
            model: myYacht?.model || '',
            approachability: myYacht?.approachability || 'chat',
            yachtId: user.uid,
          }
          await saveLocation(user.uid, locationData)
          setMyLocation({ ...locationData, timestamp: { toMillis: () => Date.now() } })
          setSharing(true)
          await fetchLocations()
          if (map.current) map.current.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 9, duration: 2000 })
        } catch (e) { setError('Could not share location.') }
      },
      () => setError('Could not get location. Please allow location access.')
    )
  }

  async function handleRefresh() {
    if (!navigator.geolocation) return
    setRefreshing(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const locationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            boatName: myYacht?.name || userProfile?.name || 'Swan',
            model: myYacht?.model || '',
            approachability: myYacht?.approachability || 'chat',
            yachtId: user.uid,
          }
          await saveLocation(user.uid, locationData)
          setMyLocation({ ...locationData, timestamp: { toMillis: () => Date.now() } })
          await fetchLocations()
        } catch (e) { setError('Could not refresh location.') }
        setRefreshing(false)
      },
      () => { setError('Could not get location.'); setRefreshing(false) }
    )
  }

  function timeAgo(ts) {
    if (!ts?.toMillis) return 'recently'
    const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago'
    return Math.floor(seconds / 604800) + 'w ago'
  }

  const myApproachability = myYacht?.approachability || 'chat'
  const visibleCount = locations.filter(l => l.uid !== user?.uid).length + (sharing ? 1 : 0)

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1>Live Map</h1>
          <p className="map-subtitle">{visibleCount} Swan{visibleCount !== 1 ? 's' : ''} currently visible</p>
        </div>
        <div className="map-header-buttons">
          {sharing && (
            <button className={"btn-refresh-location" + (refreshing ? " refreshing" : "")} onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Updating...' : 'Update Position'}
            </button>
          )}
          <button className={"btn-share-location" + (sharing ? " sharing" : "")} onClick={handleShareToggle}>
            {sharing ? 'Hide My Position' : 'Share My Position'}
          </button>
        </div>
      </div>

      {error && <p className="map-error">{error}</p>}

      {sharing && myLocation && (
        <div className="map-sharing-banner">
          <div className="sharing-dot" style={{ background: APPROACHABILITY_COLORS[myApproachability] }} />
          <div style={{ flex: 1 }}>
            <span>Visible as <strong>{myYacht?.name || userProfile?.name || 'Swan'}</strong></span>
            <span className="sharing-approachability" style={{ color: APPROACHABILITY_COLORS[myApproachability] }}>
              {' '}{APPROACHABILITY_LABELS[myApproachability]}
            </span>
            {myLocation.timestamp && (
              <span className="sharing-time"> - last updated {timeAgo(myLocation.timestamp)}</span>
            )}
          </div>
        </div>
      )}

      {!sharing && (
        <div className="map-notice">
          <p className="notice-title">How the Live Map works</p>
          <ul className="notice-list">
            <li>Tap Share My Position to appear on the map</li>
            <li>Your position is saved and remains visible even when you close the app</li>
            <li>Tap Update Position to refresh your location to where you are now</li>
            <li>Tap Hide My Position to disappear completely at any time</li>
            <li>Other boats show how long ago they last updated their position</li>
            <li>Set your approachability in My Yacht</li>
          </ul>
          <p className="map-approachability">
            Your approachability: <strong style={{ color: APPROACHABILITY_COLORS[myApproachability] }}>
              {APPROACHABILITY_LABELS[myApproachability]}
            </strong>{' - '}<a href="/my-yacht">Change in My Yacht</a>
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
    </div>
  )
}
