import { useEffect, useMemo, useState } from 'react'
import { adminService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { BarChart3, Users, Crown, Activity, ScrollText, Settings, Shield, Database, LogIn, Undo2, Search, Save, Trash2 } from 'lucide-react'
import './AdminPage.css'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dt = (v) => v ? new Date(v).toLocaleString('pt-BR') : '-'
const tabs = [
  ['dashboard', BarChart3, 'Dashboard Admin'], ['usuarios', Users, 'Usuários'], ['assinaturas', Crown, 'Assinaturas'],
  ['analytics', Activity, 'Analytics'], ['logs', ScrollText, 'Logs'], ['config', Settings, 'Configurações'],
  ['seguranca', Shield, 'Segurança'], ['backup', Database, 'Backup']
]

const msgErro = (err, fallback='Não foi possível concluir a ação.') => err?.response?.data?.detail || err?.response?.data?.mensagem || fallback

export default function AdminPage() {
  const { usuario, setUsuario } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [dash, setDash] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [planos, setPlanos] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [logs, setLogs] = useState([])
  const [config, setConfig] = useState({})
  const [seg, setSeg] = useState({ historico_login: [], ips_bloqueados: [] })
  const [busca, setBusca] = useState('')
  const [planoForm, setPlanoForm] = useState({ nome: '', valor: '', beneficios: '', status: 'Ativo' })
  const [restaurar, setRestaurar] = useState('')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [erroAdmin, setErroAdmin] = useState('')
  const [savingAction, setSavingAction] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)
  const [emailTeste, setEmailTeste] = useState('')

  const isImpersonating = !!localStorage.getItem('fincontrol_admin_token')
  const adminOriginal = useMemo(() => JSON.parse(localStorage.getItem('fincontrol_admin_usuario') || 'null'), [usuario])

  useEffect(() => { carregarTudo() }, [])
  async function carregarTudo() {
    setLoading(true); setErroAdmin('')
    try {
      const calls = await Promise.allSettled([
        adminService.dashboard(), adminService.usuarios(), adminService.planos(), adminService.analytics(), adminService.logs(), adminService.configuracoes(), adminService.seguranca(), adminService.emailStatus()
      ])
      const [d,u,p,a,l,c,s,email] = calls
      if (d.status === 'fulfilled') setDash(d.value.data)
      if (u.status === 'fulfilled') setUsuarios(u.value.data)
      if (p.status === 'fulfilled') setPlanos(p.value.data)
      if (a.status === 'fulfilled') setAnalytics(a.value.data)
      if (l.status === 'fulfilled') setLogs(l.value.data)
      if (c.status === 'fulfilled') setConfig(c.value.data)
      if (s.status === 'fulfilled') setSeg(s.value.data)
      if (email.status === 'fulfilled') setEmailStatus(email.value.data)
      const falha = calls.find(x => x.status === 'rejected')
      if (falha) setErroAdmin(msgErro(falha.reason, 'Alguns dados do admin não carregaram. Verifique o backend.'))
    } finally { setLoading(false) }
  }

  async function executarAcao(chave, fn, sucesso='Ação realizada com sucesso.') {
    setSavingAction(chave); setErroAdmin(''); setFeedback('')
    try { await fn(); setFeedback(sucesso); await carregarTudo() }
    catch (err) { setErroAdmin(msgErro(err)) }
    finally { setSavingAction('') }
  }
  async function acaoUsuario(id, acao, extra={}) { await executarAcao(`${id}-${acao}`, () => adminService.acaoUsuario(id, { acao, ...extra })) }
  async function editarPlano(id, patch) { await executarAcao(`plano-${id}`, () => adminService.editarPlano(id, patch), 'Plano atualizado.') }
  async function criarPlano(e) { e.preventDefault(); await executarAcao('criar-plano', () => adminService.criarPlano({ ...planoForm, valor: Number(planoForm.valor || 0) }), 'Plano criado.'); setPlanoForm({ nome:'', valor:'', beneficios:'', status:'Ativo' }) }
  async function salvarConfig() { await executarAcao('config', () => adminService.salvarConfiguracoes(config), 'Configurações salvas.') }
  async function testarEmail() { await executarAcao('email-teste', () => adminService.emailTeste({ email: emailTeste || usuario?.email }), 'E-mail de teste enviado.') }
  async function impersonar(id) {
    setSavingAction(`impersonar-${id}`); setErroAdmin(''); setFeedback('')
    try {
    const { data } = await adminService.impersonar(id)
    localStorage.setItem('fincontrol_admin_token', localStorage.getItem('fincontrol_token'))
    localStorage.setItem('fincontrol_admin_usuario', JSON.stringify(usuario))
    localStorage.setItem('fincontrol_token', data.access_token)
    localStorage.setItem('fincontrol_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    window.location.href = '/dashboard'
    } catch (err) { setErroAdmin(msgErro(err, 'Não foi possível entrar como usuário.')) }
    finally { setSavingAction('') }
  }
  function voltarAdmin() {
    const token = localStorage.getItem('fincontrol_admin_token')
    const admin = JSON.parse(localStorage.getItem('fincontrol_admin_usuario') || 'null')
    if (token && admin) {
      localStorage.setItem('fincontrol_token', token); localStorage.setItem('fincontrol_usuario', JSON.stringify(admin))
      localStorage.removeItem('fincontrol_admin_token'); localStorage.removeItem('fincontrol_admin_usuario')
      setUsuario(admin); window.location.href = '/admin'
    }
  }
  async function baixar(tipo) {
    setErroAdmin(''); setFeedback('')
    try {
    const res = await adminService.backup(tipo)
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `pinnacle-${tipo}.json`; a.click(); URL.revokeObjectURL(url)
    } catch (err) { setErroAdmin(msgErro(err, 'Não foi possível exportar backup.')) }
  }
  async function restaurarBackup() { try { await adminService.restaurarBackup(JSON.parse(restaurar)); setFeedback('Backup enviado para validação.') } catch (err) { setErroAdmin(err?.response ? msgErro(err) : 'JSON inválido') } }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (usuario?.role !== 'admin' && !isImpersonating) return <div className="admin-denied"><h1>403 - Acesso Negado</h1><p>Somente administradores podem acessar esta área.</p></div>
  const filtrados = usuarios.filter(u => `${u.nome} ${u.email} ${u.plano} ${u.status}`.toLowerCase().includes(busca.toLowerCase()))
  const k = dash?.indicadores || {}

  return <div className="admin-page fade-in">
    {erroAdmin && <div className="alert-error"><span>{erroAdmin}</span></div>}
    {feedback && <div className="alert-success"><span>{feedback}</span></div>}
    {isImpersonating && <div className="impersonate-banner"><LogIn size={16}/> Você está navegando como: <strong>{usuario?.nome}</strong><button onClick={voltarAdmin}><Undo2 size={14}/> Voltar para Admin</button></div>}
    <div className="page-header"><div><h1>🛠 Administração</h1><p className="page-desc">Painel administrativo profissional do Pinnacle Finance.</p></div></div>
    <div className="admin-tabs">{tabs.map(([id, Icon, label]) => <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>

    {tab==='dashboard' && <>
      <div className="admin-kpis">{[
        ['Total de usuários', k.total_usuarios], ['Usuários ativos', k.usuarios_ativos], ['Gratuitos', k.usuarios_gratuitos], ['Premium', k.usuarios_premium],
        ['Receita mensal', fmt(k.receita_mensal_estimada)], ['Receita anual', fmt(k.receita_anual_estimada)], ['Movimentações', k.total_movimentacoes], ['Cartões', k.total_cartoes], ['Metas', k.total_metas], ['Parcelamentos ativos', k.total_parcelamentos_ativos], ['Novos 30 dias', k.novos_usuarios_30_dias]
      ].map(([label,value]) => <div className="admin-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="admin-grid-2"><ChartList title="Usuários por mês" data={dash?.usuarios_por_mes || []} valueKey="total" /><ChartList title="Receita por mês" data={dash?.receita_por_mes || []} valueKey="valor" money /></div>
      <div className="admin-panel"><h3>Últimos acessos</h3><table><tbody>{(dash?.ultimos_acessos || []).map(u=><tr key={u.id}><td>{u.nome}</td><td>{u.email}</td><td>{dt(u.ultimo_acesso)}</td><td>{u.ip || '-'}</td></tr>)}</tbody></table></div>
    </>}

    {tab==='usuarios' && <div className="admin-panel"><div className="admin-toolbar"><div className="search-box"><Search size={16}/><input placeholder="Pesquisar usuário, e-mail, plano..." value={busca} onChange={e=>setBusca(e.target.value)} /></div></div><div className="admin-table-wrap"><table><thead><tr><th>Nome</th><th>Email</th><th>Plano</th><th>Role</th><th>Cadastro</th><th>Último acesso</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtrados.map(u=><tr key={u.id}><td>{u.nome}</td><td>{u.email}</td><td>{u.plano}</td><td><strong>{u.role}</strong></td><td>{dt(u.data_cadastro)}</td><td>{dt(u.ultimo_acesso)}</td><td><span className={`badge ${u.status==='Bloqueado'?'danger':'ok'}`}>{u.status}</span></td><td className="admin-actions">{u.is_super_admin ? <span className="badge ok">Super Admin protegido</span> : <><button disabled={!!savingAction} onClick={()=>acaoUsuario(u.id,'alterar_plano',{plano:u.plano==='Premium'?'Gratuito':'Premium'})}>Alterar plano</button><button disabled={!!savingAction} onClick={()=>acaoUsuario(u.id,u.role==='admin'?'remover_admin':'promover_admin')}>{u.role==='admin'?'Remover admin':'Promover'}</button><button disabled={!!savingAction} onClick={()=>acaoUsuario(u.id,u.status==='Bloqueado'?'desbloquear':'bloquear')}>{u.status==='Bloqueado'?'Desbloquear':'Bloquear'}</button><button disabled={!!savingAction} onClick={()=>impersonar(u.id)}>Entrar como</button><button className="danger" disabled={savingAction===`excluir-${u.id}`} onClick={()=>{if(confirm('Excluir usuário?')) executarAcao(`excluir-${u.id}`, () => adminService.excluirUsuario(u.id), 'Usuário excluído.')}}><Trash2 size={13}/></button></>}</td></tr>)}</tbody></table></div></div>}

    {tab==='assinaturas' && <div className="admin-grid-2"><div className="admin-panel"><h3>Planos</h3>{planos.map(p=><div className="plan-admin" key={p.id}><input value={p.nome} onChange={e=>setPlanos(planos.map(x=>x.id===p.id?{...x,nome:e.target.value}:x))}/><input type="number" value={p.valor} onChange={e=>setPlanos(planos.map(x=>x.id===p.id?{...x,valor:e.target.value}:x))}/><textarea value={p.beneficios||''} onChange={e=>setPlanos(planos.map(x=>x.id===p.id?{...x,beneficios:e.target.value}:x))}/><select value={p.status} onChange={e=>editarPlano(p.id,{...p,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select><button onClick={()=>editarPlano(p.id,p)}><Save size={14}/> Salvar</button></div>)}</div><form className="admin-panel" onSubmit={criarPlano}><h3>Criar plano</h3><input placeholder="Nome" value={planoForm.nome} onChange={e=>setPlanoForm({...planoForm,nome:e.target.value})}/><input placeholder="Valor" type="number" value={planoForm.valor} onChange={e=>setPlanoForm({...planoForm,valor:e.target.value})}/><textarea placeholder="Benefícios" value={planoForm.beneficios} onChange={e=>setPlanoForm({...planoForm,beneficios:e.target.value})}/><button className="btn-admin-primary">Criar plano</button></form></div>}

    {tab==='analytics' && <div className="admin-kpis">{Object.entries(analytics || {}).map(([key,value]) => <div className="admin-card wide" key={key}><span>{key.replaceAll('_',' ')}</span><strong>{Array.isArray(value) ? value.join(', ') : value}</strong></div>)}</div>}

    {tab==='logs' && <div className="admin-panel"><div className="admin-toolbar"><div className="search-box"><Search size={16}/><input placeholder="Pesquisar nos logs" value={busca} onChange={e=>setBusca(e.target.value)} /></div><button onClick={()=>executarAcao('logs', async()=>{const r=await adminService.logs({q:busca});setLogs(r.data)}, 'Logs atualizados.')}>Pesquisar</button></div><table><thead><tr><th>Data</th><th>User ID</th><th>Ação</th><th>Descrição</th><th>IP</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td>{dt(l.created_at)}</td><td>{l.user_id}</td><td>{l.acao}</td><td>{l.descricao}</td><td>{l.ip}</td></tr>)}</tbody></table></div>}

    {tab==='config' && <div className="admin-panel config-grid"><h3>Configurações do Sistema</h3>{Object.entries(config).map(([key,value])=><label key={key}>{key.replaceAll('_',' ')}<input value={value || ''} onChange={e=>setConfig({...config,[key]:e.target.value})}/></label>)}<button className="btn-admin-primary" onClick={salvarConfig}>Salvar configurações</button></div>}

    {tab==='seguranca' && <div className="admin-grid-2"><div className="admin-panel"><h3>Histórico de login</h3><table><tbody>{seg.historico_login.map(h=><tr key={h.id}><td>{dt(h.created_at)}</td><td>{h.ip}</td><td>{h.ativo?'Ativa':'Encerrada'}</td><td><button disabled={savingAction===`sessao-${h.id}`} onClick={()=>executarAcao(`sessao-${h.id}`, () => adminService.encerrarSessao(h.id), 'Sessão encerrada no histórico.')}>Encerrar</button></td></tr>)}</tbody></table></div><div className="admin-panel"><h3>Bloquear IP suspeito</h3><input placeholder="IP" id="ipblock"/><button disabled={savingAction==='bloquear-ip'} onClick={()=>executarAcao('bloquear-ip', () => adminService.bloquearIp({ip:document.getElementById('ipblock').value}), 'IP bloqueado.')}>Bloquear IP</button><h4>IPs bloqueados</h4>{seg.ips_bloqueados.map(ip=><p key={ip.id}>{ip.ip} — {ip.motivo}</p>)}</div><div className="admin-panel"><h3>Status do e-mail</h3><p><strong>SMTP:</strong> {emailStatus?.configurado ? 'Configurado' : 'Não configurado'}</p><p><strong>Host:</strong> {emailStatus?.smtp_host || '-'}</p><p><strong>APP_URL:</strong> {emailStatus?.app_url || '-'}</p>{emailStatus?.observacao && <p className="muted">{emailStatus.observacao}</p>}<input placeholder="Enviar teste para este e-mail" value={emailTeste} onChange={e=>setEmailTeste(e.target.value)} /><button disabled={savingAction==='email-teste'} onClick={testarEmail}>Enviar e-mail de teste</button></div></div>}

    {tab==='backup' && <div className="admin-grid-2"><div className="admin-panel"><h3>Exportar backup</h3>{['banco','usuarios','movimentacoes','metas','cartoes','parcelamentos'].map(t=><button className="backup-btn" key={t} onClick={()=>baixar(t)}>Exportar {t}</button>)}</div><div className="admin-panel"><h3>Restaurar backup</h3><textarea rows="10" placeholder="Cole o JSON do backup aqui" value={restaurar} onChange={e=>setRestaurar(e.target.value)} /><button className="btn-admin-primary" onClick={restaurarBackup}>Restaurar backup</button></div></div>}
  </div>
}

function ChartList({ title, data=[], valueKey, money=false }) {
  const max = Math.max(...data.map(d=>Number(d[valueKey]||0)), 1)
  return <div className="admin-panel"><h3>{title}</h3><div className="mini-chart">{data.map((d,i)=><div className="mini-row" key={i}><span>{d.mes}</span><div><i style={{width:`${(Number(d[valueKey]||0)/max)*100}%`}} /></div><strong>{money?fmt(d[valueKey]):d[valueKey]}</strong></div>)}</div></div>
}
