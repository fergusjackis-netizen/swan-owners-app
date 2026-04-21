import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

export default function Layout() {
  const { user, userProfile, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const primaryNav = [
    { path: '/fleet', label: 'Fleet' },
    { path: '/issues', label: 'Issues & Fixes' },
    { path: '/models', label: 'Models' },
    ...(user ? [
      { path: '/map', label: 'Live Map' },
      { path: '/forum', label: 'Forum' },
    ] : []),
  ]

  const secondaryNav = user ? [
    { path: '/contacts', label: 'Contacts' },
    { path: '/my-yacht', label: 'My Yacht' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin Panel' }] : []),
  ] : []

  const allNav = [...primaryNav, ...secondaryNav]

  function closeMenu() { setMenuOpen(false) }

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-swan">SWAN</span>
          <span className="logo-owners">OWNERS</span>
        </Link>
        <div className="header-actions">
          <button
            className={"hamburger" + (menuOpen ? " open" : "")}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <div className={"mobile-drawer" + (menuOpen ? " open" : "")}>
        <div className="drawer-header">
          <Link to="/" className="logo" onClick={closeMenu}>
            <span className="logo-swan">SWAN</span>
            <span className="logo-owners">OWNERS</span>
          </Link>
          <button className="drawer-close" onClick={closeMenu}>&#x2715;</button>
        </div>
        <nav className="drawer-nav">
          {allNav.map(item => (
            <Link key={item.path} to={item.path}
              className={"drawer-link" + (location.pathname.startsWith(item.path) ? " active" : "")}
              onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="drawer-footer">
          {user ? (
            <>
              <p className="user-drawer-name">{userProfile?.name || user.email}</p>
              <button className="btn-ghost" onClick={() => { logout(); navigate('/'); closeMenu() }}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" onClick={closeMenu}>Sign in</Link>
              <Link to="/register" className="btn-primary" onClick={closeMenu}>Join the Community</Link>
            </>
          )}
        </div>
      </div>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-disclaimer">
          <p className="footer-main">
            Swan Owners Community is an independent, member-run platform and is not affiliated with,
            endorsed by, or connected to Nautor's Swan Oy or any of its subsidiaries. The name Swan
            is used solely to describe the type of vessel owned by members. All trademarks remain the
            property of Nautor's Swan Oy. All photographs are owner-uploaded images of their own vessels.
            Vessel specification data is sourced from publicly available information only.
          </p>
          <p className="footer-links-row">
            <span className="footer-links-label">Official manufacturer website:</span>
            <a href="https://www.nautorswan.com" target="_blank" rel="noopener noreferrer">
              Nautor's Swan - nautorswan.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}