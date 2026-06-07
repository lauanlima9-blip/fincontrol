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
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="movimentacoes" element={<MovimentacoesPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="cartoes" element={<CartoesPage />} />
            <Route path="parcelamentos" element={<ParcelamentosPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="importacao" element={<ImportacaoPage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
