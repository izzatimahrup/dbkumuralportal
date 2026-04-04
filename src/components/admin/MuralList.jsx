import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import QRModal from './QRModal'
import { logActivity } from '../../helpers/logActivity'
import {
  QrCode, Pencil, Trash2, Image, ToggleLeft, ToggleRight,
  Search, X, MapPin, User, Calendar, Tag, ExternalLink
} from 'lucide-react'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return width
}

// Mobile Preview 
function MobilePreviewModal({ mural, onClose, onEdit, onOpenQR }) {
  const [activeImg, setActiveImg] = useState(0)
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

  return (
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
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0a0a0a' }}>DBKU Mural Registry</div>
            <div style={{ fontSize: '10px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div>
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
          {location?.address && (
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <MapPin size={11} color="#aaa" />
                  <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa' }}>Location</span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 4px' }}>{mural.title}</p>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px' }}>{location.address}{location.city ? `, ${location.city}` : ''}</p>
              </div>
              {location.lat && location.lng && (
                <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
                  <iframe width="100%" height="100%" style={{ border: 0, display: 'block' }} loading="lazy" allowFullScreen
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lng}`}
                    title="Mural location" />
                </div>
              )}
              {(location.google_maps_url || (location.lat && location.lng)) && (
                <div style={{ padding: '10px 16px 14px' }}>
                  <a href={location.google_maps_url || `https://www.google.com/maps?q=${location.lat},${location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#1a6fb3', fontWeight: '600', textDecoration: 'none' }}>
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
    </div>
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

      {/* Backdrop + Preview Modal */}
      {previewMural && (
        <>
          <div onClick={() => setPreviewMural(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 199
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