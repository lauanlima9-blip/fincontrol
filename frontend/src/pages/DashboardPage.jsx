import { useState, useEffect } from 'react'
import { dashboardService, metasService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, Wallet, Activity, ArrowUpRight, ArrowDownRight, Target, Pencil, X, Plus } from 'lucide-react'
import './DashboardPage.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const COLORS = ['#00e5a0','#4d9fff','#ffd166','#b57bee','#ff6b9d','#ff9f40','#36a2eb','#ff6384']
const MESES = [
  { value: '', label: 'Todos os meses' },
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
]

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [metas, setMetas] = useState([])
  const [showMetaModal, setShowMetaModal] = useState(false)
  const [editingMeta, setEditingMeta] = useState(null)
  const [metaForm, setMetaForm] = useState({ descricao: '', valor_meta: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear() })

  useEffect(() => { loadDashboard(); loadMetas() }, [ano, mes])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const params = { ano }
      if (mes) params.mes = mes
      const res = await dashboardService.resumo(params)
      setData(res.data)
    } catch {} finally { setLoading(false) }
  }

  const loadMetas = async () => {
    try {
      const params = { ano }
      if (mes) params.mes = mes
      const res = await metasService.listar(params)
      setMetas(res.data)
    } catch {}
  }

  const handleSaveMeta = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...metaForm, valor_meta: parseFloat(metaForm.valor_meta), mes: +metaForm.mes, ano: +metaForm.ano }
      if (editingMeta) await metasService.atualizar(editingMeta.id, payload)
      else await metasService.criar(payload)
      setShowMetaModal(false)
      setEditingMeta(null)
      loadMetas()
    } catch {}
  }

  const handleDeleteMeta = async (id) => {
    await metasService.excluir(id)
    loadMetas()
  }

  const openEditMeta = (meta) => {
    setEditingMeta(meta)
    setMetaForm({ descricao: meta.descricao, valor_meta: String(meta.valor_meta), mes: meta.mes, ano: meta.ano })
    setShowMetaModal(true)
  }

  const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  const categories = Object.entries(data?.por_categoria || {}).sort((a,b) => b[1]-a[1])
  const saldo = data?.saldo ?? 0
  const totalDespesas = data?.total_despesas ?? 0

  const barData = {
    labels: (data?.mensal || []).map(m => {
      const [y, mo] = m.mes.split('-')
      return format(new Date(+y, +mo-1, 1), 'MMM/yy', { locale: ptBR })
    }),
    datasets: [
      { label: 'Receitas', data: (data?.mensal||[]).map(m=>m.receitas), backgroundColor: 'rgba(0,229,160,0.7)', borderRadius: 6, borderSkipped: false },
      { label: 'Despesas', data: (data?.mensal||[]).map(m=>m.despesas), backgroundColor: 'rgba(255,77,109,0.7)', borderRadius: 6, borderSkipped: false },
    ]
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8892aa', font: { family: 'DM Sans', size: 12 } } },
      tooltip: { backgroundColor: '#161b2e', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#8892aa',
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${(+ctx.parsed.y).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` }
      }
    },
    scales: {
      x: { ticks: { color: '#4a5270' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { ticks: { color: '#4a5270', callback: v => 'R$ '+v.toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.03)' } }
    }
  }

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-desc">Olá, {usuario?.nome?.split(' ')[0]}! Aqui está seu resumo financeiro.</p>
        </div>
        <div className="filters-header">
          <select className="year-select" value={mes} onChange={e => setMes(e.target.value ? +e.target.value : '')}>
            {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="year-select" value={ano} onChange={e => setAno(+e.target.value)}>
            {[2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-green">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-content"><span className="kpi-label">Total de Receitas</span><span className="kpi-value">{fmt(data?.total_receitas)}</span></div>
          <ArrowUpRight size={16} className="kpi-arrow up" />
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-icon"><TrendingDown size={20} /></div>
          <div className="kpi-content"><span className="kpi-label">Total de Despesas</span><span className="kpi-value">{fmt(data?.total_despesas)}</span></div>
          <ArrowDownRight size={16} className="kpi-arrow down" />
        </div>
        <div className={`kpi-card ${saldo >= 0 ? 'kpi-blue' : 'kpi-red'}`}>
          <div className="kpi-icon"><Wallet size={20} /></div>
          <div className="kpi-content"><span className="kpi-label">Saldo Atual</span><span className="kpi-value">{fmt(saldo)}</span></div>
        </div>
        <div className="kpi-card kpi-purple">
          <div className="kpi-icon"><Activity size={20} /></div>
          <div className="kpi-content"><span className="kpi-label">Movimentações</span><span className="kpi-value">{data?.quantidade_movimentacoes ?? 0}</span></div>
        </div>
      </div>

      {/* Metas */}
      <div className="metas-section">
        <div className="metas-header">
          <div className="metas-title"><Target size={18} /><h3>Metas do Período</h3></div>
          <button className="btn-add-meta" onClick={() => { setEditingMeta(null); setMetaForm({ descricao:'', valor_meta:'', mes: mes||new Date().getMonth()+1, ano }); setShowMetaModal(true) }}>
            <Plus size={14} /> Nova Meta
          </button>
        </div>
        {metas.length === 0 ? (
          <p className="no-metas">Nenhuma meta definida para este período.</p>
        ) : (
          <div className="metas-grid">
            {metas.map(meta => {
              const pct = Math.min((totalDespesas / meta.valor_meta) * 100, 100)
              const ok = totalDespesas <= meta.valor_meta
              return (
                <div key={meta.id} className="meta-card">
                  <div className="meta-top">
                    <span className="meta-desc">{meta.descricao}</span>
                    <div className="meta-actions">
                      <button onClick={() => openEditMeta(meta)}><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteMeta(meta.id)}><X size={13} /></button>
                    </div>
                  </div>
                  <div className="meta-values">
                    <span className={ok ? 'val-ok' : 'val-over'}>{fmt(totalDespesas)}</span>
                    <span className="val-sep">de</span>
                    <span className="val-meta">{fmt(meta.valor_meta)}</span>
                  </div>
                  <div className="meta-bar-wrap">
                    <div className={`meta-bar-fill ${ok ? 'bar-ok' : 'bar-over'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`meta-pct ${ok ? 'pct-ok' : 'pct-over'}`}>
                    {ok ? `✅ ${pct.toFixed(0)}% utilizado` : `⚠️ Meta ultrapassada! ${pct.toFixed(0)}%`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Evolução Mensal</h3>
          <div className="chart-wrapper bar-chart"><Bar data={barData} options={chartOptions} /></div>
        </div>
        <div className="chart-card">
          <h3>Despesas por Categoria</h3>
          {categories.length === 0 ? (
            <div className="empty-chart">Sem despesas registradas</div>
          ) : (
            <>
              <div className="chart-wrapper pie-chart">
                <Doughnut data={{ labels: categories.map(([k])=>k), datasets:[{ data: categories.map(([,v])=>v), backgroundColor: COLORS, borderColor:'transparent', hoverOffset:8 }] }}
                  options={{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#161b2e', borderColor:'rgba(255,255,255,0.06)', borderWidth:1, titleColor:'#e8eaf0', bodyColor:'#8892aa', callbacks:{label: ctx=>` ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`} } } }}
                />
              </div>
              <div className="pie-legend">
                {categories.slice(0,6).map(([cat,val],i) => (
                  <div key={cat} className="legend-item">
                    <span className="legend-dot" style={{background:COLORS[i%COLORS.length]}} />
                    <span className="legend-label">{cat}</span>
                    <span className="legend-value">{fmt(val)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Modal */}
      {showMetaModal && (
        <div className="modal-overlay" onClick={() => setShowMetaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMeta ? 'Editar Meta' : 'Nova Meta'}</h3>
              <button className="btn-icon" onClick={() => setShowMetaModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveMeta} className="modal-form">
              <div className="field">
                <label>Descrição</label>
                <input type="text" placeholder="Ex: Limite de gastos do mês" value={metaForm.descricao}
                  onChange={e => setMetaForm(p=>({...p,descricao:e.target.value}))} required />
              </div>
              <div className="field">
                <label>Valor limite (R$)</label>
                <input type="number" step="0.01" min="0.01" placeholder="0,00" value={metaForm.valor_meta}
                  onChange={e => setMetaForm(p=>({...p,valor_meta:e.target.value}))} required />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Mês</label>
                  <select value={metaForm.mes} onChange={e => setMetaForm(p=>({...p,mes:+e.target.value}))}>
                    {MESES.filter(m=>m.value).map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Ano</label>
                  <select value={metaForm.ano} onChange={e => setMetaForm(p=>({...p,ano:+e.target.value}))}>
                    {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowMetaModal(false)}>Cancelar</button>
                <button type="submit" className="btn-save">{editingMeta ? 'Salvar' : 'Criar Meta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
