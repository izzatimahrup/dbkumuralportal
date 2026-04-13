import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { Eye, EyeOff, MapPin, User, Calendar, Tag, ExternalLink, Crosshair } from 'lucide-react'
import { logActivity } from '../../helpers/logActivity'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// api key from maptiler cloud
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

const CATEGORIES = ['Heritage', 'Nature', 'Culture', 'Modern', 'Abstract', 'Community', 'Other']

const empty = {
  mural_id: '', title: '', artist: '', year_created: new Date().getFullYear(),
  category: 'Heritage', status: 'active', description: '', story: '', youtube_url: '',
  address: '', lat: '', lng: '', google_maps_url: '', tags: ''
}

// Helper function to generate the next mural ID
async function getNextMuralId() {
  const { data: murals, error } = await supabase
    .from('murals')
    .select('mural_id')
    .order('mural_id', { ascending: true })

  if (error) throw error

  const numbers = murals
    .map(m => {
      const match = m.mural_id.match(/DBKU-MURAL-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter(n => !isNaN(n))

  let nextNumber = 1
  const sortedNumbers = numbers.sort((a, b) => a - b)

  for (let i = 0; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] > nextNumber) break
    if (sortedNumbers[i] === nextNumber) nextNumber++
  }

  const formattedNumber = nextNumber.toString().padStart(3, '0')
  return `DBKU-MURAL-${formattedNumber}`
}

// ─── Add 3D layers after map loads ───────────────────────────────────────────

function add3DLayers(map) {
  // Terrain elevation source (Maptiler RGB-encoded DEM)
  if (!map.getSource('maptiler-dem')) {
    map.addSource('maptiler-dem', {
      type: 'raster-dem',
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
      tileSize: 256,
    })
  }
  map.setTerrain({ source: 'maptiler-dem', exaggeration: 1.5 })

  // Atmospheric sky
  if (!map.getLayer('sky')) {
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 90.0],
        'sky-atmosphere-sun-intensity': 15,
      },
    })
  }

  // 3D building extrusion
  if (!map.getLayer('3d-buildings')) {
    map.addLayer({
      id: '3d-buildings',
      source: 'openmaptiles',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'], ['get', 'render_height'],
          0,   '#ede9e1',
          20,  '#ddd8ce',
          50,  '#ccc5b8',
          100, '#b8b0a0',
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          14,   0,
          14.5, ['get', 'render_height'],
        ],
        'fill-extrusion-base': ['get', 'render_min_height'],
        'fill-extrusion-opacity': 0.88,
      },
    })
  }
}

// ─── Location Picker with Maplibre 3D ─────────────────────────────────────────

