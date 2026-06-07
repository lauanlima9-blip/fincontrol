import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/api'
import { Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import './AuthPages.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', senha: '', codigo_2fa: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [captcha, setCaptcha] = useState(false)
  const [precisa2FA, setPrecisa2FA] = useState(false)
  const [codigoDev, setCodigoDev] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setMsg('')
    if (!captcha) { setErro('Confirme que você não é um robô.'); return }
    setLoading(true)
    try {
      const res = await login(form.email, form.senha, form.codigo_2fa)
      if (res?.requires_2fa) {
        setPrecisa2FA(true)
        setCodigoDev(res.codigo_dev || '')
        setMsg('Enviamos um código de verificação para seu e-mail cadastrado.')
        return
      }
      navigate('/dashboard')
    } catch (err) { setErro(err.response?.data?.detail || 'Erro ao fazer login. Verifique suas credenciais.') }
    finally { setLoading(false) }
  }

  async function solicitarReset(){
    setErro(''); setMsg('')
    try { const r = await authService.esqueciSenha({ email: forgotEmail || form.email }); setResetToken(r.data.token_dev || ''); setMsg(r.data.mensagem || 'Verifique seu e-mail.') }
    catch { setErro('Não foi possível solicitar a recuperação.') }
  }
  async function redefinir(){
    setErro(''); setMsg('')
    try { await authService.redefinirSenha({ token: resetToken, nova_senha: novaSenha }); setMsg('Senha redefinida com sucesso. Faça login com a nova senha.'); setForgotOpen(false); setResetToken(''); setNovaSenha('') }
    catch (err) { setErro(err.response?.data?.detail || 'Não foi possível redefinir a senha.') }
  }

  return <div className="auth-page"><div className="auth-bg"><div className="auth-glow"/><div className="auth-grid"/></div><div className="auth-container fade-in"><div className="auth-brand"><img src={logo} alt="PinnacleBI" className="auth-logo"/></div><p className="auth-subtitle">Controle financeiro inteligente</p><form className="auth-form" onSubmit={handleSubmit}><h2>Entrar na conta</h2>{erro&&<div className="alert-error"><AlertCircle size={16}/><span>{erro}</span></div>}{msg&&<div className="alert-success"><ShieldCheck size={16}/><span>{msg}{codigoDev ? ` Código teste: ${codigoDev}` : ''}</span></div>}<div className="field"><label>E-mail</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required autoComplete="email"/></div><div className="field"><label>Senha</label><div className="input-with-icon"><input type={showSenha?'text':'password'} placeholder="••••••••" value={form.senha} onChange={e=>setForm(p=>({...p,senha:e.target.value}))} required autoComplete="current-password"/><button type="button" className="toggle-pass" onClick={()=>setShowSenha(p=>!p)}>{showSenha?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>{precisa2FA&&<div className="field"><label>Código de autenticação de dois fatores</label><input type="text" maxLength="6" placeholder="000000" value={form.codigo_2fa} onChange={e=>setForm(p=>({...p,codigo_2fa:e.target.value}))}/></div>}<label className="checkbox-line captcha-box"><input type="checkbox" checked={captcha} onChange={e=>setCaptcha(e.target.checked)}/> Não sou um robô</label><button type="submit" className="btn-primary" disabled={loading}>{loading?<span className="spinner-sm"/>:precisa2FA?'Validar código':'Entrar'}</button><button type="button" className="link-button" onClick={()=>setForgotOpen(p=>!p)}>Esqueci minha senha</button></form>{forgotOpen&&<div className="auth-form mini-form"><h3>Recuperar senha</h3><div className="field"><label>E-mail cadastrado</label><input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="seu@email.com"/></div><button className="btn-primary" type="button" onClick={solicitarReset}>Gerar token de recuperação</button>{resetToken&&<><div className="field"><label>Token de recuperação</label><input value={resetToken} onChange={e=>setResetToken(e.target.value)}/></div><div className="field"><label>Nova senha forte</label><input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Ex: Pinnacle@2026"/></div><small className="password-rules">Mínimo 8 caracteres, duas letras, um número e um caractere especial.</small><button className="btn-primary" type="button" onClick={redefinir}>Redefinir senha</button></>}</div>}<p className="auth-link">Não tem conta? <Link to="/cadastro">Criar conta grátis</Link></p><p className="auth-terms">Ao continuar, você concorda com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.</p></div></div>
}
