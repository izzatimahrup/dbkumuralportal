import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { MapPin, Calendar, User, Tag, ExternalLink } from 'lucide-react'
import { logActivity } from '../../helpers/logActivity'

export default function PublicMuralPage() {
  const { muralId } = useParams()
  const [mural, setMural] = useState(null)
  const [images, setImages] = useState([])
  const [tags, setTags] = useState([])
  const [location, setLocation] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { 
    loadMural()
    logScan()
  }, [muralId])

  const loadMural = async () => {
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
  }

  const logScan = async () => {
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
  }

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
      {/* Header - matches preview */}
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

      {/* Hero image - matches preview styling */}
      {images.length > 0 && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: '460px', overflow: 'hidden', background: '#f0f0f0' }}>
          <img 
            src={images[activeImg]?.image_url} 
            alt={mural.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
              {images.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImg(i)} 
                  style={{ 
                    width: i === activeImg ? '16px' : '5px', 
                    height: '5px',
                    borderRadius: '3px', 
                    background: i === activeImg ? 'white' : 'rgba(255,255,255,0.5)', 
                    border: 'none', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s', 
                    padding: 0 
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Category - matches preview */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: '700', 
            letterSpacing: '1.5px', 
            textTransform: 'uppercase', 
            color: '#888', 
            background: '#f0f0f0', 
            padding: '3px 9px', 
            borderRadius: '20px' 
          }}>
            {mural.category}
          </span>
        </div>

        {/* Title - matches preview */}
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '800', 
          letterSpacing: '-0.8px', 
          lineHeight: '1.2', 
          marginBottom: '14px', 
          color: '#0a0a0a' 
        }}>
          {mural.title}
        </h1>

        {/* Meta  */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          marginBottom: '20px', 
          paddingBottom: '20px', 
          borderBottom: '1px solid #ebebeb' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}>
            <User size={12} color="#aaa" /> 
            <span>{mural.artist}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#555' }}>
            <Calendar size={12} color="#aaa" /> 
            <span>{mural.year_created}</span>
          </div>
        </div>

        {/* Description - matches preview */}
        {mural.description && (
          <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#333', marginBottom: '20px' }}>
            {mural.description}
          </p>
        )}

        {/* Story */}
        {mural.story && (
          <div style={{ 
            marginBottom: '20px', 
            background: 'white', 
            borderRadius: '12px', 
            padding: '18px', 
            border: '1px solid #ebebeb', 
            borderLeft: '3px solid #0a0a0a' 
          }}>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '700', 
              letterSpacing: '1.5px', 
              textTransform: 'uppercase', 
              color: '#aaa', 
              marginBottom: '10px' 
            }}>
              The Story
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#444' }}>{mural.story}</p>
          </div>
        )}

        {/* Gallery thumbnails */}
        {images.length > 1 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '700', 
              letterSpacing: '1.5px', 
              textTransform: 'uppercase', 
              color: '#aaa', 
              marginBottom: '10px' 
            }}>
              Gallery
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {images.map((img, i) => (
                <img 
                  key={img.id} 
                  src={img.image_url} 
                  alt="" 
                  onClick={() => setActiveImg(i)}
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    objectFit: 'cover', 
                    borderRadius: '8px', 
                    flexShrink: 0, 
                    cursor: 'pointer', 
                    opacity: i === activeImg ? 1 : 0.5, 
                    border: i === activeImg ? '2px solid #0a0a0a' : '2px solid transparent' 
                  }} 
                />
              ))}
            </div>
          </div>
        )}

        {/* YouTube*/}
        {ytId && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '700', 
              letterSpacing: '1.5px', 
              textTransform: 'uppercase', 
              color: '#aaa', 
              marginBottom: '10px' 
            }}>
              Video
            </div>
            <div style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9' }}>
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${ytId}`} 
                frameBorder="0" 
                allowFullScreen 
                title="Mural video" 
                style={{ display: 'block' }} 
              />
            </div>
          </div>
        )}

        {/* Tags  */}
        {tags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <Tag size={10} color="#aaa" />
              <span style={{ 
                fontSize: '10px', 
                fontWeight: '700', 
                letterSpacing: '1.5px', 
                textTransform: 'uppercase', 
                color: '#aaa' 
              }}>
                Tags
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tags.map(t => (
                <span key={t} style={{ 
                  fontSize: '11px', 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  background: 'white', 
                  border: '1px solid #e0e0e0', 
                  color: '#555' 
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location*/}
        {location && (
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ebebeb' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <MapPin size={11} color="#aaa" />
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '700', 
                  letterSpacing: '1.5px', 
                  textTransform: 'uppercase', 
                  color: '#aaa' 
                }}>
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

            {/* Embedded map */}
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

            {/* Directions link*/}
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
            Dewan Bandaraya Kuching Utara · Mural Registry
          </span>
        </div>
      </div>
    </div>
  )
}