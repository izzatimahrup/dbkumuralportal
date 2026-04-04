import { useState } from 'react'
import { supabase } from '../../supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Download, FileText, Table, CheckCircle } from 'lucide-react'

export default function ExportPanel() {
  const [loading, setLoading] = useState('')
  const [done, setDone] = useState('')

  const fetchData = async () => {
    const { data } = await supabase
      .from('murals')
      .select('*, mural_locations(*), mural_tags(*)')
      .order('created_at', { ascending: false })
    return data || []
  }

  const exportExcel = async () => {
    setLoading('excel'); setDone('')
    const data = await fetchData()
    const rows = data.map(m => ({
      'Mural ID': m.mural_id,
      'Title': m.title,
      'Artist': m.artist,
      'Year': m.year_created,
      'Category': m.category,
      'Status': m.status,
      'Description': m.description || '',
      'Address': m.mural_locations?.[0]?.address || '',
      'City': m.mural_locations?.[0]?.city || 'Kuching',
      'Latitude': m.mural_locations?.[0]?.lat || '',
      'Longitude': m.mural_locations?.[0]?.lng || '',
      'Google Maps': m.mural_locations?.[0]?.google_maps_url || '',
      'Tags': m.mural_tags?.map(t => t.tag).join(', ') || '',
      'Created At': new Date(m.created_at).toLocaleDateString('en-MY'),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 18 }, { wch: 30 }, { wch: 25 }, { wch: 8 }, { wch: 14 },
      { wch: 10 }, { wch: 40 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 40 }, { wch: 25 }, { wch: 16 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Murals')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `DBKU-Murals-${new Date().toISOString().split('T')[0]}.xlsx`)
    setLoading(''); setDone('excel')
  }

  const exportCSV = async () => {
    setLoading('csv'); setDone('')
    const data = await fetchData()
    const headers = ['Mural ID', 'Title', 'Artist', 'Year', 'Category', 'Status', 'Address', 'Tags']
    const rows = data.map(m => [
      m.mural_id, m.title, m.artist, m.year_created, m.category, m.status,
      m.mural_locations?.[0]?.address || '',
      m.mural_tags?.map(t => t.tag).join('; ') || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `DBKU-Murals-${new Date().toISOString().split('T')[0]}.csv`)
    setLoading(''); setDone('csv')
  }

  const exportOptions = [
    {
      id: 'excel',
      icon: Table,
      title: 'Excel Spreadsheet (.xlsx)',
      desc: 'Full mural data with all fields, formatted columns, ready for DBKU records.',
      action: exportExcel,
    },
    {
      id: 'csv',
      icon: FileText,
      title: 'CSV File (.csv)',
      desc: 'Plain comma-separated values, compatible with any spreadsheet software.',
      action: exportCSV,
    },
  ]

  return (
    <div style={{ maxWidth: '600px', display: 'grid', gap: '14px' }}>
      {exportOptions.map(opt => {
        const Icon = opt.icon
        const isLoading = loading === opt.id
        const isDone = done === opt.id
        return (
          <div key={opt.id} style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f8f8f6', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color="#555" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700' }}>{opt.title}</span>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: '#f0f0f0', color: '#666', fontWeight: '600' }}>{opt.tag}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.5' }}>{opt.desc}</p>
            </div>
            <button onClick={opt.action} disabled={!!loading} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 18px', borderRadius: '9px', border: 'none',
              background: isDone ? '#16a34a' : loading ? '#f0f0f0' : '#0a0a0a',
              color: isDone ? 'white' : loading ? '#bbb' : 'white',
              fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              flexShrink: 0, transition: 'all 0.2s'
            }}>
              {isDone ? <><CheckCircle size={14} /> Done</> : isLoading ? 'Exporting...' : <><Download size={14} /> Export</>}
            </button>
          </div>
        )
      })}

      <div style={{ background: '#f8f8f6', borderRadius: '10px', padding: '16px 20px', border: '1px solid #ebebeb' }}>
        <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
        </p>
      </div>
    </div>
  )
}