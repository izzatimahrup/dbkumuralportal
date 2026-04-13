import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { MapPin, Calendar, User, Tag, ExternalLink, X, ChevronLeft, ChevronRight, Navigation } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// api key from maptiler cloud
const MAPTILER_KEY = 'p3JDbbJLHWEKqJumUdqT'

// ─── Add 3D layers after map loads ───────────────────────────────────────────

function add3DLayers(map) {
  // Terrain elevation source
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

// ─── Directions Modal Component ───────────────────────────────────────────────

function DirectionsModal({ lat, lng, address, onClose }) {
  const hasLatLng = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))
  
  const googleUrl = hasLatLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  const wazeUrl = hasLatLng
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : address
    ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
    : null

  const appleUrl = hasLatLng
    ? `https://maps.apple.com/?daddr=${lat},${lng}`
    : address
    ? `https://maps.apple.com/?q=${encodeURIComponent(address)}`
    : null

  const openDirections = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif"
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        width: '300px',
        maxWidth: 'calc(100vw - 40px)',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Choose navigation app</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Select where to get directions</div>
        </div>
        
        <div style={{ padding: '16px 20px 20px' }}>
          {googleUrl && (
            <button
              onClick={() => openDirections(googleUrl)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1a73e8">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
              Google Maps
            </button>
          )}
          
          {wazeUrl && (
            <button
              onClick={() => openDirections(wazeUrl)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#33ccff">
                <circle cx="12" cy="12" r="10" fill="none" stroke="#33ccff" strokeWidth="2"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#33ccff" strokeWidth="2" fill="none"/>
                <circle cx="9" cy="9" r="1.5" fill="#33ccff"/>
                <circle cx="15" cy="9" r="1.5" fill="#33ccff"/>
              </svg>
              Waze
            </button>
          )}
          
          {appleUrl && (
            <button
              onClick={() => openDirections(appleUrl)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#555">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#555"/>
              </svg>
              Apple Maps
            </button>
          )}
          
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              marginTop: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#888',
              fontWeight: '500',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Maplibre Map Component (Clean - no buttons on map) ───────────────────────

function MaplibreMap({ lat, lng }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [is3D, setIs3D] = useState(true)

  const initialLat = lat && !isNaN(parseFloat(lat)) ? parseFloat(lat) : 1.5575
  const initialLng = lng && !isNaN(parseFloat(lng)) ? parseFloat(lng) : 110.3593

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
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([initialLng, initialLat])
        .addTo(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update map center if lat/lng change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !lat || !lng) return
    
    const newLat = parseFloat(lat)
    const newLng = parseFloat(lng)
    if (isNaN(newLat) || isNaN(newLng)) return

    if (markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat])
    }
    map.flyTo({ center: [newLng, newLat], duration: 500 })
  }, [lat, lng])

  const toggle3D = () => {
    const map = mapRef.current
    if (!map) return
    const next = !is3D
    setIs3D(next)
    map.easeTo({ pitch: next ? 45 : 0, bearing: next ? -15 : 0, duration: 600 })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={toggle3D}
        style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 10,
          fontSize: '10px', fontWeight: '600', padding: '4px 12px',
          borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)',
          background: is3D ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
          color: is3D ? 'white' : '#333',
          cursor: 'pointer', transition: 'all 0.25s', backdropFilter: 'blur(4px)'
        }}
      >
        {is3D ? '3D' : '2D'}
      </button>
      
      <div ref={mapContainer} style={{ width: '100%', height: '200px', background: '#f0f0f0' }} />
    </div>
  )
}

