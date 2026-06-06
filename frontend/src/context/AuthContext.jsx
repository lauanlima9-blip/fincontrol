import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fincontrol_token')
    const userStr = localStorage.getItem('fincontrol_usuario')
    if (token && userStr) {
      try { setUsuario(JSON.parse(userStr)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (email, senha) => {
    const { data } = await authService.login({ email, senha })
    localStorage.setItem('fincontrol_token', data.access_token)
    localStorage.setItem('fincontrol_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }

  const cadastrar = async (nome, email, senha) => {
    const { data } = await authService.cadastrar({ nome, email, senha })
    localStorage.setItem('fincontrol_token', data.access_token)
    localStorage.setItem('fincontrol_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('fincontrol_token')
    localStorage.removeItem('fincontrol_usuario')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, cadastrar, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
