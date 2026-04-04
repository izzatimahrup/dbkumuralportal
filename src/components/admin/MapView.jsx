import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const createMuralIcon = (imageUrl, title) => {
  const short = title && title.length > 16 ? title.slice(0, 16) + '\u2026' : (title || 'Untitled')
  const imgHtml = imageUrl
    ? '<img src="' + imageUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />'
    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a09880" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>'

  return new L.DivIcon({
    className: '',
    html:
      '<div style="display:flex;flex-direction:column;align-items:center;">' +
        '<div style="width:56px;height:56px;border-radius:50%;border:3px solid white;overflow:hidden;background:#d4cfc8;box-shadow:0 2px 8px rgba(0,0,0,0.18);">' +
          imgHtml +
        '</div>' +
        '<div style="margin-top:5px;background:#0a0a0a;color:white;font-size:10px;font-weight:600;font-family:system-ui,sans-serif;padding:3px 9px;border-radius:20px;white-space:nowrap;letter-spacing:0.15px;">' + short + '</div>' +
        '<div style="width:2px;height:9px;background:#0a0a0a;"></div>' +
        '<div style="width:6px;height:6px;background:#0a0a0a;border-radius:50%;margin-top:-1px;"></div>' +
      '</div>',
    iconSize: [130, 90],
    iconAnchor: [65, 90],
    popupAnchor: [0, -94],
  })
}

function MuralPopup({ mural, loc, cover }) {
  const hasImage = cover != null && cover.image_url != null
  const hasAddress = loc != null && loc.address != null
  const hasLatLng = loc != null && loc.lat != null && loc.lng != null
  
  // FIXED: Better directions URL generation
  const getDirectionsUrl = () => {
    // If there's a stored Google Maps URL, use it
    if (loc.google_maps_url && loc.google_maps_url.trim() !== '') {
      return loc.google_maps_url
    }
    // Otherwise generate from coordinates
    if (hasLatLng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
    }
    // Last resort: search by address
    if (hasAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address + ', Kuching, Sarawak, Malaysia')}`
    }
    return null
  }

  const directionsUrl = getDirectionsUrl()

  const containerStyle = { fontFamily: "'DM Sans', system-ui, sans-serif", width: '220px' }
  const imgStyle = { width: '100%', height: '115px', objectFit: 'cover', display: 'block' }
  const badgeStyle = {
    fontSize: '10px', fontWeight: '600', letterSpacing: '0.8px',
    textTransform: 'uppercase', color: '#888', background: '#f2f0ec',
    padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px',
  }
  const titleStyle = { fontSize: '14px', fontWeight: '700', color: '#0a0a0a', marginBottom: '3px', lineHeight: '1.3' }
  const artistStyle = { fontSize: '12px', color: '#666', marginBottom: '2px' }
  const idStyle = { fontSize: '11px', color: '#bbb', fontFamily: 'monospace', marginBottom: '10px' }
  const addrStyle = { display: 'flex', gap: '5px', alignItems: 'flex-start', fontSize: '11px', color: '#777', marginBottom: '12px' }
  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    fontSize: '11px', fontWeight: '600', color: '#0a0a0a', background: '#f2f0ec',
    border: '1px solid #e0e0e0', padding: '6px 12px', borderRadius: '7px',
    cursor: 'pointer', textDecoration: 'none',
  }

  const handleDirections = (e) => {
    e.stopPropagation()
    if (directionsUrl) {
      window.open(directionsUrl, '_blank', 'noopener,noreferrer')
    } else {
      alert('No location information available for this mural.')
    }
  }

  return (
    <div style={containerStyle}>
      {hasImage && <img src={cover.image_url} alt={mural.title} style={imgStyle} />}
      <div style={{ padding: '12px 14px 14px' }}>
        <span style={badgeStyle}>{mural.category}</span>
        <div style={titleStyle}>{mural.title}</div>
        <div style={artistStyle}>{mural.artist}</div>
        <div style={idStyle}>{mural.mural_id} · {mural.year_created}</div>
        {hasAddress && (
          <div style={addrStyle}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{loc.address}</span>
          </div>
        )}
        {directionsUrl && (
          <button
            onClick={handleDirections}
            style={btnStyle}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Get directions
          </button>
        )}
        {!directionsUrl && (
          <div style={{ fontSize: '11px', color: '#ccc', fontStyle: 'italic' }}>
            No location available
          </div>
        )}
      </div>
    </div>
  )
}

export default function MapView() {
  const [murals, setMurals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('murals')
      .select('*, mural_locations(*), mural_images(*)')
      .eq('status', 'active')
      .then(({ data }) => {
        setMurals(
          (data || []).filter(
            m =>
              m.mural_locations &&
              m.mural_locations[0] &&
              m.mural_locations[0].lat &&
              m.mural_locations[0].lng
          )
        )
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{
        height: '560px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'white', borderRadius: '12px', border: '1px solid #ebebeb',
        color: '#aaa', fontSize: '13px',
      }}>
        Loading map...
      </div>
    )
  }

  const center = murals.length > 0
    ? [parseFloat(murals[0].mural_locations[0].lat), parseFloat(murals[0].mural_locations[0].lng)]
    : [1.5535, 110.3593]

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #ebebeb', overflow: 'hidden' }}>

      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #ebebeb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>Mural registry map</div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px', fontWeight: '600', color: '#555',
            background: '#f2f0ec', padding: '3px 10px', borderRadius: '20px', border: '1px solid #e8e6e2',
          }}>
            {murals.length} murals
          </span>
          <span style={{ fontSize: '11px', color: '#ccc' }}>Click a pin for details</span>
        </div>
      </div>

      <MapContainer center={center} zoom={15} style={{ height: '540px', width: '100%' }} zoomControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {murals.map(m => {
          const loc = m.mural_locations[0]
          const images = m.mural_images || []
          const cover = images.find(i => i.is_cover) || images[0] || null
          const icon = createMuralIcon(cover ? cover.image_url : null, m.title)
          return (
            <Marker key={m.id} position={[parseFloat(loc.lat), parseFloat(loc.lng)]} icon={icon}>
              <Popup closeButton={false} className="mural-popup" offset={[0, -4]}>
                <MuralPopup mural={m} loc={loc} cover={cover} />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      <div style={{
        padding: '10px 20px', borderTop: '1px solid #ebebeb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        </div>
        <span style={{ fontSize: '11px', color: '#ccc' }}>DBKU Mural Registry · Kuching, Sarawak</span>
      </div>

    </div>
  )
}