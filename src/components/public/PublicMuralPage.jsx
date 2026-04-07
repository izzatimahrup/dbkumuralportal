import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { MapPin, Calendar, User, Tag, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const galleryRef = useRef(null)

  const loadMural = useCallback(async () => {
    const { data, error } = await supabase
      .from('murals')
      .select('*, mural_locations(*), mural_images(*), mural_tags(*)')
      .eq('mural_id', muralId)
      .eq('status', 'active')
      .single()

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

  const logScan = useCallback(async () => {
    const { data: m } = await supabase
      .from('murals')
      .select('id')
      .eq('mural_id', muralId)
      .single()

    if (m) {
      await supabase.from('qr_scans').insert({
        mural_id: m.id,
        user_agent: navigator.userAgent
      })
    }
  }, [muralId])

const hasLoggedScan = useRef(false)

useEffect(() => {
  loadMural()
  
  // Only log scan once per mural
  if (!hasLoggedScan.current) {
    hasLoggedScan.current = true
    logScan()
  }
}, [loadMural, logScan])

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
    <div style={{ background: '#fafaf8', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── LIGHTBOX ── */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Close */}
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

          {/* Counter */}
          <div style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', letterSpacing: '1px'
          }}>
            {lightbox + 1} / {images.length}
          </div>

          {/* Prev */}
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

          {/* Image */}
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
            style={{
              maxWidth: '100%', maxHeight: '100vh',
              objectFit: 'contain', display: 'block',
              userSelect: 'none',
            }}
          />

          {/* Next */}
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

          {/* Dots */}
          {images.length > 1 && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: '6px',
            }}>
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

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 10 }}>
        <img
          src="/dbku-logo.webp"
          alt="DBKU"
          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          onError={e => e.target.style.display = 'none'}
        />
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0a0a0a' }}>DBKU Mural Registry</div>
          <div style={{ fontSize: '10px', color: '#aaa' }}>Dewan Bandaraya Kuching Utara</div>
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
          {/* Slides */}
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
                <img
                  src={img.image_url}
                  alt={mural.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>

          {/* Tap to expand hint */}
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'rgba(0,0,0,0.4)', borderRadius: '6px',
            padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <ExternalLink size={11} color="white" />
            <span style={{ fontSize: '10px', color: 'white', fontWeight: '600' }}>Tap to expand</span>
          </div>

          {/* Dots */}
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
              <div
                key={img.id || i}
                onClick={() => setActiveImg(i)}
                style={{ cursor: 'pointer', flexShrink: 0, scrollSnapAlign: 'start' }}
              >
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

        {/* Category */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', background: '#f0f0f0', padding: '3px 9px', borderRadius: '20px' }}>
            {mural.category}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.8px', lineHeight: '1.2', marginBottom: '14px', color: '#0a0a0a' }}>
          {mural.title}
        </h1>

        {/* Meta */}
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

        {/* Description */}
        {mural.description && (
          <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#333', marginBottom: '20px' }}>
            {mural.description}
          </p>
        )}

        {/* Story */}
        {mural.story && (
          <div style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #ebebeb', borderLeft: '3px solid #0a0a0a' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>
              The Story
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#444' }}>{mural.story}</p>
          </div>
        )}

        {/* YouTube */}
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

        {/* Tags */}
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

        {/* Location */}
{location && (
  <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
    
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <MapPin size={11} color="#aaa" />
        <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa' }}>
          Location
        </span>
      </div>

      <p style={{ fontSize: '13px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 4px' }}>
        {mural.title}
      </p>

      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px' }}>
        {location.address}{location.city ? `, ${location.city}` : ''}
      </p>
    </div>

    {location.lat && location.lng && (
      <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`}
          title="Mural location"
        />
      </div>
    )}

    {location.google_maps_url && (
      <div style={{ padding: '10px 16px 14px' }}>
        <a
          href={location.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            color: '#1a6fb3',
            fontWeight: '600',
            textDecoration: 'none'
          }}
        >
          <ExternalLink size={11} /> Get directions
        </a>
      </div>
    )}

  </div>
)}
        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #ebebeb' }}>
          <span style={{ fontSize: '11px', color: '#bbb' }}>
           © 2026 Dewan Bandaraya Kuching Utara. All rights reserved.
          </span>
        </div>

      </div>
    </div>
    )
}