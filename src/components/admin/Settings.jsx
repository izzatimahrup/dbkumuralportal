import { useState } from 'react'
import { supabase } from '../../supabase'
import { LogOut, Key, User, Shield, Bell } from 'lucide-react'

export default function Settings({ adminEmail, onLogout }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async () => {
    setPwMsg(''); setPwError('')
    if (!newPassword || newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPwError(error.message)
    else { setPwMsg('Password updated successfully.'); setNewPassword(''); setConfirmPassword('') }
    setLoading(false)
  }

  const sections = [
    {
      icon: User,
      title: 'Account',
      content: (
        <div>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '3px' }}>Email Address</div>
            <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>{adminEmail}</div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f5f5f5' }}>
            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '3px' }}>Role</div>
            <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>Admin DBKU</div>
          </div>
        </div>
      )
    },
    {
      icon: Key,
      title: 'Change Password',
      content: (
        <div>
          {pwError && <div style={{ background: '#fff0f0', border: '1px solid #fcc', color: '#c00', padding: '9px 13px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{pwError}</div>}
          {pwMsg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '9px 13px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{pwMsg}</div>}
          {[
            { label: 'New Password', val: newPassword, set: setNewPassword },
            { label: 'Confirm Password', val: confirmPassword, set: setConfirmPassword },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>{f.label}</label>
              <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
                style={{ width: '100%', maxWidth: '320px', padding: '9px 13px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '13px', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
            </div>
          ))}
          <button onClick={handleChangePassword} disabled={loading} style={{ padding: '9px 18px', background: loading ? '#aaa' : '#0a0a0a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      )
    },

  ]

  return (
    <div style={{ maxWidth: '580px', display: 'grid', gap: '14px' }}>
      {sections.map(s => {
        const Icon = s.icon
        return (
          <div key={s.title} style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '18px' }}>
              <Icon size={16} color="#888" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.title}</span>
            </div>
            {s.content}
          </div>
        )
      })}

      {/* Sign out */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #ebebeb' }}>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fff8f8', border: '1px solid #fce8e8', borderRadius: '8px', fontSize: '13px', color: '#cc0000', fontWeight: '600', cursor: 'pointer' }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  )
}