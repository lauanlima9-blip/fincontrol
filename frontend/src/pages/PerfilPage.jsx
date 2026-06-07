import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import './MovimentacoesPage.css'

export default function PerfilPage() {
  const { usuario, atualizarPerfil } = useAuth()
  const [form, setForm] = useState({ nome: usuario?.nome || '', senha_atual: '', nova_senha: '' })
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async (e) => { e.preventDefault(); setSaving(true); setMsg(''); setErro(''); try { const payload = { nome: form.nome }; if (form.nova_senha) { payload.senha_atual = form.senha_atual; payload.nova_senha = form.nova_senha } await atualizarPerfil(payload); setMsg('Perfil atualizado com sucesso!'); setForm(p=>({...p,senha_atual:'',nova_senha:''})) } catch(err) { setErro(err.response?.data?.detail || 'Erro ao atualizar perfil') } finally { setSaving(false) } }
  return <div className="movs-page fade-in"><div className="page-header"><div><h1>Editar perfil</h1><p className="page-desc">Atualize seu nome e altere sua senha com segurança.</p></div></div>
    <div className="chart-card" style={{maxWidth:620}}>
      {(msg || erro) && <div className={`summary-item ${erro ? 'red':'green'}`}>{erro ? <AlertCircle size={15}/> : <CheckCircle size={15}/>} {erro || msg}</div>}
      <form onSubmit={save} className="modal-form">
        <div className="field"><label><User size={14}/> Nome</label><input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} required /></div>
        <div className="field"><label><Lock size={14}/> Senha atual</label><input type="password" value={form.senha_atual} onChange={e=>setForm(p=>({...p,senha_atual:e.target.value}))} placeholder="Obrigatória apenas para trocar senha" /></div>
        <div className="field"><label>Nova senha</label><input type="password" minLength="6" value={form.nova_senha} onChange={e=>setForm(p=>({...p,nova_senha:e.target.value}))} placeholder="Mínimo 6 caracteres" /></div>
        <div className="modal-actions"><button className="btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</button></div>
      </form>
    </div>
  </div>
}
