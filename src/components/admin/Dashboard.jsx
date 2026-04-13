import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import MuralList from './MuralList'
import MuralForm from './MuralForm'
import MapView from './MapView'
import Analytics from './Analytics'
import ExportPanel from './ExportPanel'
import Settings from './Settings'
import {
  LayoutDashboard, Image, Map, BarChart2,
  Download, Settings as SettingsIcon, LogOut, Plus,
  ChevronRight, TrendingUp, CheckCircle, XCircle, Activity,
  Menu, X
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0a0a0a', '#555', '#888', '#aaa', '#ccc', '#e0e0e0']

const ACTIVITY_META = {
  created:        { icon: '＋', color: '#16a34a', bg: '#f0fdf4', label: 'created' },
  updated:        { icon: '✎',  color: '#2563eb', bg: '#eff6ff', label: 'updated' },
  deleted:        { icon: '✕',  color: '#dc2626', bg: '#fef2f2', label: 'deleted' },
  status_changed: { icon: '◎',  color: '#d97706', bg: '#fffbeb', label: 'status changed' },
  qr_viewed:      { icon: '⊡',  color: '#7c3aed', bg: '#f5f3ff', label: 'QR viewed' },
  qr_downloaded:  { icon: '↓',  color: '#0891b2', bg: '#ecfeff', label: 'QR downloaded' },
  qr_scanned:     { icon: '⌖',  color: '#059669', bg: '#ecfdf5', label: 'QR scanned by' },
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

export default function Dashboard() {
  const [view, setView] = useState('dashboard')
  const [editingMural, setEditingMural] = useState(null)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, scans: 0 })
  const [adminEmail, setAdminEmail] = useState('')
  const [recentMurals, setRecentMurals] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [scanData, setScanData] = useState([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 768
  const isTablet = windowWidth >= 768 && windowWidth < 1024

  const loadStats = async () => {
  const { count: total } = await supabase.from('murals').select('*', { count: 'exact', head: true })
  const { count: active } = await supabase.from('murals').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: inactive } = await supabase.from('murals').select('*', { count: 'exact', head: true }).eq('status', 'inactive')
  const { count: scans } = await supabase
  .from('unique_qr_scans')
  .select('*', { count: 'exact', head: true })
  setStats({ total: total || 0, active: active || 0, inactive: inactive || 0, scans })
}
  const loadRecent = async () => {
    const { data } = await supabase.from('murals').select('*, mural_images(*)').order('created_at', { ascending: false }).limit(5)
    setRecentMurals(data || [])
  }

  const loadCombinedActivity = async () => {
  console.log('🔄 Loading recent QR scans...')
  
  try {
    // Fetch QR scans
    const { data: qrScans, error } = await supabase
      .from('qr_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(15)
    
    if (error) {
      console.error('❌ Error fetching scans:', error)
      return
    }
    
    console.log('📊 Fetched QR scans:', qrScans?.length || 0)
    
    if (!qrScans || qrScans.length === 0) {
      setRecentActivity([])
      return
    }
    
    // Get unique mural IDs to fetch names
    const muralIds = [...new Set(qrScans.map(scan => scan.mural_id))]
    
    // Fetch mural titles from murals table
    const { data: murals } = await supabase
      .from('murals')
      .select('mural_id, title, custom_mural_id')
      .in('mural_id', muralIds)
    
    // Create a map of mural_id to title
    const muralNameMap = {}
    murals?.forEach(mural => {
      muralNameMap[mural.mural_id] = mural.title
      if (mural.custom_mural_id) {
        muralNameMap[mural.custom_mural_id] = mural.title
      }
    })
    
    // Transform data with both ID and Name
    const scanActivities = qrScans.map(scan => ({
      action: 'qr_scanned',
      mural_id: scan.mural_id,  // The ID (e.g., DBKU-MURAL-001 or UUID)
      mural_name: muralNameMap[scan.mural_id] || scan.mural_id,  // The actual name/title
      detail: scan.ip_address ? `IP: ${scan.ip_address}` : 'QR code scanned ',
      created_at: scan.scanned_at,
      ip_address: scan.ip_address,
      country: scan.country,
      city: scan.city,
      //user_agent: scan.user_agent
    }))

     
    
    setRecentActivity(scanActivities)
    console.log('✅ Loaded', scanActivities.length, 'activities')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}
  const loadChartData = async () => {
  const { data: murals } = await supabase.from('murals').select('category')
  if (murals) {
    const counts = {}
    murals.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1 })
    setCategoryData(Object.entries(counts).map(([name, value]) => ({ name, value })))
  }

  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-MY', { weekday: 'short' })
    const dateStr = d.toISOString().split('T')[0]
    days.push({ label, date: dateStr })
  }

  const { data: scans } = await supabase
  .from('unique_qr_scans')
  .select('scanned_at')
  .gte('scanned_at', days[0].date)

const scanCounts = {}
days.forEach(d => { scanCounts[d.date] = 0 })
scans?.forEach(s => {
  const date = s.scanned_at.split('T')[0]
  if (scanCounts[date] !== undefined) scanCounts[date]++
})
setScanData(days.map(d => ({ name: d.label, scans: scanCounts[d.date] })))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleEdit = (mural) => { setEditingMural(mural); setView('edit') }
  
  const handleDone = () => {
    setView('murals')
    setEditingMural(null)
    setRefreshTrigger(prev => prev + 1) // Refresh all data
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'murals',    label: 'Murals',    icon: Image },
    { id: 'map',       label: 'Map View',  icon: Map },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'export',    label: 'Export',    icon: Download },
    { id: 'settings',  label: 'Settings',  icon: SettingsIcon },
  ]

  const initials = adminEmail ? adminEmail.substring(0, 2).toUpperCase() : 'AD'

  const sw = isMobile ? '0px' : sidebarCollapsed ? '68px' : '240px'
  const mainPadding = isMobile ? '16px' : isTablet ? '24px 28px' : '36px 40px'

  const formatTime = (ts) =>
    new Date(ts).toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const handleNavClick = (id) => {
    setView(id)
    setMobileMenuOpen(false)
  }

  const statCards = [
    { label: 'Total Murals', value: stats.total,    icon: Image,       color: '#0a0a0a' },
    { label: 'Active',       value: stats.active,   icon: CheckCircle, color: '#16a34a' },
    { label: 'Inactive',     value: stats.inactive, icon: XCircle,     color: '#dc2626' },
    { label: 'QR Scans',     value: stats.scans,    icon: TrendingUp,  color: '#2563eb' },
  ]
 
  // Load data when refreshTrigger changes
  useEffect(() => {
    loadStats()
    loadRecent()
    loadCombinedActivity()
    loadChartData()
  }, [refreshTrigger])

  // Load admin email on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminEmail(user.email)
    })
  }, [])

  // Real-time subscriptions for automatic refresh
  useEffect(() => {
    // Subscribe to new QR scans
    const scanSubscription = supabase
      .channel('qr_scans_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'qr_scans' }, 
        () => {
          console.log('🔄 New QR scan detected, refreshing...')
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to mural activity changes
    const activitySubscription = supabase
      .channel('mural_activity_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'mural_activity' }, 
        () => {
          console.log('🔄 New activity detected, refreshing...')
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to mural changes (add/update/delete)
    const muralSubscription = supabase
      .channel('murals_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'murals' }, 
        () => {
          console.log('🔄 Mural data changed, refreshing...')
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      scanSubscription.unsubscribe()
      activitySubscription.unsubscribe()
      muralSubscription.unsubscribe()
    }
  }, [])

  // Handle sidebar collapse on tablet
  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true)
    if (!isMobile && !isTablet) setSidebarCollapsed(false)
  }, [isMobile, isTablet])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f8f6', fontFamily: "'DM Sans', sans-serif" }}>

      {/* mobile top bar */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: '#0a0a0a', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid #1a1a1a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/dbku-logo.webp" alt="DBKU"
              style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={e => e.target.style.display = 'none'}
            />
            <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>Mural Portal</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      )}

      {/* mobile menu */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)' }}
          />
          <div style={{
            position: 'fixed', top: '56px', left: 0, bottom: 0, width: '240px',
            background: '#0a0a0a', zIndex: 160, display: 'flex', flexDirection: 'column',
            padding: '12px 8px'
          }}>
            <nav style={{ flex: 1 }}>
              {navItems.map(item => {
                const Icon = item.icon
                const active = view === item.id || (item.id === 'murals' && (view === 'add' || view === 'edit'))
                return (
                  <button key={item.id} onClick={() => handleNavClick(item.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '8px', border: 'none',
                    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: active ? 'white' : '#666',
                    fontSize: '14px', fontWeight: active ? '600' : '400',
                    marginBottom: '2px', textAlign: 'left', cursor: 'pointer'
                  }}>
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}
            </nav>
            <div style={{ padding: '12px 8px', borderTop: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '4px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '700' }}>{initials}</div>
                <div style={{ color: '#888', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminEmail}</div>
              </div>
              <button onClick={handleLogout} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', border: 'none',
                background: 'transparent', color: '#555', fontSize: '13px', cursor: 'pointer'
              }}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* desktop sidebar*/}
      {!isMobile && (
        <div style={{
          width: sw, background: '#0a0a0a', display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
          transition: 'width 0.2s', overflow: 'hidden'
        }}>
          <div style={{ padding: sidebarCollapsed ? '20px 16px' : '24px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/dbku-logo.webp" alt="DBKU"
              style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
              onError={e => e.target.style.display = 'none'}
            />
            {!sidebarCollapsed && (
              <div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' }}>Mural Portal</div>
                <div style={{ color: '#444', fontSize: '11px', whiteSpace: 'nowrap' }}>DBKU Admin</div>
              </div>
            )}
          </div>

          <nav style={{ flex: 1, padding: '12px 8px' }}>
            {navItems.map(item => {
              const Icon = item.icon
              const active = view === item.id || (item.id === 'murals' && (view === 'add' || view === 'edit'))
              return (
                <button key={item.id} onClick={() => setView(item.id)} title={sidebarCollapsed ? item.label : ''} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', border: 'none',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: active ? 'white' : '#666',
                  fontSize: '13px', fontWeight: active ? '600' : '400',
                  marginBottom: '2px', textAlign: 'left', cursor: 'pointer',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  overflow: 'hidden', whiteSpace: 'nowrap'
                }}>
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && item.label}
                </button>
              )
            })}
          </nav>

          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
            margin: '0 8px 8px', padding: '10px 12px', background: 'transparent', border: 'none',
            color: '#444', fontSize: '11px', cursor: 'pointer', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '8px'
          }}>
            {sidebarCollapsed ? '→' : '← Collapse'}
          </button>

          <div style={{ padding: '12px 8px', borderTop: '1px solid #1a1a1a' }}>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '4px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: '#888', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminEmail}</div>
                </div>
              </div>
            )}
            <button onClick={handleLogout} title="Sign out" style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', border: 'none',
              background: 'transparent', color: '#555', fontSize: '13px', cursor: 'pointer',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
            }}>
              <LogOut size={15} />
              {!sidebarCollapsed && 'Sign out'}
            </button>
          </div>
        </div>
      )}

      {/* content */}
      <div style={{
        marginLeft: isMobile ? '0' : sw,
        flex: 1,
        padding: mainPadding,
        paddingTop: isMobile ? '72px' : (isTablet ? '28px' : '36px'),
        minHeight: '100vh',
        transition: 'margin-left 0.2s'
      }}>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <>
            {/* Page header */}
            <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>Dashboard</h1>
              <p style={{ color: '#888', fontSize: '12px', marginTop: '3px', marginBottom: 0 }}>DBKU Mural Registry overview</p>
            </div>

            {/* stat cards */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '8px' : '14px',
              marginBottom: isMobile ? '12px' : '20px',
            }}>
              {statCards.map((s, idx) => {
                const Icon = s.icon
                return (
                  <div key={s.label} style={{
                    flex: 1,
                    background: 'white',
                    borderRadius: '10px',
                     padding: isMobile ? '8px 6px' : '10px 8px',
                    border: '1px solid #ebebeb',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: isMobile ? '22px' : '28px',
                      fontWeight: '700',
                      letterSpacing: '-1px',
                      color: s.color,
                      lineHeight: 1,
                    }}>
                      {s.value}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#888',
                      marginTop: '3px',
                    }}>
                      {s.label}
                    </div>
                  </div>
                )
              })}
            </div>
                        {/* Quick Actions */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: isMobile ? '12px 14px' : '16px 20px',
              border: '1px solid #ebebeb',
              marginBottom: isMobile ? '12px' : '20px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '10px' }}>
                Quick Actions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Add Mural', icon: Plus,      action: () => setView('add') },
                  { label: 'Map View',  icon: Map,       action: () => setView('map') },
                  { label: 'Analytics', icon: BarChart2, action: () => setView('analytics') },
                  { label: 'Export',    icon: Download,  action: () => setView('export') },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.label}
                      onClick={a.action}
                      style={{
                        padding: '12px 10px',
                        background: '#f8f8f6',
                        border: '1px solid #ebebeb',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#0a0a0a',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f0ee'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8f8f6'}
                    >
                      <Icon size={15} style={{ flexShrink: 0 }} />
                      {a.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* status overview */}
            {stats.total > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: isMobile ? '12px 14px' : '16px 20px',
                border: '1px solid #ebebeb',
                marginBottom: isMobile ? '12px' : '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>
                    Status overview
                  </span>
                  <span style={{ fontSize: '11px', color: '#aaa' }}>
                    {Math.round((stats.active / stats.total) * 100)}% active
                  </span>
                </div>
                <div style={{ height: isMobile ? '6px' : '8px', borderRadius: '4px', background: '#f0f0f0', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    height: '100%',
                    width: `${(stats.active / stats.total) * 100}%`,
                    background: '#0a0a0a',
                    borderRadius: '4px',
                    transition: 'width 0.5s'
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: '#555' }}><span style={{ fontWeight: '700' }}>{stats.active}</span> active</span>
                  <span style={{ fontSize: '12px', color: '#aaa' }}><span style={{ fontWeight: '700' }}>{stats.inactive}</span> inactive</span>
                </div>
              </div>
            )}

            {/* charts - mobile stacked*/}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '12px' : '16px',
              marginBottom: isMobile ? '12px' : '20px'
            }}>
              {/* QR Scans bar chart */}
              <div style={{ background: 'white', borderRadius: '12px', padding: isMobile ? '14px' : '20px', border: '1px solid #ebebeb' }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>QR Scans</div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>Last 7 days</div>
                </div>
                <div style={{ height: '120px' }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={scanData} barSize={18}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #ebebeb', boxShadow: 'none' }} />
                      <Bar dataKey="scans" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category pie chart */}
              <div style={{ background: 'white', borderRadius: '12px', padding: isMobile ? '14px' : '20px', border: '1px solid #ebebeb' }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>By Category</div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>Mural distribution</div>
                </div>
                {categoryData.length === 0
                  ? (
                    <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', fontSize: '12px' }}>
                      No data yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                        <ResponsiveContainer width={100} height={100}>
                          <PieChart>
                            <Pie data={categoryData} cx="50%" cy="50%" innerRadius={24} outerRadius={44} dataKey="value" paddingAngle={2}>
                              {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ flex: 1 }}>
                        {categoryData.map((d, i) => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#0a0a0a' }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* BOTTOM ROW: Recently Added + Recent Activity */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '12px' : '16px'
            }}>

              {/* Recently Added */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #ebebeb', padding: isMobile ? '12px 14px' : '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>Recently Added</div>
                  <button
                    onClick={() => setView('murals')}
                    style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    View all <ChevronRight size={12} />
                  </button>
                </div>

                {recentMurals.length === 0
                  ? <p style={{ color: '#bbb', fontSize: '13px', margin: 0 }}>No murals yet.</p>
                  : recentMurals.map((m, idx) => (
                    <div key={m.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: isMobile ? '8px 0' : '10px 0',
                      borderBottom: idx < recentMurals.length - 1 ? '1px solid #f5f5f5' : 'none'
                    }}>
                      <div style={{
                        width: isMobile ? '34px' : '38px',
                        height: isMobile ? '34px' : '38px',
                        borderRadius: '8px',
                        background: '#f0f0f0',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {m.mural_images?.[0]?.image_url
                          ? <img src={m.mural_images[0].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Image size={13} color="#ccc" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{m.artist} · {m.mural_id}</div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '20px',
                        background: m.status === 'active' ? '#f0f0f0' : '#fafafa',
                        color: m.status === 'active' ? '#333' : '#bbb',
                        fontWeight: '600',
                        border: '1px solid #e8e8e8',
                        flexShrink: 0
                      }}>
                        {m.status}
                      </span>
                    </div>
                  ))
                }
              </div>

              {/* Recent Activity */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #ebebeb', padding: isMobile ? '12px 14px' : '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={12} color="#888" />
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>Recent Activity</div>
                  </div>
                  <button
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Refresh
                  </button>
                </div>

                {recentActivity.length === 0 ? (
                  <p style={{ color: '#bbb', fontSize: '13px', margin: 0 }}>No activity yet.</p>
                ) : (
                  recentActivity.map((a, idx) => {
                    const meta = ACTIVITY_META[a.action] || { icon: '•', color: '#888', bg: '#f8f8f6', label: a.action }
                    const isScan = a.action === 'qr_scanned'
                    return (
                      <div key={a.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '9px',
                        padding: isMobile ? '7px 0' : '9px 0',
                        borderBottom: idx < recentActivity.length - 1 ? '1px solid #f5f5f5' : 'none'
                      }}>
                        <div style={{
                          width: isMobile ? '24px' : '26px',
                          height: isMobile ? '24px' : '26px',
                          borderRadius: '6px',
                          flexShrink: 0,
                          background: meta.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', color: meta.color, fontWeight: '700'
                        }}>
                          {isScan ? '⌖' : meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                             {a.mural_name || a.mural_id || '—'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>
                            <span style={{ color: meta.color, fontWeight: '600' }}>{meta.label}</span>
                            {a.detail && !isScan ? <span> · {a.detail}</span> : null}
                            {isScan && a.ip_address!== 'unknown' && (
                              <span> · <span style={{ fontFamily: 'monospace', color: '#0a0a0a', fontWeight: '500' }}>{a.ip_address}</span></span>
                            )}
                            {isScan && a.country && <span> · {a.country}</span>}
                            {isScan && a.city && <span> · {a.city}</span>}
                            <span> · {formatTime(a.created_at)}</span>
                          </div>
                          {isScan && a.user_agent && (
                            <div style={{ fontSize: '9px', color: '#ccc', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.user_agent.split(' ').slice(0, 3).join(' ')}...
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* all murals */}
        {view === 'murals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>All Murals</h1>
                <p style={{ color: '#888', fontSize: '13px', marginTop: '3px', marginBottom: 0 }}>{stats.total} murals in registry</p>
              </div>
              <button onClick={() => setView('add')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <Plus size={15} /> Add Mural
              </button>
            </div>
            <MuralList onEdit={handleEdit} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
          </>
        )}

        {/* edit murals */}
        {(view === 'add' || view === 'edit') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button onClick={handleDone} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>
                ← Back
              </button>
              <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
                {view === 'add' ? 'Add New Mural' : 'Edit Mural'}
              </h1>
            </div>
            <MuralForm mural={editingMural} onDone={handleDone} />
          </>
        )}

        {/* maps view */}
        {view === 'map' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>Map View</h1>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '3px', marginBottom: 0 }}>All mural locations in Kuching</p>
            </div>
            <MapView />
          </>
        )}

        {/*analytics*/}
        {view === 'analytics' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>Analytics</h1>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '3px', marginBottom: 0 }}>QR scan statistics and trends</p>
            </div>
            <Analytics />
          </>
        )}

        {/*export panels*/}
        {view === 'export' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>Export</h1>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '3px', marginBottom: 0 }}>Download mural data as Excel or PDF</p>
            </div>
            <ExportPanel />
          </>
        )}

        {/*settings*/}
        {view === 'settings' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>Settings</h1>
            </div>
            <Settings adminEmail={adminEmail} onLogout={handleLogout} />
          </>
        )}

      </div>
    </div>
  )
}