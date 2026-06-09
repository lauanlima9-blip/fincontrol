import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import CadastroPage from './pages/CadastroPage'
import DashboardPage from './pages/DashboardPage'
import MovimentacoesPage from './pages/MovimentacoesPage'
import RelatoriosPage from './pages/RelatoriosPage'
import CategoriasPage from './pages/CategoriasPage'
import PerfilPage from './pages/PerfilPage'
import LandingPage from './pages/LandingPage'
import CartoesPage from './pages/CartoesPage'
import ParcelamentosPage from './pages/ParcelamentosPage'
import InsightsPage from './pages/InsightsPage'
import ImportacaoPage from './pages/ImportacaoPage'
import SimuladorPage from './pages/SimuladorPage'
import CalendarioPage from './pages/CalendarioPage'
import NotificacoesPage from './pages/NotificacoesPage'
import PatrimonioPage from './pages/PatrimonioPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'
import PlanosPage from './pages/PlanosPage'
import SobrePage from './pages/SobrePage'
import TermosPage from './pages/TermosPage'
import PrivacidadePage from './pages/PrivacidadePage'
import ContatoPage from './pages/ContatoPage'
import AdminPage from './pages/AdminPage'

function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  return usuario ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!usuario) return <Navigate to="/login" replace />
  return usuario.role === 'admin' ? children : <div className="admin-denied"><h1>403 - Acesso Negado</h1><p>Somente administradores podem acessar esta área.</p></div>
}

function isPremiumUser(usuario) {
  const role = (usuario?.role || '').toLowerCase()
  const plano = (usuario?.plano || '').toLowerCase()
  return role === 'admin' || role === 'premium' || plano === 'premium'
}

function PremiumRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!usuario) return <Navigate to="/login" replace />
  if (!isPremiumUser(usuario)) {
    return <div className="feature-page fade-in"><div className="feature-card premium-lock-card"><h1>🔒 Recurso Premium</h1><p>Este módulo faz parte do Plano Premium do Pinnacle Finance.</p><p>Atualize seu plano para acessar cartões, parcelamentos, insights IA, importação, relatórios avançados, calendário, score, patrimônio e backup.</p><a className="btn-save" href="/planos">Ver planos</a></div></div>
  }
  return children
}

function PublicRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return null
  return usuario ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/cadastro" element={<PublicRoute><CadastroPage /></PublicRoute>} />
          <Route path="/sobre" element={<SobrePage />} />
          <Route path="/termos" element={<TermosPage />} />
          <Route path="/privacidade" element={<PrivacidadePage />} />
          <Route path="/contato" element={<ContatoPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="movimentacoes" element={<MovimentacoesPage />} />
            <Route path="relatorios" element={<PremiumRoute><RelatoriosPage /></PremiumRoute>} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="cartoes" element={<PremiumRoute><CartoesPage /></PremiumRoute>} />
            <Route path="parcelamentos" element={<PremiumRoute><ParcelamentosPage /></PremiumRoute>} />
            <Route path="insights" element={<PremiumRoute><InsightsPage /></PremiumRoute>} />
            <Route path="simulador" element={<SimuladorPage />} />
            <Route path="calendario" element={<PremiumRoute><CalendarioPage /></PremiumRoute>} />
            <Route path="notificacoes" element={<NotificacoesPage />} />
            <Route path="patrimonio" element={<PremiumRoute><PatrimonioPage /></PremiumRoute>} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="planos" element={<PlanosPage />} />
            <Route path="importacao" element={<PremiumRoute><ImportacaoPage /></PremiumRoute>} />
            <Route path="sobre" element={<SobrePage />} />
            <Route path="termos" element={<TermosPage />} />
            <Route path="privacidade" element={<PrivacidadePage />} />
            <Route path="contato" element={<ContatoPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
