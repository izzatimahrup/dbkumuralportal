import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { X, Download } from 'lucide-react'
import { logActivity } from '../../helpers/logActivity'

export default function QRModal({ mural, onClose }) {
  const qrRef = useRef()
  const url = `${window.location.origin}/mural/${mural.mural_id}`

  const downloadPNG = async () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `QR-${mural.mural_id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    await logActivity('qr_downloaded', mural, 'QR only')
  }

  const downloadWithLabel = async () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const size = canvas.width
    const out = document.createElement('canvas')
    out.width = size + 60
    out.height = size + 110
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(canvas, 30, 30)

    // Title
    ctx.fillStyle = '#0a0a0a'
    ctx.font = 'bold 18px DM Sans, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(mural.title, out.width / 2, size + 58)

    // Artist · Year (no mural ID)
    ctx.fillStyle = '#555555'
    ctx.font = '13px DM Sans, sans-serif'
    ctx.fillText(`${mural.artist} · ${mural.year_created}`, out.width / 2, size + 80)

    const link = document.createElement('a')
    link.download = `QR-${mural.mural_id}-labeled.png`
    link.href = out.toDataURL('image/png')
    link.click()
    await logActivity('qr_downloaded', mural, 'With label')
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: '20px', padding: '36px', width: '380px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '-0.3px' }}>{mural.title}</div>
            <div style={{ color: '#666', fontSize: '13px', marginTop: '3px' }}>{mural.artist} · {mural.year_created}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', color: '#555' }}>
            <X size={16} />
          </button>
        </div>

        {/* QR Code */}
        <div ref={qrRef} style={{ display: 'inline-block', padding: '20px', background: '#f8f8f6', borderRadius: '16px', marginBottom: '14px' }}>
          <QRCodeCanvas value={url} size={200} level="H" includeMargin={false} fgColor="#0a0a0a" />
        </div>

        {/* Label preview — no mural ID */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a0a0a' }}>{mural.title}</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{mural.artist} · {mural.year_created}</div>
        </div>

        <p style={{ fontSize: '11px', color: '#bbb', marginBottom: '24px', wordBreak: 'break-all', fontFamily: "'DM Mono', monospace" }}>{url}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button onClick={downloadPNG} style={{ padding: '11px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
            <Download size={14} /> QR Only
          </button>
          <button onClick={downloadWithLabel} style={{ padding: '11px', background: '#f8f8f6', color: '#0a0a0a', border: '1px solid #e0e0e0', borderRadius: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
            <Download size={14} /> With Label
          </button>
        </div>
      </div>
    </div>
  )
}
