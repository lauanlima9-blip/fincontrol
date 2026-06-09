import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ArrowLeftRight, BarChart3, LogOut, Menu, X, Tags, User, Sun, Moon, Instagram, CreditCard, Brain, Upload, SplitSquareHorizontal, HelpCircle, PlayCircle, PiggyBank, CalendarDays, Bell, Landmark, Settings, Crown, Info, FileText, Shield, Phone, Home, Wrench, Undo2 } from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import ErrorBoundary from './ErrorBoundary'
import './Layout.css'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', help: 'Visão geral da sua vida financeira: saldo, receitas, despesas, metas, indicadores e gráficos.' },
  { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentações', help: 'Cadastre e acompanhe suas receitas e despesas. Esses dados alimentam o dashboard e os relatórios.' },
  { to: '/cartoes', icon: CreditCard, label: 'Cartões', premium: true, help: 'Gerencie cartões de crédito, limites, fechamento, vencimento, faturas e gastos por cartão.' },
  { to: '/parcelamentos', icon: SplitSquareHorizontal, label: 'Parcelamentos', premium: true, help: 'Controle compras parceladas, parcelas futuras, parcelas pagas e valor comprometido por mês.' },
  { to: '/insights', icon: Brain, label: 'Insights IA', premium: true, help: 'Análises automáticas sobre gastos, metas financeiras, cartões e parcelamentos. Sem consultas manuais.' },
  { to: '/simulador', icon: PiggyBank, label: 'Simulador', help: 'Planeje economias futuras, crie metas financeiras e acompanhe quanto falta para realizar seus objetivos.' },
  { to: '/calendario', icon: CalendarDays, label: 'Calendário', premium: true, help: 'Veja receitas, despesas, parcelas, vencimentos de cartões, metas e recorrências no calendário financeiro.' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações', help: 'Alertas inteligentes sobre faturas, limites, metas atrasadas e gastos acima da média.' },
  { to: '/patrimonio', icon: Landmark, label: 'Patrimônio', premium: true, help: 'Cadastre ativos e passivos para acompanhar seu patrimônio líquido.' },
  { to: '/importacao', icon: Upload, label: 'Importar Extrato', premium: true, help: 'Importe extratos CSV ou Excel, revise a prévia, confirme categorias e evite lançamentos duplicados.' },
  { to: '/categorias', icon: Tags, label: 'Categorias', help: 'Crie e edite categorias personalizadas para organizar receitas e despesas do seu jeito.' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios', premium: true, help: 'Acompanhe análises detalhadas, gráficos, indicadores e exportações para PDF.' },
  { to: '/planos', icon: Crown, label: 'Planos', help: 'Veja o plano gratuito e a estrutura premium preparada para monetização.' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', help: 'Altere dados da conta, tema, notificações, backup e exclusão de conta.' },
  { to: '/perfil', icon: User, label: 'Perfil', help: 'Atualize seus dados pessoais, senha e preferências da conta.' },
]

const adminItems = [
  { to: '/admin', icon: Wrench, label: 'Administração', help: 'Painel administrativo com dashboard, usuários, assinaturas, analytics, logs, segurança e configurações.' },
]

const legalItems = [
  { to: '/sobre', icon: Info, label: 'Sobre', help: 'Conheça o Pinnacle Finance, sua missão, contato oficial e quem desenvolveu o projeto.' },
  { to: '/termos', icon: FileText, label: 'Termos', help: 'Veja os Termos de Uso da plataforma.' },
  { to: '/privacidade', icon: Shield, label: 'Privacidade', help: 'Entenda como seus dados são tratados e protegidos.' },
  { to: '/contato', icon: Phone, label: 'Contato', help: 'Fale com o suporte pelo e-mail oficial e Instagram.' },
]

const isPremiumUser = (usuario) => {
  const role = (usuario?.role || '').toLowerCase()
  const plano = (usuario?.plano || '').toLowerCase()
  return role === 'admin' || role === 'premium' || plano === 'premium'
}

export default function Layout() {
  const { usuario, logout, setUsuario } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('pinnacle_theme') || 'dark')
  const [welcomeOpen, setWelcomeOpen] = useState(() => localStorage.getItem('pinnacle_tour_seen') !== 'yes')
  const [tourStep, setTourStep] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [quickHelp, setQuickHelp] = useState(null)

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('pinnacle_theme', theme) }, [theme])

  const handleLogout = () => { logout(); navigate('/login') }
  const initials = usuario?.nome?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || 'U'
  const visibleNavItems = usuario?.role === 'admin' ? [...navItems, ...adminItems] : navItems
  const activeTour = tourStep !== null ? visibleNavItems[tourStep] : null
  const isImpersonating = !!localStorage.getItem('fincontrol_admin_token')

  function voltarAdmin() {
    const token = localStorage.getItem('fincontrol_admin_token')
    const admin = JSON.parse(localStorage.getItem('fincontrol_admin_usuario') || 'null')
    if (token && admin) {
      localStorage.setItem('fincontrol_token', token)
      localStorage.setItem('fincontrol_usuario', JSON.stringify(admin))
      localStorage.removeItem('fincontrol_admin_token')
      localStorage.removeItem('fincontrol_admin_usuario')
      setUsuario(admin)
      navigate('/admin')
    }
  }

  function startTour() {
    localStorage.setItem('pinnacle_tour_seen', 'yes')
    setWelcomeOpen(false)
    setHelpOpen(false)
    setMobileOpen(true)
    setTourStep(0)
  }

  function finishTour() {
    localStorage.setItem('pinnacle_tour_seen', 'yes')
    setTourStep(null)
    setMobileOpen(false)
  }

  return <div className="app-layout">
    {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
    <header className="mobile-topbar"><button className="btn-icon" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><img src={logo} alt="PinnacleBI" className="mobile-logo" /><button className="btn-icon" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button></header>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-header"><img src={logo} alt="PinnacleBI" className="sidebar-logo" /><button className="btn-icon mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <nav className="sidebar-nav">{visibleNavItems.map(({ to, icon: Icon, label, help, premium }, index) => {
        const locked = premium && !isPremiumUser(usuario)
        return <NavLink key={to} to={locked ? '/planos' : to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${tourStep === index ? 'tour-highlight' : ''} ${locked ? 'premium-locked' : ''}`} onClick={(e) => { if (locked) { setQuickHelp({ label: 'Recurso Premium', help: `${label} faz parte do Plano Premium. Acesse Planos para ver os benefícios.` }) } setMobileOpen(false) }} title={locked ? `${label} é um recurso Premium` : help}><Icon size={18} /><span>{label}</span>{locked && <Crown size={13} className="premium-mini-crown"/>}<button type="button" className="nav-help" title={`Ajuda: ${label}`} onClick={(e)=>{e.preventDefault();e.stopPropagation();setQuickHelp({ label: locked ? 'Recurso Premium' : label, help: locked ? `${label} faz parte do Plano Premium. Acesse Planos para ver os benefícios.` : help })}}>?</button></NavLink>
      })}</nav>
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>} {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</button>
        <NavLink to="/" className="footer-nav-item" onClick={() => setMobileOpen(false)}><Home size={16}/> <span>Visitar site</span></NavLink>
        <div className="sidebar-legal">{legalItems.map(({ to, icon: Icon, label, help }) => <NavLink key={to} to={to} className={({ isActive }) => `footer-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)} title={help}><Icon size={16}/><span>{label}</span></NavLink>)}</div>
        <a className="instagram-link" href="https://www.instagram.com/pinnacle.bi/" target="_blank" rel="noreferrer"><Instagram size={16}/> @pinnacle.bi</a>
        <div className="user-info"><div className="avatar">{initials}</div><div className="user-details"><span className="user-name">{usuario?.nome}</span><span className="user-email">{usuario?.email}</span><span className="user-email">{usuario?.role === 'admin' ? 'Administrador' : usuario?.plano || 'Gratuito'}</span></div></div>
        <button className="btn-logout" onClick={handleLogout}><LogOut size={16} /><span>Sair</span></button>
      </div>
    </aside>
    <main className="main-content">
      {isImpersonating && <div className="impersonate-layout-banner">Você está navegando como: <strong>{usuario?.nome}</strong><button type="button" onClick={voltarAdmin}><Undo2 size={14}/> Voltar para Admin</button></div>}
      <div className="help-topbar"><button type="button" className="help-center-btn" onClick={() => setHelpOpen(true)}><HelpCircle size={16}/> Centro de Ajuda</button></div>
      <ErrorBoundary><Outlet /></ErrorBoundary>
      <footer className="page-footer"><img src={logo} alt="PinnacleBI" className="footer-logo" /><span>© 2026 Pinnacle BI — Controle financeiro pessoal moderno. Feito por Lauan De Lima.</span><NavLink to="/termos">Termos de Uso</NavLink><NavLink to="/privacidade">Política de Privacidade</NavLink><NavLink to="/contato">Contato</NavLink><a href="https://www.instagram.com/pinnacle.bi/" target="_blank" rel="noreferrer">@pinnacle.bi</a></footer>
    </main>

    {welcomeOpen && (
      <div className="tour-overlay">
        <div className="tour-modal">
          <h2>👋 Bem-vindo ao Pinnacle Finance</h2>
          <p className="tour-subtitle">Um guia rápido para começar a usar o sistema com mais facilidade.</p>
          <ol className="tour-list">
            <li>1️⃣ Cadastre suas receitas e despesas</li>
            <li>2️⃣ Crie metas financeiras</li>
            <li>3️⃣ Adicione seus cartões</li>
            <li>4️⃣ Importe extratos bancários</li>
            <li>5️⃣ Acompanhe os Insights IA</li>
          </ol>
          <div className="tour-actions">
            <button type="button" className="btn-cancel" onClick={() => { localStorage.setItem('pinnacle_tour_seen','yes'); setWelcomeOpen(false) }}>Agora não</button>
            <button type="button" className="btn-save" onClick={startTour}>Começar Tour</button>
          </div>
        </div>
      </div>
    )}

    {tourStep !== null && activeTour && (
      <div className="tour-bubble">
        <div className="tour-count">{tourStep + 1} de {visibleNavItems.length}</div>
        <h3>{activeTour.label}</h3>
        <p>{activeTour.help}</p>
        <div className="tour-actions">
          <button type="button" className="btn-cancel" onClick={finishTour}>Encerrar</button>
          <button type="button" className="btn-save" onClick={() => tourStep < visibleNavItems.length - 1 ? setTourStep(tourStep + 1) : finishTour()}>{tourStep < visibleNavItems.length - 1 ? 'Próximo' : 'Finalizar'}</button>
        </div>
      </div>
    )}

    {(helpOpen || quickHelp) && (
      <div className="tour-overlay" onClick={() => { setHelpOpen(false); setQuickHelp(null) }}>
        <div className="help-modal" onClick={(e) => e.stopPropagation()}>
          <div className="help-modal-header"><h2>{quickHelp ? quickHelp.label : 'Centro de Ajuda'}</h2><button type="button" className="btn-icon" onClick={() => { setHelpOpen(false); setQuickHelp(null) }}><X size={18}/></button></div>
          {quickHelp ? <p className="help-single">{quickHelp.help}</p> : <>
            <p className="tour-subtitle">Entenda rapidamente para que serve cada área do Pinnacle Finance.</p>
            <div className="help-grid">
              {[...visibleNavItems, ...legalItems].map(({ icon: Icon, label, help }) => <div className="help-card" key={label}><Icon size={18}/><h3>{label}</h3><p>{help}</p></div>)}
            </div>
            <div className="video-help-box"><PlayCircle size={20}/><div><strong>Vídeos curtos de ajuda</strong><p>Espaço preparado para incluir tutoriais rápidos de cada módulo quando você quiser adicionar os vídeos.</p></div></div>
            <button type="button" className="btn-save" onClick={startTour}>Começar Tour</button>
          </>}
        </div>
      </div>
    )}
  </div>
}
