import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/api'
import { Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import './AuthPages.css'

const validarSenha = (senha) => {
  const letras = (senha.match(/[A-Za-zÀ-ÿ]/g) || []).length
  const numeros = (senha.match(/[0-9]/g) || []).length
  const especiais = (senha.match(/[^A-Za-z0-9À-ÿ]/g) || []).length
  return { tamanho: senha.length >= 8, letras: letras >= 2, numero: numeros >= 1, especial: especiais >= 1, ok: senha.length >= 8 && letras >= 2 && numeros >= 1 && especiais >= 1 }
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', senha: '', codigo_2fa: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [captcha, setCaptcha] = useState(false)
  const [precisa2FA, setPrecisa2FA] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [msg, setMsg] = useState('')
  const regras = validarSenha(novaSenha)

  useEffect(() => {
    const token = searchParams.get('reset_token')
    if (token) {
      setForgotOpen(true)
      setResetToken(token)
      setMsg('Link de recuperação identificado. Crie uma nova senha forte para concluir.')
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setMsg('')
    if (!captcha) { setErro('Confirme que você não é um robô.'); return }
    setLoading(true)
    try {
      const res = await login(form.email, form.senha, form.codigo_2fa)
      if (res?.requires_2fa) {
        setPrecisa2FA(true)
        setMsg('Enviamos um código de verificação para seu e-mail cadastrado.')
        return
      }
      navigate('/dashboard')
    } catch (err) { setErro(err.response?.data?.detail || 'Erro ao fazer login. Verifique suas credenciais.') }
    finally { setLoading(false) }
  }

  async function solicitarReset(){
    setErro(''); setMsg('')
    try {
      const email = forgotEmail || form.email
      if (!email) { setErro('Informe o e-mail cadastrado.'); return }
      const r = await authService.esqueciSenha({ email })
      setMsg(r.data.mensagem || 'Se este e-mail estiver cadastrado, enviaremos instruções de recuperação.')
      setResetToken('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch { setErro('Não foi possível solicitar a recuperação.') }
  }

  async function redefinir(){
    setErro(''); setMsg('')
    if (!resetToken) { setErro('Abra o link recebido por e-mail ou informe o token de recuperação.'); return }
    if (!regras.ok) { setErro('A nova senha deve ter no mínimo 8 caracteres, duas letras, um número e um caractere especial.'); return }
    if (novaSenha !== confirmarSenha) { setErro('As senhas não coincidem.'); return }
    try {
      await authService.redefinirSenha({ token: resetToken, nova_senha: novaSenha })
      setMsg('Senha redefinida com sucesso. Faça login com a nova senha.')
      setForgotOpen(false); setResetToken(''); setNovaSenha(''); setConfirmarSenha('')
    } catch (err) { setErro(err.response?.data?.detail || 'Não foi possível redefinir a senha.') }
  }

  return <div className="auth-page"><div className="auth-bg"><div className="auth-glow"/><div className="auth-grid"/></div><div className="auth-container fade-in"><div className="auth-brand"><img src={logo} alt="PinnacleBI" className="auth-logo"/></div><p className="auth-subtitle">Controle financeiro inteligente</p><form className="auth-form" onSubmit={handleSubmit}><h2>Entrar na conta</h2>{erro&&<div className="alert-error"><AlertCircle size={16}/><span>{erro}</span></div>}{msg&&<div className="alert-success"><ShieldCheck size={16}/><span>{msg}</span></div>}<div className="field"><label>E-mail</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required autoComplete="email"/></div><div className="field"><label>Senha</label><div className="input-with-icon"><input type={showSenha?'text':'password'} placeholder="••••••••" value={form.senha} onChange={e=>setForm(p=>({...p,senha:e.target.value}))} required autoComplete="current-password"/><button type="button" className="toggle-pass" onClick={()=>setShowSenha(p=>!p)}>{showSenha?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>{precisa2FA&&<div className="field"><label>Código de autenticação de dois fatores</label><input type="text" maxLength="6" placeholder="000000" value={form.codigo_2fa} onChange={e=>setForm(p=>({...p,codigo_2fa:e.target.value.replace(/\D/g,'')}))}/><small className="muted">O código foi enviado para o e-mail cadastrado e expira em 10 minutos.</small></div>}<label className="checkbox-line captcha-box"><input type="checkbox" checked={captcha} onChange={e=>setCaptcha(e.target.checked)}/> Não sou um robô</label><small className="muted">Para produção, configure Cloudflare Turnstile ou Google reCAPTCHA no backend.</small><button type="submit" className="btn-primary" disabled={loading}>{loading?<span className="spinner-sm"/>:precisa2FA?'Validar código':'Entrar'}</button><button type="button" className="link-button" onClick={()=>setForgotOpen(p=>!p)}>Esqueci minha senha</button></form>{forgotOpen&&<div className="auth-form mini-form"><h3>Recuperar senha</h3><p className="muted">Informe seu e-mail. Se ele estiver cadastrado, enviaremos um link seguro de recuperação. O token não é exibido na tela.</p><div className="field"><label>E-mail cadastrado</label><input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="seu@email.com"/></div><button className="btn-primary" type="button" onClick={solicitarReset}>Enviar instruções por e-mail</button>{resetToken ? <div className="alert-success"><ShieldCheck size={16}/><span>Token seguro carregado. Ele não será exibido na tela.</span></div> : <div className="field"><label>Token recebido por e-mail</label><input value={resetToken} onChange={e=>setResetToken(e.target.value)} placeholder="Cole aqui somente se o link não preencher automaticamente"/></div>}<div className="field"><label>Nova senha forte</label><input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="Ex: Pinnacle@2026"/></div><div className="password-rules"><span className={regras.tamanho?'ok':''}>8+ caracteres</span><span className={regras.letras?'ok':''}>2 letras</span><span className={regras.numero?'ok':''}>1 número</span><span className={regras.especial?'ok':''}>1 caractere especial</span></div><div className="field"><label>Confirmar nova senha</label><input type="password" value={confirmarSenha} onChange={e=>setConfirmarSenha(e.target.value)} placeholder="Repita a nova senha"/></div><button className="btn-primary" type="button" onClick={redefinir}>Redefinir senha</button></div>}<p className="auth-link">Não tem conta? <Link to="/cadastro">Criar conta grátis</Link></p><p className="auth-terms">Ao continuar, você concorda com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.</p></div></div>
}
