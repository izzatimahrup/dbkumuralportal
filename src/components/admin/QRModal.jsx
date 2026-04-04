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

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const testLine = currentLine ? currentLine + ' ' + word : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) lines.push(currentLine)
    return lines
  }

  const downloadWithLabel = async () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return

    const size = canvas.width
    const padding = 30
    const canvasWidth = size + padding * 2
    const textMaxWidth = canvasWidth - padding * 2

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    tempCtx.font = 'bold 18px DM Sans, sans-serif'
    const titleLines = wrapText(tempCtx, mural.title, textMaxWidth)

    tempCtx.font = '13px DM Sans, sans-serif'
    const artistText = `${mural.artist} · ${mural.year_created}`
    const artistLines = wrapText(tempCtx, artistText, textMaxWidth)

    const lineHeight = 24
    const topPad = 30
    const gapAfterQR = 20
    const gapBetweenSections = 8
    const bottomPad = 20

    const totalHeight =
      topPad +
      size +
      gapAfterQR +
      titleLines.length * lineHeight +
      gapBetweenSections +
      artistLines.length * lineHeight +
      bottomPad

    const out = document.createElement('canvas')
    out.width = canvasWidth
    out.height = totalHeight
    const outCtx = out.getContext('2d')

    outCtx.fillStyle = '#ffffff'
    outCtx.fillRect(0, 0, out.width, out.height)
    outCtx.drawImage(canvas, padding, topPad)

    let yPos = topPad + size + gapAfterQR + lineHeight

    outCtx.fillStyle = '#0a0a0a'
    outCtx.font = 'bold 18px DM Sans, sans-serif'
    outCtx.textAlign = 'center'
    for (const line of titleLines) {
      outCtx.fillText(line, out.width / 2, yPos)
      yPos += lineHeight
    }

    yPos += gapBetweenSections

    outCtx.fillStyle = '#555555'
    outCtx.font = '13px DM Sans, sans-serif'
    for (const line of artistLines) {
      outCtx.fillText(line, out.width / 2, yPos)
      yPos += lineHeight
    }

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
          <div style={{ textAlign: 'left', flex: 1, marginRight: '12px' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '-0.3px', wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>{mural.title}</div>
            <div style={{ color: '#666', fontSize: '13px', marginTop: '3px', wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>{mural.artist} · {mural.year_created}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', color: '#555', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* QR Code */}
        <div ref={qrRef} style={{ display: 'inline-block', padding: '20px', background: '#f8f8f6', borderRadius: '16px', marginBottom: '14px' }}>
          <QRCodeCanvas value={url} size={200} level="H" includeMargin={false} fgColor="#0a0a0a" />
        </div>

        {/* Label preview */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a0a0a', wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word', maxWidth: '280px', margin: '0 auto' }}>{mural.title}</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px', wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word', maxWidth: '280px', margin: '3px auto 0' }}>{mural.artist} · {mural.year_created}</div>
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
