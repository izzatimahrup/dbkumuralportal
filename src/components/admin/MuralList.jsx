import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import QRModal from './QRModal'
import { logActivity } from '../../helpers/logActivity'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  QrCode, Pencil, Trash2, Image, ToggleLeft, ToggleRight,
  Search, X, MapPin, User, Calendar, Tag, ExternalLink, Navigation
} from 'lucide-react'

// api key from maptiler cloud
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

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
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#555"/>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#555" opacity="0.3"/>
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

// ─── Maplibre Map Component for Preview (NO button on map) ───────────────────

function MaplibreMapPreview({ lat, lng }) {
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
      
      {/* NO directions button on map - removed */}
      
      <div ref={mapContainer} style={{ width: '100%', height: '200px', background: '#f0f0f0' }} />
    </div>
  )
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return width
}

// Mobile Preview with Maplibre 3D
function MobilePreviewModal({ mural, onClose, onEdit, onOpenQR }) {
  const [activeImg, setActiveImg] = useState(0)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 600

  const images = [...(mural.mural_images || [])].sort((a, b) => {
    if (a.is_cover) return -1
    if (b.is_cover) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  const location = mural.mural_locations?.[0] || null
  const tags = mural.mural_tags?.map(t => t.tag) || []

  const getYouTubeId = (url) => {
    if (!url) return null
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    return match ? match[1] : null
  }
  const ytId = getYouTubeId(mural.youtube_url)

  const handleOpenDirections = () => {
    setShowDirectionsModal(true)
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? 'calc(100vw - 24px)' : '420px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 40px)',
        background: '#fafaf8',
        borderRadius: isMobile ? '16px' : '20px',
        overflow: 'hidden',
        zIndex: 200,
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: '0 20px 35px -10px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* Control bar */}
        <div style={{
          position: 'sticky', top: 0, background: 'white',
          borderBottom: '1px solid #ebebeb',
          padding: isMobile ? '10px 14px' : '14px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, gap: '8px'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Public Preview</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>Mobile view</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={() => { onOpenQR(mural); onClose() }}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: '8px', padding: '7px 10px', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600' }}>
              <QrCode size={13} />
            </button>
            <button onClick={() => { onEdit(mural); onClose() }}
              style={{ background: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', color: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Pencil size={13} /> Edit
            </button>
            <button onClick={onClose}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: '8px', padding: '7px 10px', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* DBKU nav */}
          <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/dbku-logo.webp" alt="DBKU" style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>DBKU Mural Registry</div>
              {/* <div style={{ fontSize: '10px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div> */}
            </div>
          </div>

          {/* Main image */}
          {images.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#f0f0f0' }}>
              <img src={images[activeImg]?.image_url} alt={mural.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

          {/* Gallery thumbnails */}
          {images.length > 1 && (
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>Gallery</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }}>
                {images.map((img, i) => (
                  <img key={img.id} src={img.image_url} alt="" onClick={() => setActiveImg(i)}
                    style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, cursor: 'pointer',
                      border: i === activeImg ? '3px solid #0a0a0a' : '1px solid #e0e0e0', opacity: i === activeImg ? 1 : 0.7 }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '20px 20px 60px' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', background: '#f0f0f0', padding: '3px 9px', borderRadius: '20px' }}>
                {mural.category}
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.8px', lineHeight: '1.2', margin: '0 0 14px', color: '#0a0a0a' }}>{mural.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ebebeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}><User size={12} color="#aaa" /><span>{mural.artist}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}><Calendar size={12} color="#aaa" /><span>{mural.year_created}</span></div>
            </div>
            {mural.description
              ? <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#333', marginBottom: '20px' }}>{mural.description}</p>
              : <p style={{ fontSize: '14px', color: '#ddd', marginBottom: '20px', fontStyle: 'italic' }}>No description added yet.</p>}
            {mural.story && (
              <div style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #ebebeb', borderLeft: '3px solid #0a0a0a' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>The Story</div>
                <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#444', margin: 0 }}>{mural.story}</p>
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
                  {tags.map(t => <span key={t} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'white', border: '1px solid #e0e0e0', color: '#555' }}>{t}</span>)}
                </div>
              </div>
            )}
            
            {/* Location section with Maplibre 3D Map */}
            {(location?.address || (location?.lat && location?.lng)) && (
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
                <div style={{ padding: '16px 16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                    <MapPin size={11} color="#aaa" />
                    <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa' }}>Location</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 4px' }}>{mural.title}</p>
                  {location?.address && (
                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px' }}>{location.address}{location.city ? `, ${location.city}` : ''}</p>
                  )}
                </div>
                
                {/* Maplibre 3D Map - NO button on map */}
                {location?.lat && location?.lng && (
                  <MaplibreMapPreview
                    lat={location.lat}
                    lng={location.lng}
                  />
                )}
                
                {/* Get Directions Button - Below the map, outside */}
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

// Main MuralList Component
export default function MuralList({ onEdit, onRefresh }) {
  const [murals, setMurals] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrMural, setQrMural] = useState(null)
  const [previewMural, setPreviewMural] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 640
  
  const loadMurals = async () => {
    setLoading(true)
    const { data } = await supabase
    .from('murals')
    .select('*, mural_locations(*), mural_images(*), mural_tags(*)')
    .order('created_at', { ascending: false })
    setMurals(data || [])
    setLoading(false)
}
 
  useEffect(() => { loadMurals() }, [])
 
  useEffect(() => {
    let list = murals
    if (search) list = list.filter(m =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.artist.toLowerCase().includes(search.toLowerCase()) ||
      m.mural_id.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase())
    )
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter)
    if (categoryFilter !== 'all') list = list.filter(m => m.category === categoryFilter)
    setFiltered(list)
  }, [murals, search, statusFilter, categoryFilter])

  const toggleStatus = async (mural) => {
    const newStatus = mural.status === 'active' ? 'inactive' : 'active'
    await supabase.from('murals').update({ status: newStatus }).eq('id', mural.id)
    await logActivity('status_changed', mural, `${mural.status} → ${newStatus}`)
    loadMurals(); onRefresh()
  }

  const deleteMural = async (mural) => {
    if (!confirm(`Delete "${mural.title}"? This cannot be undone.`)) return
    await logActivity('deleted', mural, `ID: ${mural.mural_id}`)
    await supabase.from('murals').delete().eq('id', mural.id)
    loadMurals(); onRefresh()
  }

  const handleOpenQR = (mural) => {
    setQrMural(mural)
    logActivity('qr_viewed', mural, 'QR code opened in admin')
  }

  const getCover = (mural) => {
    const cover = mural.mural_images?.find(i => i.is_cover) || mural.mural_images?.[0]
    return cover?.image_url || null
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#aaa', fontSize: '14px' }}>Loading...</div>
  )

  return (
    <>
      {/* ── Search & Filter ── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search murals, artists, ID or category..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '13px', background: 'white', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '13px', background: 'white', color: '#555', outline: 'none', width: isMobile ? '100%' : 'auto' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '13px', background: 'white', color: '#555', outline: 'none', width: isMobile ? '100%' : 'auto' }}
        >
          <option value="all">All Categories</option>
          <option value="Heritage">Heritage</option>
          <option value="Nature">Nature</option>
          <option value="Culture">Culture</option>
          <option value="Modern">Modern</option>
          <option value="Abstract">Abstract</option>
          <option value="Community">Community</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '14px', border: '1px solid #ebebeb', color: '#aaa' }}>
          <Image size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ fontSize: '14px' }}>
            {murals.length === 0 ? 'No murals yet. Click Add Mural to get started.' : 'No results found.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(2, 1fr)'
            : windowWidth < 1024
            ? 'repeat(3, 1fr)'
            : 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: isMobile ? '8px' : '16px'
        }}>
          {filtered.map(mural => {
            const loc = mural.mural_locations?.[0]
            return (
              <div
                key={mural.id}
                onClick={() => setPreviewMural(mural)}
                style={{
                  background: 'white',
                  borderRadius: isMobile ? '10px' : '14px',
                  border: '1px solid #ebebeb',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#d0d0d0'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* Thumbnail */}
                <div style={{ width: '100%', aspectRatio: '4/3', background: '#f5f5f5', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  {getCover(mural)
                    ? <img src={getCover(mural)} alt={mural.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={isMobile ? 18 : 28} color="#ddd" />
                      </div>
                  }
                  {/* Status badge */}
                  <div style={{
                    position: 'absolute', top: '6px', right: '6px',
                    fontSize: isMobile ? '7px' : '9px', fontWeight: '700', letterSpacing: '0.5px',
                    padding: isMobile ? '2px 5px' : '3px 9px', borderRadius: '20px',
                    background: mural.status === 'active' ? 'rgba(255,255,255,0.92)' : 'rgba(240,240,240,0.92)',
                    color: mural.status === 'active' ? '#16a34a' : '#aaa',
                    border: '1px solid ' + (mural.status === 'active' ? '#bbf7d0' : '#e0e0e0'),
                  }}>
                    {mural.status.toUpperCase()}
                  </div>
                  {/* Gallery badge */}
                  {mural.mural_images?.length > 1 && (
                    <div style={{ position: 'absolute', bottom: '6px', right: '6px', fontSize: '9px', fontWeight: '600', padding: '2px 6px', borderRadius: '20px', background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                      Gallery
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: isMobile ? '7px 8px 9px' : '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                  {/* Category — hidden on mobile */}
                  {!isMobile && (
                    <div style={{ marginBottom: '5px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#888', background: '#f5f5f5', padding: '2px 8px', borderRadius: '20px' }}>
                        {mural.category}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <div style={{
                    fontSize: isMobile ? '11px' : '13px', fontWeight: '700', color: '#0a0a0a',
                    lineHeight: '1.3', marginBottom: isMobile ? '2px' : '4px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>
                    {mural.title}
                  </div>

                  {/* Artist */}
                  <div style={{
                    fontSize: isMobile ? '10px' : '12px', color: '#888',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: isMobile ? '0' : '3px'
                  }}>
                    {mural.artist}
                  </div>

                  {/* Mural ID + Location — desktop only */}
                  {!isMobile && (
                    <>
                      <div style={{ fontSize: '10px', color: '#bbb', fontFamily: "'DM Mono', monospace", marginBottom: '6px' }}>
                        {mural.mural_id}
                      </div>
                      {loc?.address && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '4px' }}>
                          <MapPin size={11} color="#000" style={{ flexShrink: 0, marginTop: '1px' }} />
                          <span style={{ fontSize: '11px', color: '#000', lineHeight: '1.4', flex: 1 }}>{loc.address}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex', gap: isMobile ? '4px' : '6px',
                    borderTop: '1px solid #f5f5f5',
                    paddingTop: isMobile ? '7px' : '10px',
                    marginTop: isMobile ? '7px' : '0'
                  }}>
                    <button onClick={e => { e.stopPropagation(); handleOpenQR(mural) }} title="QR Code"
                      style={{ flex: 1, padding: isMobile ? '5px 2px' : '7px 4px', background: '#f8f8f6', border: '1px solid #e0e0e0', borderRadius: isMobile ? '6px' : '8px', fontSize: '11px', fontWeight: '600', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <QrCode size={isMobile ? 11 : 12} />
                      {!isMobile && 'QR'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); onEdit(mural) }} title="Edit"
                      style={{ flex: 1, padding: isMobile ? '5px 2px' : '7px 4px', background: '#f8f8f6', border: '1px solid #e0e0e0', borderRadius: isMobile ? '6px' : '8px', fontSize: '11px', fontWeight: '600', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <Pencil size={isMobile ? 11 : 12} />
                      {!isMobile && 'Edit'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleStatus(mural) }} title={mural.status === 'active' ? 'Deactivate' : 'Activate'}
                      style={{ padding: isMobile ? '5px 6px' : '7px 9px', background: '#f8f8f6', border: '1px solid #e0e0e0', borderRadius: isMobile ? '6px' : '8px', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {mural.status === 'active' ? <ToggleRight size={isMobile ? 12 : 14} color="#16a34a" /> : <ToggleLeft size={isMobile ? 12 : 14} color="#aaa" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteMural(mural) }} title="Delete"
                      style={{ padding: isMobile ? '5px 6px' : '7px 9px', background: '#fff8f8', border: '1px solid #fce8e8', borderRadius: isMobile ? '6px' : '8px', color: '#cc0000', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={isMobile ? 11 : 12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal with Maplibre 3D Map */}
      {previewMural && (
        <>
          <div onClick={() => setPreviewMural(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 199
          }} />
          <MobilePreviewModal
            mural={previewMural}
            onClose={() => setPreviewMural(null)}
            onEdit={onEdit}
            onOpenQR={handleOpenQR}
          />
        </>
      )}

      {qrMural && <QRModal mural={qrMural} onClose={() => setQrMural(null)} />}
    </>
  )
}