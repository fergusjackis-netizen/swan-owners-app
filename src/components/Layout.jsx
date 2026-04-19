import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

export default function Layout() {
  const { user, userProfile, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Primary nav  -  always visible
  const primaryNav = [
    { path: '/fleet', label: 'Fleet' },
    { path: '/issues', label: 'Issues & Fixes' },
    { path: '/models', label: 'Models' },
    ...(user ? [
      { path: '/map', label: 'Live Map' },
      { path: '/forum', label: 'Forum' },
    ] : []),
  ]

  // Secondary nav  -  in dropdown when logged in
  const secondaryNav = user ? [
    { path: '/contacts', label: 'Contacts' },
    { path: '/messages', label: 'Messages' },
    { path: '/my-yacht', label: 'My Yacht' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin Panel' }] : []),
  ] : []

  const firstName = userProfile?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-swan">SWAN</span>
          <span className="logo-owners">OWNERS</span>
        </Link>

        <nav className="nav">
          {primaryNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="user-dropdown">
              <button
                className="user-trigger"
                onClick={() => setMenuOpen(o => !o)}
              >
                <span className="user-first-name">{firstName}</span>
                <span className="dropdown-arrow">{menuOpen ? '▲' : '▼'}</span>
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  {secondaryNav.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-signout"
                    onClick={() => { logout(); navigate('/'); setMenuOpen(false) }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-primary">Join</Link>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-disclaimer">
          <p className="footer-main">
            Swan Owners Community is an independent, member-run platform and is not affiliated with,
            endorsed by, or connected to Nautor's Swan Oy or any of its subsidiaries. The name "Swan"
            is used solely to describe the type of vessel owned by members. All trademarks, including
            the Swan name and logo, remain the property of Nautor's Swan Oy. No copyrighted materials,
            technical drawings, brochures or imagery belonging to Nautor's Swan Oy are reproduced on
            this platform. All photographs are owner-uploaded images of their own vessels. Vessel
            specification data is sourced from publicly available information only.
          </p>
          <p className="footer-links-row">
            <span className="footer-links-label">Official manufacturer's website:</span>
            <a href="https://www.nautorswan.com" target="_blank" rel="noopener noreferrer">
              Nautor's Swan  -  nautorswan.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
