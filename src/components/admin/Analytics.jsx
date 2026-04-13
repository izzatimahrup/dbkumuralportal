import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, Tooltip, BarChart, Bar, YAxis } from 'recharts'

export default function Analytics() {
  const [topMurals, setTopMurals] = useState([])
  const [scansByDay, setScansByDay] = useState([])
  const [scansByMonth, setScansByMonth] = useState([])
  const [totalScans, setTotalScans] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadAnalytics = async () => {
  const { data: allScans } = await supabase
    .from('unique_qr_scans')
    .select('scanned_at, mural_id, visitor_id, ip_address')

  // Total — just length since view already deduped
  setTotalScans(allScans?.length || 0)

  // Last 30 days
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push({ date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) })
  }
  const recentScans = allScans?.filter(s => s.scanned_at >= days[0].date) || []
  const dayCounts = {}
  days.forEach(d => { dayCounts[d.date] = 0 })
  // ✅ days goes here
  recentScans.forEach(s => {
    const d = s.scanned_at.split('T')[0]
    if (dayCounts[d] !== undefined) dayCounts[d]++
  })
  setScansByDay(days.map(d => ({ name: d.label, scans: dayCounts[d.date] })))

  // Last 6 months
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }) })
  }
  const monthCounts = {}
  months.forEach(m => { monthCounts[m.month] = 0 })
  // ✅ months goes here
  allScans?.forEach(s => {
    const m = s.scanned_at.substring(0, 7)
    if (monthCounts[m] !== undefined) monthCounts[m]++
  })
  setScansByMonth(months.map(m => ({ name: m.label, scans: monthCounts[m.month] })))

  // Top murals
  const muralCounts = {}
  // ✅ top murals goes here
  recentScans.forEach(s => {
    muralCounts[s.mural_id] = (muralCounts[s.mural_id] || 0) + 1
  })
  const topIds = Object.entries(muralCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (topIds.length > 0) {
    const { data: murals } = await supabase
      .from('murals')
      .select('id, title, mural_id')
      .in('mural_id', topIds.map(t => t[0]))
    setTopMurals(topIds.map(([id, count]) => ({
      title: murals?.find(m => m.mural_id === id)?.title || id,
      mural_id: id,
      count
    })))
  }

  setLoading(false)
}
  useEffect(() => { loadAnalytics() }, [])

  const tooltipStyle = { fontSize: '12px', borderRadius: '8px', border: '1px solid #ebebeb', boxShadow: 'none' }

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Loading analytics...</div>

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { label: 'Total QR Scans', value: totalScans },
          { label: 'Scans (Last 30 days)', value: scansByDay.reduce((a, b) => a + b.scans, 0) },
          { label: 'Avg Scans / Day', value: (scansByDay.reduce((a, b) => a + b.scans, 0) / 30).toFixed(1) },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #ebebeb' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 30-day line chart */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #ebebeb' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '4px' }}>Daily Scans</div>
        <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '16px' }}>Last 30 days</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={scansByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#bbb' }} interval={4} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="scans" stroke="#0a0a0a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly bar + top murals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #ebebeb' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '4px' }}>Monthly Scans</div>
          <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '16px' }}>Last 6 months</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={scansByMonth} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="scans" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #ebebeb' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '16px' }}>Top Scanned Murals</div>
          {topMurals.length === 0
            ? <p style={{ fontSize: '13px', color: '#bbb' }}>No scan data yet.</p>
            : topMurals.map((m, i) => (
              <div key={m.mural_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: i === 0 ? '#0a0a0a' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: i === 0 ? 'white' : '#888', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                  <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'monospace' }}>{m.mural_id}</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0a0a0a' }}>{m.count}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}