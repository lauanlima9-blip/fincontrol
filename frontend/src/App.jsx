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

function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  return usuario ? children : <Navigate to="/login" replace />
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
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="cartoes" element={<CartoesPage />} />
            <Route path="parcelamentos" element={<ParcelamentosPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="simulador" element={<SimuladorPage />} />
            <Route path="calendario" element={<CalendarioPage />} />
            <Route path="notificacoes" element={<NotificacoesPage />} />
            <Route path="patrimonio" element={<PatrimonioPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="planos" element={<PlanosPage />} />
            <Route path="importacao" element={<ImportacaoPage />} />
            <Route path="sobre" element={<SobrePage />} />
            <Route path="termos" element={<TermosPage />} />
            <Route path="privacidade" element={<PrivacidadePage />} />
            <Route path="contato" element={<ContatoPage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