function LocationPickerMaplibre({ lat, lng, onLocationChange, onAddressChange }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [is3D, setIs3D] = useState(true)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const initialLat = lat && !isNaN(parseFloat(lat)) ? parseFloat(lat) : 1.5575
  const initialLng = lng && !isNaN(parseFloat(lng)) ? parseFloat(lng) : 110.3593

  // Reverse geocode function
  const reverseGeocode = async (latitude, longitude) => {
    setIsGeocoding(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      if (data.display_name) {
        onAddressChange(data.display_name)
      }
    } catch (err) {
      console.error('Geocoding error:', err)
    } finally {
      setIsGeocoding(false)
    }
  }

  // Update marker position
  const updateMarkerPosition = (map, newLat, newLng) => {
    if (markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat])
    } else {
      // Create marker element
      const el = document.createElement('div')
      el.style.cssText = 'cursor:pointer;'
      el.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;border:3px solid white;overflow:hidden;background:#0a0a0a;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="width:2px;height:12px;background:#0a0a0a;margin-left:19px;"></div>
        <div style="width:8px;height:8px;background:#0a0a0a;border-radius:50%;margin-left:16px;margin-top:-2px;"></div>
      `
      markerRef.current = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([newLng, newLat])
        .addTo(map)

      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current.getLngLat()
        onLocationChange(lngLat.lat, lngLat.lng)
        reverseGeocode(lngLat.lat, lngLat.lng)
      })
    }
  }

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [initialLng, initialLat],
      zoom: 16,
      pitch: 45,
      bearing: -15,
      antialias: true,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    mapRef.current = map

    map.on('load', () => {
      add3DLayers(map)
      updateMarkerPosition(map, initialLat, initialLng)
    })

    // Handle click on map
    map.on('click', (e) => {
      const { lat: clickedLat, lng: clickedLng } = e.lngLat
      onLocationChange(clickedLat, clickedLng)
      updateMarkerPosition(map, clickedLat, clickedLng)
      reverseGeocode(clickedLat, clickedLng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // Update marker when lat/lng props change externally
  useEffect(() => {
    const map = mapRef.current
    if (!map || !lat || !lng) return
    
    const newLat = parseFloat(lat)
    const newLng = parseFloat(lng)
    if (isNaN(newLat) || isNaN(newLng)) return

    updateMarkerPosition(map, newLat, newLng)
    map.flyTo({ center: [newLng, newLat], duration: 500 })
  }, [lat, lng])

  // Toggle 3D
  const toggle3D = () => {
    const map = mapRef.current
    if (!map) return
    const next = !is3D
    setIs3D(next)
    map.easeTo({ pitch: next ? 45 : 0, bearing: next ? -15 : 0, duration: 600 })
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '8px', flexWrap: 'wrap', gap: '8px'
      }}>
        <div>
          <div style={{
            fontSize: '11px', color: '#888', fontWeight: '700', letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Pin Location on Map
          </div>
          <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <MapPin size={12} />
            <span>Click on the map or drag the marker to set exact location</span>
          </div>
        </div>
        <button
          onClick={toggle3D}
          style={{
            fontSize: '10px', fontWeight: '600', padding: '4px 12px',
            borderRadius: '20px', border: '1px solid #e8e6e2',
            background: is3D ? '#0a0a0a' : '#f2f0ec',
            color: is3D ? 'white' : '#555',
            cursor: 'pointer', transition: 'all 0.25s',
          }}
        >
          {is3D ? '3D ' : '2D '}
        </button>
      </div>

      <div ref={mapContainer} style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />

      {isGeocoding && (
        <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
          Getting address...
        </div>
      )}

      {lat && lng && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#f8f8f6', borderRadius: '10px', fontSize: '12px', color: '#555' }}>
          <strong>Coordinates:</strong> {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
        </div>
      )}

      <style>{`
        .maplibregl-map .maplibregl-canvas {
          outline: none;
        }
      `}</style>
    </div>
  )
}

// Preview Panel with GALLERY (thumbnails below main image)
function PreviewPanel({ form, images, onClose }) {
  const [activeImg, setActiveImg] = useState(0)

  const getYouTubeId = (url) => {
    if (!url) return null
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    return match ? match[1] : null
  }

  const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
  const ytId = getYouTubeId(form.youtube_url)

  const mapsUrl = form.google_maps_url || (form.lat && form.lng ? `https://www.google.com/maps?q=${form.lat},${form.lng}` : null)

  // Static map preview using OpenStreetMap static
  const getMapPreview = () => {
    if (form.lat && form.lng) {
      return `https://staticmap.openstreetmap.de/staticmap.php?center=${form.lat},${form.lng}&zoom=15&size=400x200&maptype=mapnik&markers=${form.lat},${form.lng},ol-marker`
    }
    return null
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
      background: '#fafaf8', borderLeft: '1px solid #e0e0e0',
      zIndex: 200, overflowY: 'auto', fontFamily: "'DM Sans', sans-serif",
      boxShadow: '-4px 0 24px rgba(0,0,0,0.08)'
    }}>
      <div style={{
        position: 'sticky', top: 0, background: 'white',
        borderBottom: '1px solid #ebebeb', padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700' }}>Public Preview</div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>Mobile view (390px)</div>
        </div>
        <button onClick={onClose} style={{
          background: '#f5f5f5', border: 'none', borderRadius: '8px',
          padding: '7px 12px', fontSize: '12px', color: '#555', cursor: 'pointer', fontWeight: '600'
        }}>Close</button>
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/dbku-logo.webp" alt="DBKU" style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700' }}>DBKU Mural Registry</div>
          <div style={{ fontSize: '10px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div>
        </div>
      </div>

      {/* MAIN IMAGE */}
      {images.length > 0 ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#f0f0f0' }}>
          <img src={images[activeImg]?.image_url || images[activeImg]?.preview} alt={form.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
              {images.map((_, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  width: i === activeImg ? '16px' : '5px', height: '5px',
                  borderRadius: '3px', background: i === activeImg ? 'white' : 'rgba(255,255,255,0.5)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0
                }} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: '100%', aspectRatio: '16/9', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', color: '#bbb' }}>No images uploaded yet</span>
        </div>
      )}

      {/* GALLERY THUMBNAILS */}
      {images.length > 1 && (
        <div style={{ padding: '16px 20px 0 20px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
            Gallery
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }}>
            {images.map((img, i) => (
              <div key={img.id || i} onClick={() => setActiveImg(i)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                <img
                  src={img.image_url || img.preview}
                  alt={`Gallery ${i + 1}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: i === activeImg ? '3px solid #0a0a0a' : '1px solid #e0e0e0',
                    opacity: i === activeImg ? 1 : 0.7
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '24px 20px 60px' }}>
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', background: '#f0f0f0', padding: '3px 9px', borderRadius: '20px' }}>
            {form.category || 'Category'}
          </span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.8px', lineHeight: '1.2', marginBottom: '14px', color: form.title ? '#0a0a0a' : '#ccc' }}>
          {form.title || 'Mural Title'}
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}>
            <User size={12} color="#aaa" />
            <span style={{ color: form.artist ? '#555' : '#ccc' }}>{form.artist || 'Artist name'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}>
            <Calendar size={12} color="#aaa" />
            <span>{form.year_created}</span>
          </div>
        </div>

        {form.description ? (
          <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#333', marginBottom: '20px' }}>{form.description}</p>
        ) : (
          <p style={{ fontSize: '14px', color: '#ddd', marginBottom: '20px', fontStyle: 'italic' }}>Description will appear here...</p>
        )}

        {form.story && (
          <div style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #ebebeb', borderLeft: '3px solid #0a0a0a' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>The Story</div>
            <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#444' }}>{form.story}</p>
          </div>
        )}

        {ytId && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>Video</div>
            <div style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9' }}>
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} frameBorder="0" allowFullScreen title="Mural video" style={{ display: 'block' }} />
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <Tag size={10} color="#aaa" />
              <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa' }}>Tags</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tags.map(t => (
                <span key={t} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'white', border: '1px solid #e0e0e0', color: '#555' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {form.address && (
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <MapPin size={11} color="#000000" />
                <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa' }}>Location</span>
              </div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 4px' }}>{form.title || 'Mural'}</p>
              <p style={{ fontSize: '12px', color: '#000000', margin: '0 0 12px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <MapPin size={12} style={{ flexShrink: 0, marginTop: '1px' }} color="#000000" />
                {form.address}
              </p>
            </div>
            {getMapPreview() ? (
              <div style={{ width: '100%', height: '200px', overflow: 'hidden', background: '#f0f0f0' }}>
                <img src={getMapPreview()} alt="Location map" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;font-size:12px">Map preview unavailable</div>'
                  }}
                />
              </div>
            ) : (
              <div style={{ width: '100%', height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                No location coordinates available
              </div>
            )}
            {/* Open in Maps link */}
            {mapsUrl && (
              <div style={{ padding: '10px 16px 14px' }}>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#000000', fontWeight: '600', textDecoration: 'none' }}>
                  <ExternalLink size={11} /> Open in Maps
                </a>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #ebebeb' }}>
          <span style={{ fontSize: '11px', color: '#bbb' }}>Dewan Bandaraya Kuching Utara · Mural Registry</span>
        </div>
      </div>
    </div>
  )
}

export default function MuralForm({ mural, onDone }) {
  const isEdit = !!mural
  const [form, setForm] = useState(empty)
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [generatingId, setGeneratingId] = useState(false)
  const [tempMuralId, setTempMuralId] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    if (isEdit) {
      setForm({
        mural_id: mural.mural_id || '',
        title: mural.title || '',
        artist: mural.artist || '',
        year_created: mural.year_created || new Date().getFullYear(),
        category: mural.category || 'Heritage',
        status: mural.status || 'active',
        description: mural.description || '',
        story: mural.story || '',
        youtube_url: mural.youtube_url || '',
        address: mural.mural_locations?.[0]?.address || '',
        lat: mural.mural_locations?.[0]?.lat || '',
        lng: mural.mural_locations?.[0]?.lng || '',
        google_maps_url: mural.mural_locations?.[0]?.google_maps_url || '',
        tags: ''
      })
      loadTags(mural.id)
      loadImages(mural.id)
      setTempMuralId(mural.id)
    } else {
      generateNewMuralId()
      const tempId = `temp_${Date.now()}`
      setTempMuralId(tempId)
    }
  }, [mural, isEdit])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    setGettingLocation(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        set('lat', latitude.toString())
        set('lng', longitude.toString())
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        set('google_maps_url', mapsUrl)
        setGettingLocation(false)
        setSuccess("Location detected! You can now drag the marker to adjust.")

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              set('address', data.display_name)
            }
          })
          .catch(err => console.error('Reverse geocoding error:', err))
      },
      (error) => {
        setGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Location permission denied. Please allow location access.")
            break
          case error.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.")
            break
          case error.TIMEOUT:
            setError("Location request timed out.")
            break
          default:
            setError("An unknown error occurred.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const generateNewMuralId = async () => {
    setGeneratingId(true)
    try {
      const newId = await getNextMuralId()
      setForm(f => ({ ...f, mural_id: newId }))
    } catch (err) {
      console.error('Failed to generate mural ID:', err)
      setError('Failed to generate Mural ID. Please try again.')
    } finally {
      setGeneratingId(false)
    }
  }

  const loadTags = async (muralId) => {
    const { data } = await supabase.from('mural_tags').select('tag').eq('mural_id', muralId)
    if (data) setForm(f => ({ ...f, tags: data.map(t => t.tag).join(', ') }))
  }

  const loadImages = async (muralId) => {
    const { data } = await supabase.from('mural_images').select('*').eq('mural_id', muralId).order('sort_order')
    if (data) setImages(data)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleLocationChange = (lat, lng) => {
    set('lat', lat.toString())
    set('lng', lng.toString())
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
    set('google_maps_url', mapsUrl)
  }

  const handleAddressChange = (address) => {
    set('address', address)
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)

    if (!isEdit && tempMuralId && tempMuralId.toString().startsWith('temp_')) {
      const newImages = []
      for (const file of files) {
        const previewUrl = URL.createObjectURL(file)
        const isCover = images.length === 0 && newImages.length === 0
        newImages.push({
          id: `temp_${Date.now()}_${Math.random()}`,
          preview: previewUrl,
          file: file,
          is_cover: isCover,
          sort_order: images.length + newImages.length,
          temp: true
        })
      }
      setImages([...images, ...newImages])
      setUploading(false)
      return
    }

    let muralDbId = tempMuralId
    if (!muralDbId || muralDbId.toString().startsWith('temp_')) {
      setError('Please save the mural first before uploading images.')
      setUploading(false)
      return
    }

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${muralDbId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('mural-images').upload(path, file)
      if (uploadErr) {
        setError('Upload failed: ' + uploadErr.message)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('mural-images').getPublicUrl(path)
      const isCover = images.length === 0
      await supabase.from('mural_images').insert({
        mural_id: muralDbId,
        image_url: publicUrl,
        is_cover: isCover,
        sort_order: images.length
      })
    }
    await loadImages(muralDbId)
    setUploading(false)
  }

  const saveTempImages = async (muralDbId) => {
    const tempImages = images.filter(img => img.temp)
    if (tempImages.length === 0) return

    for (let i = 0; i < tempImages.length; i++) {
      const img = tempImages[i]
      const ext = img.file.name.split('.').pop()
      const path = `${muralDbId}/${Date.now()}_${i}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('mural-images').upload(path, img.file)
      if (uploadErr) {
        console.error('Failed to upload temp image:', uploadErr)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('mural-images').getPublicUrl(path)
      const isCover = img.is_cover
      await supabase.from('mural_images').insert({
        mural_id: muralDbId,
        image_url: publicUrl,
        is_cover: isCover,
        sort_order: img.sort_order
      })
    }

    tempImages.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview)
    })

    await loadImages(muralDbId)
  }

  const setCover = async (imgId, muralDbId) => {
    // Handle temporary images (not yet saved to database)
    if (typeof imgId === 'string' && imgId.startsWith('temp_')) {
      const updatedImages = images.map(img => ({
        ...img,
        is_cover: img.id === imgId
      }))
      setImages(updatedImages)
      return
    }

    try {
      // set all images to is_cover = false for this mural
      const { error: updateError } = await supabase
        .from('mural_images')
        .update({ is_cover: false })
        .eq('mural_id', muralDbId)
      
      if (updateError) {
        console.error('Error resetting cover status:', updateError)
        return
      }

      // Then set the selected image as cover
      const { error: coverError } = await supabase
        .from('mural_images')
        .update({ is_cover: true })
        .eq('id', imgId)

      if (coverError) {
        console.error('Error setting cover image:', coverError)
        return
      }

      // Reload images to reflect the changes
      await loadImages(muralDbId)
    } catch (err) {
      console.error('Error in setCover:', err)
      setError('Failed to update cover image')
    }
  }

  const deleteImage = async (img, muralDbId) => {
    if (img.temp) {
      if (img.preview) URL.revokeObjectURL(img.preview)
      const newImages = images.filter(i => i.id !== img.id)
      setImages(newImages)
      return
    }

    const { error } = await supabase.from('mural_images').delete().eq('id', img.id)
    if (error) {
      console.error('Error deleting image:', error)
      setError('Failed to delete image')
      return
    }
    await loadImages(muralDbId)
  }

  const handleSave = async () => {
    if (!form.mural_id || !form.title || !form.artist) {
      setError('Mural ID, Title and Artist are required.')
      return
    }

    if (!isEdit) {
      const { data: existing } = await supabase
        .from('murals')
        .select('id')
        .eq('mural_id', form.mural_id)
        .single()

      if (existing) {
        await generateNewMuralId()
        setError('ID conflict detected. A new ID has been generated. Please save again.')
        return
      }
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      mural_id: form.mural_id,
      title: form.title,
      artist: form.artist,
      year_created: parseInt(form.year_created),
      category: form.category,
      status: form.status,
      description: form.description,
      story: form.story,
      youtube_url: form.youtube_url,
    }

    let muralDbId = mural?.id
    if (isEdit) {
      const { error: e } = await supabase.from('murals').update(payload).eq('id', muralDbId)
      if (e) {
        setError(e.message)
        setSaving(false)
        return
      }
      await logActivity('updated', { mural_id: form.mural_id, title: form.title })
    } else {
      const { data, error: e } = await supabase.from('murals').insert(payload).select().single()
      if (e) {
        setError(e.message)
        setSaving(false)
        return
      }
      muralDbId = data.id
      setTempMuralId(muralDbId)
      await logActivity('created', { mural_id: form.mural_id, title: form.title })
      await saveTempImages(muralDbId)
    }

    const locPayload = {
      mural_id: muralDbId,
      address: form.address,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      google_maps_url: form.google_maps_url,
      city: 'Kuching',
      state: 'Sarawak'
    }
    const existing = isEdit ? mural.mural_locations?.[0] : null
    if (existing) {
      await supabase.from('mural_locations').update(locPayload).eq('id', existing.id)
    } else {
      await supabase.from('mural_locations').insert(locPayload)
    }

    await supabase.from('mural_tags').delete().eq('mural_id', muralDbId)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length) {
      await supabase.from('mural_tags').insert(tags.map(tag => ({ mural_id: muralDbId, tag })))
    }

    setSuccess(isEdit ? 'Mural updated!' : 'Mural created!')
    setSaving(false)
    if (!isEdit) setTimeout(onDone, 1000)
  }

  const inp = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ fontSize: '11px', color: '#888', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        disabled={key === 'mural_id' && !isEdit}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1.5px solid #e0e0e0',
          fontSize: '14px',
          outline: 'none',
          background: key === 'mural_id' && !isEdit ? '#f5f5f5' : 'white',
          cursor: key === 'mural_id' && !isEdit ? 'not-allowed' : 'text'
        }}
        onFocus={e => e.target.style.borderColor = '#0a0a0a'}
        onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', gap: '24px', transition: 'all 0.3s' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #ebebeb' }}>
            {error && <div style={{ background: '#fff0f0', border: '1px solid #fcc', color: '#c00', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              {inp('Mural ID *', 'mural_id', 'text', 'DBKU-MURAL-001')}
              {generatingId && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '-10px', marginBottom: '16px' }}>
                  Generating unique ID...
                </div>
              )}
              {inp('Title *', 'title', 'text', 'e.g. Warisan Kuching Lama')}
              {inp('Artist *', 'artist', 'text', 'e.g. Ahmad')}
              {inp('Year Created', 'year_created', 'number', '2024')}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '14px', background: 'white', outline: 'none' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '14px', background: 'white', outline: 'none' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#888', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Short description visible to public..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '14px', resize: 'vertical', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#888', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Story / Background</label>
              <textarea value={form.story} onChange={e => set('story', e.target.value)} rows={4} placeholder="The story behind this mural..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '14px', resize: 'vertical', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
            </div>

            {inp('YouTube URL', 'youtube_url', 'url', 'https://www.youtube.com/watch?v=...')}
            {inp('Tags (comma separated)', 'tags', 'text', 'heritage, culture, kuching')}

            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '24px 0' }} />
            <h3 style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>Location</h3>

            <div style={{ marginBottom: '20px' }}>
              <button onClick={getCurrentLocation} disabled={gettingLocation} style={{
                width: '100%', padding: '12px 20px', background: gettingLocation ? '#ccc' : '#0a0a0a',
                color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', cursor: gettingLocation ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}>
                <Crosshair size={18} />
                {gettingLocation ? 'Getting GPS position...' : 'Use My Current Location'}
              </button>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', textAlign: 'center' }}>
                Uses your phone's GPS for precise location
              </div>
            </div>

            <LocationPickerMaplibre
              lat={form.lat}
              lng={form.lng}
              onLocationChange={handleLocationChange}
              onAddressChange={handleAddressChange}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: '16px' }}>
              {inp('Address', 'address', 'text', 'Jalan Carpenter, Kuching')}
              {inp('Google Maps URL', 'google_maps_url', 'url', 'https://maps.google.com/...')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: '16px' }}>
              {inp('Latitude', 'lat', 'text', '1.5535')}
              {inp('Longitude', 'lng', 'text', '110.3593')}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '24px 0' }} />
            <h3 style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>Images</h3>
            <p style={{ fontSize: '11px', color: '#bbb', marginBottom: '14px' }}>
                Click an image to set it as cover.
            </p>

            {/* Image Upload Section — cover has bold border, no label buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {images.map(img => (
                <div
                  key={img.id}
                  style={{
                    position: 'relative',
                    width: '90px',
                    height: '90px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: img.is_cover ? '3px solid #0a0a0a' : '2px solid #eee',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  onClick={() => setCover(img.id, tempMuralId)}
                  title={img.is_cover ? 'Cover image' : 'Click to set as cover'}
                >
                  <img src={img.image_url || img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Delete button only */}
                  <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); deleteImage(img, tempMuralId) }}
                      style={{
                        width: '20px', height: '20px',
                        background: 'rgba(0,0,0,0.65)',
                        color: 'white', border: 'none', borderRadius: '50%',
                        fontSize: '10px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1
                      }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>

            <label style={{ display: 'inline-block', padding: '9px 16px', background: '#f8f8f6', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
              {uploading ? 'Uploading...' : '+ Upload Images'}
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
              Upload multiple images. Click any image to set it as the cover.
            </div>

            <div style={{ marginTop: '28px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={handleSave} disabled={saving || generatingId} style={{
                padding: '11px 24px', background: (saving || generatingId) ? '#aaa' : '#0a0a0a',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '600', cursor: (saving || generatingId) ? 'not-allowed' : 'pointer'
              }}>
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Mural'}
              </button>

              <button onClick={() => setShowPreview(!showPreview)} style={{
                padding: '11px 20px',
                background: showPreview ? '#0a0a0a' : '#f8f8f6',
                color: showPreview ? 'white' : '#555',
                border: '1px solid ' + (showPreview ? '#0a0a0a' : '#e0e0e0'),
                borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer'
              }}>
                {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>

              <button onClick={onDone} style={{
                padding: '11px 18px', background: 'white', border: '1px solid #e0e0e0',
                borderRadius: '10px', fontSize: '14px', color: '#888', cursor: 'pointer'
              }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && <PreviewPanel form={form} images={images} onClose={() => setShowPreview(false)} />}
    </>
  )
}