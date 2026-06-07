import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ArrowLeftRight, BarChart3,
  LogOut, Menu, X
} from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import './Layout.css'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentações' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
]

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = usuario?.nome?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || 'U'

  return (
    <div className="app-layout">
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button className="btn-icon" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
        <img src={logo} alt="PinnacleBI" className="mobile-logo" />
        <div className="avatar-sm">{initials}</div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="PinnacleBI" className="sidebar-logo" />
          <button className="btn-icon mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{initials}</div>
            <div className="user-details">
              <span className="user-name">{usuario?.nome}</span>
              <span className="user-email">{usuario?.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
        <footer className="page-footer">
          <img src={logo} alt="PinnacleBI" className="footer-logo" />
          <span>© 2026 PinnacleBI — Criado por Lauan De Lima. Todos os direitos reservados.</span>
        </footer>
      </main>
    </div>
  )
}
