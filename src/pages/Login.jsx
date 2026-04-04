import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import dbkulogo from '../assets/dbku-logo.jpg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/admin')
    setLoading(false)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── DESKTOP: two-column layout ── */
        .login-wrapper {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
        }

        /* Left branding panel */
        .login-left {
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }
        .login-left-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .login-left-content { position: relative; margin-top: 35px; }
        .login-badge {
          display: inline-block;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 15px;
          color: #888;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .login-heading {
          color: white;
          font-size: 65px;
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -1px;
          margin-bottom: 16px;
        }
        .login-desc {
          color: #555;
          font-size: 15px;
          line-height: 1.6;
          max-width: 320px;
        }
        .login-footer {
          color: #333;
          font-size: 12px;
          position: relative;
        }

        /* Right form panel */
        .login-right {
          background: #f8f8f6;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }
        .login-form-box {
          width: 100%;
          max-width: 380px;
        }

        /* Desktop logo + heading block */
        .desktop-header {
          display: block;
        }
        /* Mobile card top — hidden on desktop */
        .mobile-card-top {
          display: none;
        }

        /* ── TABLET: same as desktop but single column, form only ── */
        @media (max-width: 1024px) {
          .login-wrapper {
            grid-template-columns: 1fr 1fr;
          }
          .login-left {
            padding: 40px 36px;
          }
          .login-heading {
            font-size: 48px;
          }
          .login-badge {
            font-size: 12px;
          }
          .login-right {
            padding: 40px 36px;
          }
        }

        /* ── MOBILE: centered card on dark grid ── */
        @media (max-width: 600px) {
          .login-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100dvh;
            padding: 28px 20px;
            background-color: #0a0a0a;
            background-image:
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
            background-size: 32px 32px;
            grid-template-columns: unset;
          }

          /* Hide left branding panel on mobile */
          .login-left {
            display: none;
          }

          /* Transparent container, card styling on the inner box */
          .login-right {
            background: transparent;
            padding: 0;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* White centered card */
          .login-form-box {
            width: 100%;
            max-width: 360px;
            background: #ffffff;
            border-radius: 22px;
            padding: 32px 24px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.3);
          }

          /* Show mobile card top, hide desktop header */
          .desktop-header {
            display: none;
          }
          .mobile-card-top {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-bottom: 18px;
            padding-bottom: 20px;
            border-bottom: 1px solid #f0f0ee;
          }
          .mobile-card-top img {
            width: 100px;
            height: 64px;
            object-fit: contain;
            margin-bottom: 18px;
          }
          .mobile-app-name {
            font-size: 16px;
            font-weight: 700;
            color: #0a0a0a;
            letter-spacing: -0.3px;
            margin-bottom: 4px;
          }
          .mobile-system-name {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            color: #aaa;
          }

          /* Slightly tighten spacing inside card */
          .form-field-gap { margin-bottom: 14px !important; }
          .form-pw-gap { margin-bottom: 22px !important; }

          /* Inputs at 16px to prevent iOS zoom */
          input[type="email"],
          input[type="password"],
          input[type="text"] {
            font-size: 16px !important;
          }
        }
      `}</style>

      <div className="login-wrapper">

        {/* ── Left branding panel (desktop & tablet only) ── */}
        <div className="login-left">
          <div className="login-left-grid" />
          <div className="login-left-content">
            <div className="login-badge">Mural Registry System</div>
            <h1 className="login-heading">
              Kuching's<br />Public Art<br />Portal
            </h1>
            <p className="login-desc">
              Manage, document and share Kuching's mural heritage with the public through QR-enabled storytelling.
            </p>
          </div>
          <div className="login-footer">
            © {new Date().getFullYear()} Dewan Bandaraya Kuching Utara
          </div>
        </div>

        {/* ── Right / form panel ── */}
        <div className="login-right">
          <div className="login-form-box">

            {/* Mobile: logo + app name at top of card */}
            <div className="mobile-card-top">
              <img src={dbkulogo} alt="DBKU Logo" />
              <div className="mobile-app-name">Kuching Public Art Portal</div>
              <div className="mobile-system-name">Mural Registry System</div>
            </div>

            {/* Desktop / tablet: logo + heading */}
            <div className="desktop-header">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <img
                  src={dbkulogo}
                  alt="DBKU"
                  style={{ width: '100px', height: '90px', objectFit: 'contain' }}
                />
              </div>
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                  Admin Sign In
                </h2>
                <p style={{ color: '#888', fontSize: '14px' }}>
                  Access restricted to authorised personnel only.
                </p>
              </div>
            </div>

            {/* Mobile: compact sign-in heading (shown inside card, below logo strip) */}
            <div style={{ marginBottom: '20px' }} className="mobile-signin-heading">
              <style>{`
                .mobile-signin-heading { display: none; }
                @media (max-width: 600px) {
                  .mobile-signin-heading { display: block; }
                  .mobile-signin-heading h2 {
                    font-size: 18px; font-weight: 700; color: #0a0a0a;
                    letter-spacing: -0.3px; margin-bottom: 3px;
                    font-family: 'DM Sans', sans-serif;
                  }
                  .mobile-signin-heading p {
                    font-size: 12px; color: #aaa;
                    font-family: 'DM Sans', sans-serif;
                  }
                }
              `}</style>
              <h2>Admin Sign In</h2>
              <p>Access restricted to authorised personnel only.</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fff0f0', border: '1px solid #fcc', color: '#c00',
                padding: '11px 14px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px'
              }}>{error}</div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '16px' }} className="form-field-gap">
              <label style={{
                fontSize: '11px', fontWeight: '600', color: '#888',
                letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '7px'
              }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="admin@dbku.gov.my"
                autoComplete="email"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  border: '1.5px solid #e0e0e0', fontSize: '14px', background: 'white',
                  outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                  fontFamily: "'DM Sans', sans-serif"
                }}
                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }} className="form-pw-gap">
              <label style={{
                fontSize: '11px', fontWeight: '600', color: '#888',
                letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '7px'
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '12px 44px 12px 16px', borderRadius: '10px',
                    border: '1.5px solid #e0e0e0', fontSize: '14px', background: 'white',
                    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#aaa', padding: 0,
                    display: 'flex', cursor: 'pointer'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#555' : '#0a0a0a',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '600', letterSpacing: '0.2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background 0.2s', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif"
              }}
            >
              {loading ? 'Signing in…' : <><LogIn size={16} /> Sign In</>}
            </button>

            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#bbb' }}>
              For access issues, contact Bahagian Teknologi Maklumat
            </p>

          </div>
        </div>
      </div>
    </>
  )
}
