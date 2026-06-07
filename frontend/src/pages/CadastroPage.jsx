import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import './AuthPages.css'

export default function CadastroPage() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await cadastrar(form.nome, form.email, form.senha)
      navigate('/dashboard')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.')
    } finally { setLoading(false) }
  }

  const senhaOk = form.senha.length >= 6
  const confirmOk = form.senha && form.senha === form.confirmar

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container fade-in">
        <div className="auth-brand">
          <img src={logo} alt="PinnacleBI" className="auth-logo" />
        </div>
        <p className="auth-subtitle">Comece agora, é gratuito</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Criar conta</h2>

          {erro && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{erro}</span>
            </div>
          )}

          <div className="field">
            <label>Nome completo</label>
            <input type="text" placeholder="João Silva" value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required />
          </div>

          <div className="field">
            <label>E-mail</label>
            <input type="email" placeholder="seu@email.com" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>

          <div className="field">
            <label>Senha {senhaOk && <CheckCircle size={13} className="check-ok" />}</label>
            <div className="input-with-icon">
              <input type={showSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} required />
              <button type="button" className="toggle-pass" onClick={() => setShowSenha(p => !p)}>
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Confirmar senha {confirmOk && <CheckCircle size={13} className="check-ok" />}</label>
            <input type="password" placeholder="••••••••" value={form.confirmar}
              onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))} required />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : 'Criar conta'}
          </button>
        </form>

        <p className="auth-link">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