export default function PublicMuralPage() {
  const { muralId } = useParams()
  const [mural, setMural] = useState(null)
  const [images, setImages] = useState([])
  const [tags, setTags] = useState([])
  const [location, setLocation] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const galleryRef = useRef(null)
  const hasLoggedScan = useRef(false)
  // for mural preview in admin to skip scan log
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'

  // Get or create unique visitor ID (stored in browser)
  const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitor_id')
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : 
        Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('visitor_id', visitorId)
    }
    return visitorId
  }

  // Get visitor's public IP address and location
  const getVisitorLocation = async () => {
    const services = [
      'https://ipapi.co/json/',
      'https://api.ipify.org?format=json',
      'https://api.my-ip.io/ip.json'
    ]
    
    for (const service of services) {
      try {
        const response = await fetch(service)
        const data = await response.json()
        
        let ip = data.ip || data.ip_address || null
        let country = data.country_name || data.country || null
        let city = data.city || null
        
        if (ip) {
          console.log(`Got IP from ${service}:`, { ip, country, city })
          return { ip, country, city }
        }
      } catch (error) {
        console.log(`Service ${service} failed:`, error.message)
      }
    }
    
    console.warn('All IP services failed')
    return { ip: 'unknown', country: null, city: null }
  }

  // Log scan with both visitor_id and IP for uniqueness
  const logScan = async (id) => {
    const visitorId = getVisitorId()
    
    try {
      const { ip, country, city } = await getVisitorLocation()
      
      const scanData = { 
        mural_id: id, 
        visitor_id: visitorId,
        ip_address: ip,
        country: country || null,
        user_agent: navigator.userAgent,
        scanned_at: new Date().toISOString(),
        scan_date: new Date().toISOString().split('T')[0]
      }
      
      // Upsert using both visitor_id and ip_address
      const { error } = await supabase
        .from('qr_scans')
        .upsert(scanData, { 
          onConflict: 'mural_id,visitor_id,ip_address,scan_date' 
        })
      
      if (error) {
        console.error('Error logging scan:', error)
      } else {
        console.log('Scan logged successfully')
      }
      
    } catch (e) {
      console.error('Error in logScan:', e)
    }
  }

  const loadMural = useCallback(async () => {
    const { data, error } = await supabase
      .from('murals')
      .select('*, mural_locations(*), mural_images(*), mural_tags(*)')
      .eq('mural_id', muralId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setMural(data)

    const sorted = [...(data.mural_images || [])].sort((a, b) => {
      if (a.is_cover) return -1
      if (b.is_cover) return 1
      return a.sort_order - b.sort_order
    })
    setImages(sorted)
    setTags(data.mural_tags?.map(t => t.tag) || [])
    setLocation(data.mural_locations?.[0] || null)
    setLoading(false)
  }, [muralId])

  useEffect(() => {
    loadMural()
  }, [loadMural])

  // Log scan when mural loads (only once per mural per session)
  useEffect(() => {
    if (!mural) return
    if (hasLoggedScan.current) return
    if (isPreview) return  // skip scan for admin preview

    hasLoggedScan.current = true
    logScan(muralId)
  }, [mural, muralId])

  // Auto-scroll gallery strip to active thumbnail
  useEffect(() => {
    if (!galleryRef.current) return
    const activeThumb = galleryRef.current.children[activeImg]
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeImg])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return
    const handler = (e) => {
      if (e.key === 'ArrowRight') setLightbox(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft') setLightbox(i => Math.max(i - 1, 0))
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, images.length])

  const getYouTubeId = (url) => {
    if (!url) return null
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    return match ? match[1] : null
  }

  const handleOpenDirections = () => {
    setShowDirectionsModal(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8' }}>
      <p style={{ color: '#aaa', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf8', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>404</div>
      <h2 style={{ fontWeight: '700', fontSize: '20px' }}>Mural not found</h2>
      <p style={{ color: '#aaa', fontSize: '14px' }}>This QR may be invalid or the mural has been removed.</p>
    </div>
  )

  const ytId = getYouTubeId(mural.youtube_url)

  return (
    <>
      <div style={{ background: '#fafaf8', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

        {/* LIGHTBOX */}
        {lightbox !== null && (
          <div
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                width: '40px', height: '40px', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', letterSpacing: '1px'
            }}>
              {lightbox + 1} / {images.length}
            </div>

            {lightbox > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setLightbox(i => i - 1) }}
                style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                  width: '44px', height: '44px', cursor: 'pointer', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              src={images[lightbox]?.image_url}
              alt=""
              onClick={e => e.stopPropagation()}
              onTouchStart={e => e.currentTarget._touchX = e.touches[0].clientX}
              onTouchEnd={e => {
                const diff = e.currentTarget._touchX - e.changedTouches[0].clientX
                if (Math.abs(diff) > 40) {
                  if (diff > 0) setLightbox(i => Math.min(i + 1, images.length - 1))
                  else setLightbox(i => Math.max(i - 1, 0))
                }
              }}
              style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain', display: 'block', userSelect: 'none' }}
            />

            {lightbox < images.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightbox(i => i + 1) }}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                  width: '44px', height: '44px', cursor: 'pointer', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}
              >
                <ChevronRight size={22} />
              </button>
            )}

            {images.length > 1 && (
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setLightbox(i) }}
                    style={{
                      width: i === lightbox ? '16px' : '5px', height: '5px',
                      borderRadius: '3px', padding: 0, border: 'none', cursor: 'pointer',
                      background: i === lightbox ? 'white' : 'rgba(255,255,255,0.35)',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header - No QR or Edit buttons for public */}
        <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 10 }}>
          <img
            src="/dbku-logo.webp"
            alt="DBKU"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            onError={e => e.target.style.display = 'none'}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>DBKU Mural Registry Portal</div>
            {/* <div style={{ fontSize: '10px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div> */}
          </div>
        </div>

        {/* Hero image */}
        {images.length > 0 && (
          <div
            style={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: '460px', overflow: 'hidden', background: '#f0f0f0', cursor: 'zoom-in' }}
            onTouchStart={e => e.currentTarget._touchX = e.touches[0].clientX}
            onTouchEnd={e => {
              const diff = e.currentTarget._touchX - e.changedTouches[0].clientX
              if (Math.abs(diff) > 40) {
                if (diff > 0) setActiveImg(i => Math.min(i + 1, images.length - 1))
                else setActiveImg(i => Math.max(i - 1, 0))
              }
            }}
          >
            <div style={{
              display: 'flex',
              width: `${images.length * 100}%`,
              height: '100%',
              transform: `translateX(-${activeImg * (100 / images.length)}%)`,
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              {images.map((img, i) => (
                <div
                  key={img.id || i}
                  style={{ width: `${100 / images.length}%`, flexShrink: 0, height: '100%' }}
                  onClick={() => setLightbox(i)}
                >
                  <img src={img.image_url} alt={mural.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>

            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(0,0,0,0.4)', borderRadius: '6px',
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <ExternalLink size={11} color="white" />
              <span style={{ fontSize: '10px', color: 'white', fontWeight: '600' }}>Tap to expand</span>
            </div>

            {images.length > 1 && (
              <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setActiveImg(i) }}
                    style={{
                      width: i === activeImg ? '16px' : '5px', height: '5px',
                      borderRadius: '3px', background: i === activeImg ? 'white' : 'rgba(255,255,255,0.5)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery thumbnails */}
        {images.length > 1 && (
          <div style={{ padding: '16px 20px 0 20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
              Gallery
            </div>
            <div
              ref={galleryRef}
              style={{
                display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px',
                scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                msOverflowStyle: 'none', scrollbarWidth: 'none',
              }}
            >
              {images.map((img, i) => (
                <div key={img.id || i} onClick={() => setActiveImg(i)} style={{ cursor: 'pointer', flexShrink: 0, scrollSnapAlign: 'start' }}>
                  <img
                    src={img.image_url || img.preview}
                    alt={`Gallery ${i + 1}`}
                    style={{
                      width: '80px', height: '80px', objectFit: 'cover',
                      borderRadius: '8px', display: 'block',
                      border: i === activeImg ? '3px solid #0a0a0a' : '1px solid #e0e0e0',
                      opacity: i === activeImg ? 1 : 0.7,
                      transition: 'all 0.2s',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px 60px' }}>

          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', background: '#f0f0f0', padding: '3px 9px', borderRadius: '20px' }}>
              {mural.category}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.8px', lineHeight: '1.2', marginBottom: '14px', color: '#0a0a0a' }}>
            {mural.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}>
              <User size={12} color="#aaa" />
              <span>{mural.artist}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}>
              <Calendar size={12} color="#aaa" />
              <span>{mural.year_created}</span>
            </div>
          </div>

          {mural.description && (
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#333', marginBottom: '20px' }}>
              {mural.description}
            </p>
          )}

          {mural.story && (
            <div style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #ebebeb', borderLeft: '3px solid #0a0a0a' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
                The Story
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#444' }}>{mural.story}</p>
            </div>
          )}

          {ytId && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
                Video
              </div>
              <div style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe
                  width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${ytId}`}
                  frameBorder="0" allowFullScreen title="Mural video"
                  style={{ display: 'block' }}
                />
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
                  <span key={t} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'white', border: '1px solid #e0e0e0', color: '#555' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {location && (
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <MapPin size={11} color="#aaa" />
                  <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa' }}>Location</span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 4px' }}>{mural.title}</p>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px' }}>
                  {location.address}{location.city ? `, ${location.city}` : ''}
                </p>
              </div>

              {/* Maplibre 3D Map - Clean, no button on map */}
              {location.lat && location.lng && (
                <MaplibreMap
                  lat={location.lat}
                  lng={location.lng}
                />
              )}

              {/* Get Directions Button - Below the map, with black background */}
              <div style={{ padding: '14px 16px' }}>
                <button
                  onClick={handleOpenDirections}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: '10px 18px',
                    borderRadius: '30px',
                    border: 'none',
                    background: '#0a0a0a',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    width: 'auto',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#2a2a2a'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#0a0a0a'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <Navigation size={14} />
                  Get directions
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #ebebeb' }}>
            <span style={{ fontSize: '11px', color: '#bbb' }}>
              © 2026 Dewan Bandaraya Kuching Utara. All rights reserved.
            </span>
          </div>

        </div>
      </div>

      {/* Directions Modal */}
      {showDirectionsModal && location && (
        <DirectionsModal
          lat={location.lat}
          lng={location.lng}
          address={location.address}
          onClose={() => setShowDirectionsModal(false)}
        />
      )}
    </>
  )
}