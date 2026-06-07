import { useEffect, useMemo, useState } from 'react'
import { planejamentoService } from '../services/api'
import { Plus, Trash2, Pencil, X, Target, TrendingUp, PiggyBank } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import './FeaturePages.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const periodos = [6, 12, 24, 36, 60]
const emptyMeta = { nome: '', valor_desejado: '', valor_atual: '', data_prevista: '' }
const fmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mesAno = (data) => {
  if (!data) return 'Sem data definida'
  const d = new Date(data)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function SimuladorPage() {
  const [valorMensal, setValorMensal] = useState(300)
  const [periodo, setPeriodo] = useState(12)
  const [serie, setSerie] = useState([])
  const [metas, setMetas] = useState([])
  const [showMeta, setShowMeta] = useState(false)
  const [editing, setEditing] = useState(null)
  const [metaForm, setMetaForm] = useState(emptyMeta)
  const [erro, setErro] = useState('')

  const economiaAcumulada = Number(valorMensal || 0) * Number(periodo || 0)
  const cincoAnos = Number(valorMensal || 0) * 60

  useEffect(() => {
    setSerie(Array.from({ length: Number(periodo) || 0 }, (_, i) => ({ mes: i + 1, valor: Number(valorMensal || 0) * (i + 1) })))
  }, [valorMensal, periodo])

  async function carregarMetas() {
    try {
      const r = await planejamentoService.metas()
      setMetas(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErro('Não foi possível carregar as metas financeiras. Verifique se o backend foi atualizado.')
    }
  }

  useEffect(() => { carregarMetas() }, [])

  async function salvarSimulacao() {
    try {
      const r = await planejamentoService.simular({ valor_mensal: Number(valorMensal), periodo_meses: Number(periodo) })
      if (Array.isArray(r.data?.serie)) setSerie(r.data.serie)
    } catch (e) {
      setErro('Não foi possível salvar a simulação agora, mas o cálculo continua funcionando na tela.')
    }
  }

  async function salvarMeta(e) {
    e.preventDefault()
    setErro('')
    const payload = {
      nome: metaForm.nome,
      valor_desejado: Number(metaForm.valor_desejado),
      valor_atual: Number(metaForm.valor_atual || 0),
      data_prevista: metaForm.data_prevista ? new Date(`${metaForm.data_prevista}T12:00:00`).toISOString() : null,
      status: 'Ativa'
    }
    try {
      if (editing) await planejamentoService.atualizarMeta(editing.id, payload)
      else await planejamentoService.criarMeta(payload)
      setShowMeta(false)
      setEditing(null)
      setMetaForm(emptyMeta)
      await carregarMetas()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Erro ao salvar meta financeira.')
    }
  }

  async function excluirMeta(id) {
    if (!confirm('Deseja excluir esta meta?')) return
    await planejamentoService.excluirMeta(id)
    await carregarMetas()
  }

  function editarMeta(meta) {
    setEditing(meta)
    setMetaForm({
      nome: meta.nome || '',
      valor_desejado: String(meta.valor_desejado || ''),
      valor_atual: String(meta.valor_atual || ''),
      data_prevista: meta.data_prevista ? String(meta.data_prevista).slice(0, 10) : ''
    })
    setShowMeta(true)
  }

  const chartData = useMemo(() => ({
    labels: serie.map(s => `Mês ${s.mes}`),
    datasets: [{
      label: 'Economia acumulada',
      data: serie.map(s => s.valor),
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 3
    }]
  }), [serie])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8892aa', font: { family: 'DM Sans' } } },
      tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y)}` } }
    },
    scales: {
      x: { ticks: { color: '#4a5270' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { ticks: { color: '#4a5270', callback: (v) => 'R$ ' + Number(v).toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.03)' } }
    }
  }

  return (
    <div className="feature-page simulator-page fade-in">
      <div className="page-header">
        <div>
          <h1>Simulador Financeiro</h1>
          <p className="page-desc">Planeje economias futuras, acompanhe metas e veja o progresso até seus objetivos.</p>
        </div>
        <button type="button" className="btn-add" onClick={() => { setEditing(null); setMetaForm(emptyMeta); setShowMeta(true) }}><Plus size={16}/> Nova Meta</button>
      </div>

      {erro && <div className="empty-state error-state">{erro}</div>}

      <div className="feature-grid two">
        <section className="feature-card simulator-card">
          <div className="section-title"><PiggyBank size={20}/><h3>Aba 1: Simulador de Economia</h3></div>
          <div className="panel-form simulator-form">
            <div className="field"><label>Valor mensal que deseja economizar</label><input type="number" min="0" step="0.01" value={valorMensal} onChange={(e)=>setValorMensal(e.target.value)} /></div>
            <div className="field"><label>Período (meses)</label><select value={periodo} onChange={(e)=>setPeriodo(Number(e.target.value))}>{periodos.map(p=><option key={p} value={p}>{p} meses</option>)}</select></div>
            <button type="button" className="btn-save" onClick={salvarSimulacao}>Simular</button>
          </div>

          <div className="result-card">
            <span>Economia acumulada</span>
            <strong>{fmt(economiaAcumulada)}</strong>
            <p>💡 Você poderá acumular <b>{fmt(cincoAnos)}</b> em 5 anos.</p>
          </div>

          <div className="chart-wrapper simulator-chart"><Line data={chartData} options={chartOptions} /></div>
        </section>

        <section className="feature-card goals-card">
          <div className="section-title"><Target size={20}/><h3>Aba 2: Metas Financeiras</h3></div>
          {metas.length === 0 ? <div className="empty-state"><h3>Nenhuma meta cadastrada</h3><p>Crie uma meta como “Viagem para Praia” para acompanhar o progresso.</p></div> : (
            <div className="goals-list">
              {metas.map(meta => {
                const pct = Math.min(Number(meta.progresso || 0), 100)
                return <div className="goal-item" key={meta.id}>
                  <div className="goal-head">
                    <div><h3>{meta.nome}</h3><p>Previsão: {mesAno(meta.data_prevista)}</p></div>
                    <div className="meta-actions"><button onClick={() => editarMeta(meta)}><Pencil size={14}/></button><button onClick={() => excluirMeta(meta.id)}><Trash2 size={14}/></button></div>
                  </div>
                  <div className="goal-values"><span>Meta: <b>{fmt(meta.valor_desejado)}</b></span><span>Atual: <b>{fmt(meta.valor_atual)}</b></span></div>
                  <div className="goal-percent">{pct.toFixed(0)}%</div>
                  <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                  <div className="goal-footer"><span>Faltam: <b>{fmt(meta.faltam)}</b></span></div>
                </div>
              })}
            </div>
          )}
        </section>
      </div>

      {showMeta && (
        <div className="modal-overlay" onClick={() => setShowMeta(false)}>
          <form className="modal modal-form" onSubmit={salvarMeta} onClick={(e)=>e.stopPropagation()}>
            <div className="page-header"><h3>{editing ? 'Editar Meta Financeira' : 'Nova Meta Financeira'}</h3><button type="button" className="btn-icon" onClick={() => setShowMeta(false)}><X size={18}/></button></div>
            <div className="field"><label>Nome da meta</label><input value={metaForm.nome} onChange={(e)=>setMetaForm({...metaForm,nome:e.target.value})} placeholder="Viagem para Praia" required /></div>
            <div className="field"><label>Valor desejado</label><input type="number" min="0.01" step="0.01" value={metaForm.valor_desejado} onChange={(e)=>setMetaForm({...metaForm,valor_desejado:e.target.value})} required /></div>
            <div className="field"><label>Valor já guardado</label><input type="number" min="0" step="0.01" value={metaForm.valor_atual} onChange={(e)=>setMetaForm({...metaForm,valor_atual:e.target.value})} /></div>
            <div className="field"><label>Data prevista</label><input type="date" value={metaForm.data_prevista} onChange={(e)=>setMetaForm({...metaForm,data_prevista:e.target.value})} /></div>
            <div className="modal-actions"><button type="button" className="btn-cancel" onClick={() => setShowMeta(false)}>Cancelar</button><button className="btn-save">Salvar</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
