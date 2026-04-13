import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// api key from maptiler cloud 
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
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
      zIndex: 400,
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

// ─── Popup HTML ───────────────────────────────────────────────────────────────

function createPopupHTML(mural, loc, cover, onOpenDirections) {
  const hasImage = cover?.image_url != null
  const hasAddress = loc?.address != null
  const hasLatLng = loc?.lat != null && loc?.lng != null

  // Store the function in a global variable for the popup to access
  const popupId = `popup-${mural.mural_id}`;
  
  // Create a script that will be executed when the popup is opened
  const scriptContent = `
    window.${popupId} = function() {
      window.dispatchEvent(new CustomEvent('openDirections', { 
        detail: { lat: ${loc?.lat || 'null'}, lng: ${loc?.lng || 'null'}, address: ${JSON.stringify(loc?.address || '')} }
      }));
    }
  `

  return `
    <div style="font-family:'DM Sans',system-ui,sans-serif;width:260px;">
      <script>${scriptContent}</script>
      ${hasImage ? `<img src="${cover.image_url}" alt="${mural.title}" style="width:100%;height:130px;object-fit:cover;display:block;" />` : ''}
      <div style="padding:14px 16px 16px;">
        <span style="font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#888;background:#f2f0ec;padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:10px;">
          ${mural.category || 'Mural'}
        </span>
        <div style="font-size:15px;font-weight:700;color:#0a0a0a;margin-bottom:3px;line-height:1.3;">${mural.title}</div>
        <div style="font-size:12px;color:#666;margin-bottom:3px;">${mural.artist || ''}</div>
        <div style="font-size:11px;color:#bbb;font-family:monospace;margin-bottom:12px;">${mural.mural_id} · ${mural.year_created || ''}</div>
        ${hasAddress ? `
          <div style="display:flex;gap:6px;align-items:flex-start;font-size:11px;color:#777;margin-bottom:14px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;margin-top:1px">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>${loc.address}</span>
          </div>` : ''}
        
        <!-- Single Get Directions Button -->
        <button 
          onclick="window.${popupId}()"
          style="
            width:100%;display:flex;align-items:center;justify-content:center;gap:8px;
            font-size:13px;font-weight:600;padding:10px 12px;
            border-radius:30px;text-decoration:none;border:none;
            color:white;background:#0a0a0a;cursor:pointer;transition:all 0.15s;
            font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,0.15);
          "
          onmouseover="this.style.background='#2a2a2a';this.style.transform='scale(1.02)'"
          onmouseout="this.style.background='#0a0a0a';this.style.transform='scale(1)'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Get directions
        </button>
      </div>
    </div>
  `
}

// ─── Custom marker element ────────────────────────────────────────────────────

