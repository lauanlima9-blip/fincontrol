import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle, Home } from 'lucide-react'
import logo from '../assets/pinnacle_logo.png'
import './AuthPages.css'

const validarSenha = (senha) => {
  const letras = (senha.match(/[A-Za-zÀ-ÿ]/g) || []).length
  const numeros = (senha.match(/[0-9]/g) || []).length
  const especiais = (senha.match(/[^A-Za-z0-9À-ÿ]/g) || []).length
  return { tamanho: senha.length >= 8, letras: letras >= 2, numero: numeros >= 1, especial: especiais >= 1, ok: senha.length >= 8 && letras >= 2 && numeros >= 1 && especiais >= 1 }
}

export default function CadastroPage() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [captcha, setCaptcha] = useState(false)
  const regras = validarSenha(form.senha)
  const confirmOk = form.senha && form.senha === form.confirmar

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro('')
    if (!captcha) { setErro('Confirme que você não é um robô.'); return }
    if (!regras.ok) { setErro('A senha deve ter no mínimo 8 caracteres, duas letras, um número e um caractere especial.'); return }
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem.'); return }
    setLoading(true)
    try { await cadastrar(form.nome, form.email, form.senha); navigate('/dashboard') }
    catch (err) { setErro(err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.') }
    finally { setLoading(false) }
  }

  return <div className="auth-page"><div className="auth-bg"><div className="auth-glow"/><div className="auth-grid"/></div><Link to="/" className="back-site-link"><Home size={16}/> Voltar para o site</Link><div className="auth-container fade-in"><div className="auth-brand"><img src={logo} alt="PinnacleBI" className="auth-logo"/></div><p className="auth-subtitle">Comece agora, é gratuito</p><form className="auth-form" onSubmit={handleSubmit}><h2>Criar conta</h2>{erro&&<div className="alert-error"><AlertCircle size={16}/><span>{erro}</span></div>}<div className="field"><label>Nome completo</label><input type="text" placeholder="João Silva" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} required/></div><div className="field"><label>E-mail</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required/></div><div className="field"><label>Senha {regras.ok&&<CheckCircle size={13} className="check-ok"/>}</label><div className="input-with-icon"><input type={showSenha?'text':'password'} placeholder="Ex: Pinnacle@2026" value={form.senha} onChange={e=>setForm(p=>({...p,senha:e.target.value}))} required/><button type="button" className="toggle-pass" onClick={()=>setShowSenha(p=>!p)}>{showSenha?<EyeOff size={16}/>:<Eye size={16}/>}</button></div><div className="password-rules"><span className={regras.tamanho?'ok':''}>8+ caracteres</span><span className={regras.letras?'ok':''}>2 letras</span><span className={regras.numero?'ok':''}>1 número</span><span className={regras.especial?'ok':''}>1 caractere especial</span></div><div className={`password-strength ${regras.ok?'strong':form.senha.length>=6?'medium':'weak'}`}>Senha: {regras.ok?'Forte':form.senha.length>=6?'Média':'Fraca'}</div></div><div className="field"><label>Confirmar senha {confirmOk&&<CheckCircle size={13} className="check-ok"/>}</label><input type="password" placeholder="••••••••" value={form.confirmar} onChange={e=>setForm(p=>({...p,confirmar:e.target.value}))} required/></div><label className="checkbox-line captcha-box"><input type="checkbox" checked={captcha} onChange={e=>setCaptcha(e.target.checked)}/> Não sou um robô</label><button type="submit" className="btn-primary" disabled={loading}>{loading?<span className="spinner-sm"/>:'Criar conta'}</button></form><p className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></p><p className="auth-terms">Ao criar sua conta, você concorda com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.</p></div></div>
}
