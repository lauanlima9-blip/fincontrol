import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ArrowLeftRight, BarChart3, LogOut, Menu, X, Tags, User, Sun, Moon, Instagram, CreditCard, Brain, Upload, SplitSquareHorizontal } from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import './Layout.css'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentações' },
  { to: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { to: '/parcelamentos', icon: SplitSquareHorizontal, label: 'Parcelamentos' },
  { to: '/insights', icon: Brain, label: 'Insights IA' },
  { to: '/importacao', icon: Upload, label: 'Importar Extrato' },
  { to: '/categorias', icon: Tags, label: 'Categorias' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('pinnacle_theme') || 'dark')
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('pinnacle_theme', theme) }, [theme])
  const handleLogout = () => { logout(); navigate('/login') }
  const initials = usuario?.nome?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || 'U'
  return <div className="app-layout">
    {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
    <header className="mobile-topbar"><button className="btn-icon" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><img src={logo} alt="PinnacleBI" className="mobile-logo" /><button className="btn-icon" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button></header>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-header"><img src={logo} alt="PinnacleBI" className="sidebar-logo" /><button className="btn-icon mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <nav className="sidebar-nav">{navItems.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>} {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</button>
        <a className="instagram-link" href="https://www.instagram.com/pinnacle.bi/" target="_blank" rel="noreferrer"><Instagram size={16}/> Siga a Pinnacle BI no Instagram</a>
        <div className="user-info"><div className="avatar">{initials}</div><div className="user-details"><span className="user-name">{usuario?.nome}</span><span className="user-email">{usuario?.email}</span></div></div>
        <button className="btn-logout" onClick={handleLogout}><LogOut size={16} /><span>Sair</span></button>
      </div>
    </aside>
    <main className="main-content"><Outlet /><footer className="page-footer"><img src={logo} alt="PinnacleBI" className="footer-logo" /><span>© 2026 Pinnacle BI — Controle financeiro pessoal moderno.</span><a href="https://www.instagram.com/pinnacle.bi/" target="_blank" rel="noreferrer">Instagram</a></footer></main>
  </div>
}