function createMarkerEl(imageUrl, title) {
  const short = title && title.length > 16 ? title.slice(0, 16) + '…' : (title || 'Untitled')
  const el = document.createElement('div')
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;'
  el.innerHTML = `
    <div style="width:56px;height:56px;border-radius:50%;border:3px solid white;overflow:hidden;background:#d4cfc8;box-shadow:0 2px 12px rgba(0,0,0,0.25);transition:transform 0.15s;">
      ${imageUrl
        ? `<img src="${imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a09880" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>`
      }
    </div>
    <div style="margin-top:5px;background:#0a0a0a;color:white;font-size:10px;font-weight:600;font-family:system-ui,sans-serif;padding:3px 9px;border-radius:20px;white-space:nowrap;letter-spacing:0.15px;">${short}</div>
    <div style="width:2px;height:9px;background:#0a0a0a;"></div>
    <div style="width:6px;height:6px;background:#0a0a0a;border-radius:50%;margin-top:-1px;"></div>
  `
  const circle = el.querySelector('div')
  circle.addEventListener('mouseenter', () => { circle.style.transform = 'scale(1.1)' })
  circle.addEventListener('mouseleave', () => { circle.style.transform = 'scale(1)' })
  return el
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const [murals, setMurals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [is3D, setIs3D]       = useState(true)
  const [directionsModal, setDirectionsModal] = useState(null)

  // Listen for directions events from popups
  useEffect(() => {
    const handleOpenDirections = (event) => {
      setDirectionsModal(event.detail)
    }
    
    window.addEventListener('openDirections', handleOpenDirections)
    
    return () => {
      window.removeEventListener('openDirections', handleOpenDirections)
    }
  }, [])

  // Fetch data
  useEffect(() => {
    supabase
      .from('murals')
      .select('*, mural_locations(*), mural_images(*)')
      .eq('status', 'active')
      .then(({ data }) => {
        const filtered = (data || []).filter(
          m => m.mural_locations?.[0]?.lat && m.mural_locations?.[0]?.lng
        )
        setMurals(filtered)
        setLoading(false)
      })
  }, [])

  // Init map
  useEffect(() => {
    if (loading || !mapContainer.current || mapRef.current) return

    const center = murals.length > 0
      ? [parseFloat(murals[0].mural_locations[0].lng), parseFloat(murals[0].mural_locations[0].lat)]
      : [110.3593, 1.5535]

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center,
      zoom: 15.5,
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

      murals.forEach(m => {
        const loc    = m.mural_locations[0]
        const images = m.mural_images || []
        const cover  = images.find(i => i.is_cover) || images[0] || null
        const el     = createMarkerEl(cover?.image_url ?? null, m.title)

        const popup = new maplibregl.Popup({
          offset: [0, -94],
          closeButton: false,
          maxWidth: '300px',
          className: 'mural-popup-wrap',
        }).setHTML(createPopupHTML(m, loc, cover))

        new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([parseFloat(loc.lng), parseFloat(loc.lat)])
          .setPopup(popup)
          .addTo(map)
      })
    })

    return () => { map.remove(); mapRef.current = null }
  }, [loading, murals])

  // Toggle 2D / 3D from React button
  const toggle3D = () => {
    const map = mapRef.current
    if (!map) return
    const next = !is3D
    setIs3D(next)
    map.easeTo({ pitch: next ? 45 : 0, bearing: next ? -15 : 0, duration: 600 })
  }

  return (
    <>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #ebebeb', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #ebebeb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>Mural registry map</div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px', fontWeight: '600', color: '#555',
              background: '#f2f0ec', padding: '3px 10px',
              borderRadius: '20px', border: '1px solid #e8e6e2',
            }}>
              {murals.length} murals
            </span>
            <button
              onClick={toggle3D}
              style={{
                fontSize: '11px', fontWeight: '600', padding: '3px 10px',
                borderRadius: '20px', border: '1px solid #e8e6e2',
                background: is3D ? '#0a0a0a' : '#f2f0ec',
                color: is3D ? 'white' : '#555',
                cursor: 'pointer', transition: 'all 0.25s',
              }}
            >
              {is3D ? '3D' : '2D'}
            </button>
          </div>
        </div>

        {/* Map */}
        {loading ? (
          <div style={{
            height: '540px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#f9f8f6',
            color: '#aaa', fontSize: '13px',
          }}>
            Loading map…
          </div>
        ) : (
          <div ref={mapContainer} style={{ height: '540px', width: '100%' }} />
        )}

        {/* Footer */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #ebebeb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#ccc' }}>
            Drag to pan · Scroll to zoom · Right-drag to rotate & tilt
          </span>
          <span style={{ fontSize: '11px', color: '#ccc' }}>DBKU Mural Registry · Kuching, Sarawak</span>
        </div>

        <style>{`
          .mural-popup-wrap .maplibregl-popup-content {
            padding: 0;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.14);
          }
          .mural-popup-wrap .maplibregl-popup-tip { display: none; }
        `}</style>
      </div>

      {/* Directions Modal */}
      {directionsModal && (
        <DirectionsModal
          lat={directionsModal.lat}
          lng={directionsModal.lng}
          address={directionsModal.address}
          onClose={() => setDirectionsModal(null)}
        />
      )}
    </>
  );
}