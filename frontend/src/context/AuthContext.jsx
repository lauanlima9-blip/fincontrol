import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

const clearUserSessionData = () => {
  // Mantém preferências visuais, mas remove dados de sessão do usuário anterior.
  localStorage.removeItem('fincontrol_token')
  localStorage.removeItem('fincontrol_usuario')
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fincontrol_token')
    if (!token) { setLoading(false); return }
    authService.perfil()
      .then(({ data }) => { localStorage.setItem('fincontrol_usuario', JSON.stringify(data)); setUsuario(data) })
      .catch(() => clearUserSessionData())
      .finally(() => setLoading(false))
  }, [])

  const salvarSessao = (data) => {
    clearUserSessionData()
    localStorage.setItem('fincontrol_token', data.access_token)
    localStorage.setItem('fincontrol_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }

  const login = async (email, senha) => { const { data } = await authService.login({ email, senha }); return salvarSessao(data) }
  const cadastrar = async (nome, email, senha) => { const { data } = await authService.cadastrar({ nome, email, senha }); return salvarSessao(data) }
  const logout = () => { clearUserSessionData(); setUsuario(null) }

  return <AuthContext.Provider value={{ usuario, login, cadastrar, logout, loading, setUsuario }}>{children}</AuthContext.Provider>
}
