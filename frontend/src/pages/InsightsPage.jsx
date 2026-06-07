import { useCallback, useEffect, useState } from 'react'
import { insightsService, planejamentoService } from '../services/api'
import { Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './FeaturePages.css'

export default function InsightsPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [items, setItems] = useState([])
  const [last, setLast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [metas, setMetas] = useState([])

  const load = useCallback(async () => {
    setErro('')
    try {
      const r = await insightsService.historico()
      setItems(Array.isArray(r.data) ? r.data : [])
      try { const m = await planejamentoService.metas(); setMetas(Array.isArray(m.data) ? m.data : []) } catch { setMetas([]) }
    } catch (e) {
      setItems([])
      setErro('Não foi possível carregar o histórico de análises. Verifique se o backend está online.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function gerar() {
    setLoading(true)
    setErro('')
    try {
      const r = await insightsService.gerar({ mes: Number(mes), ano: Number(ano) })
      setLast(r.data)
      await load()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Erro ao gerar análise IA.')
    } finally {
      setLoading(false)
    }
  }

  async function excluirAnalise(id) {
    if (!confirm('Deseja excluir esta análise do histórico?')) return
    try {
      await insightsService.excluir(id)
      if (last?.id === id) setLast(null)
      await load()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Não foi possível excluir esta análise.')
    }
  }

  function pdf(i) {
    if (!i) return
    const doc = new jsPDF()
    doc.text(i.titulo || 'Relatório IA', 14, 18)
    const linhas = String(i.resumo || '').split('\n').filter(Boolean).map((x) => [x])
    autoTable(doc, { startY: 28, body: linhas.length ? linhas : [['Sem resumo disponível.']] })
    doc.save(`insight-${i.mes || mes}-${i.ano || ano}.pdf`)
  }

  return (
    <div className="feature-page fade-in">
      <div className="page-header">
        <div>
          <h1>Insights IA</h1>
          <p className="page-desc">Análises mensais automáticas com base nas suas receitas, despesas, metas, cartões e parcelas.</p>
        </div>
        <div className="filters-header">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          <button type="button" className="btn-save" onClick={gerar} disabled={loading}>{loading ? 'Gerando...' : 'Gerar análise'}</button>
        </div>
      </div>

      {erro && <div className="empty-state error-state">{erro}</div>}

      <div className="insight-box">
        <h3>Análise automática das metas</h3>
        {metas.length === 0 ? (
          <p>Crie uma meta no Simulador Financeiro para receber análises como prazo estimado, valor faltante e oportunidades de economia.</p>
        ) : metas.slice(0, 3).map((meta) => {
          const progresso = Number(meta.progresso || 0)
          const faltamPct = Math.max(100 - progresso, 0)
          const faltamValor = Number(meta.faltam || 0)
          const mesesEstimados = valorMes => valorMes > 0 ? Math.ceil(faltamValor / valorMes) : null
          const estimativaAtual = mesesEstimados(300)
          const estimativaAcelerada = mesesEstimados(450)
          return (
            <div className="auto-insight" key={meta.id}>
              <h4>🎯 {meta.nome}</h4>
              <p>Você está a apenas {faltamPct.toFixed(0)}% de concluir sua meta {meta.nome}.</p>
              <p>Mantendo uma economia média de R$ 300 por mês, sua meta será alcançada em aproximadamente {estimativaAtual || 0} meses.</p>
              <p>Se aumentar sua economia mensal em R$ 150, a meta será alcançada {Math.max((estimativaAtual || 0) - (estimativaAcelerada || 0), 0)} meses antes.</p>
            </div>
          )
        })}
      </div>

      {last && (
        <div className="insight-box">
          <h3>{last.titulo}</h3>
          {String(last.resumo || '').split('\n').filter(Boolean).map((l, i) => <p key={i}>• {l}</p>)}
          <button type="button" className="btn-clear" onClick={() => pdf(last)}>Exportar PDF</button>
        </div>
      )}

      <h3>Histórico de análises</h3>
      <div className="feature-grid">
        {items.map((i) => (
          <div className="feature-card insight insight-card-removable" key={i.id}>
            <button type="button" className="card-x" onClick={() => excluirAnalise(i.id)} title="Excluir análise"><Trash2 size={15}/></button>
            <h3>{i.titulo}</h3>
            {String(i.resumo || '').split('\n').slice(0, 4).map((l, k) => <p key={k}>{l}</p>)}
            <button type="button" className="btn-clear" onClick={() => pdf(i)}>PDF</button>
          </div>
        ))}
      </div>

      {items.length === 0 && !erro && <div className="empty-state"><h3>Nenhum insight gerado ainda</h3><p>Clique em “Gerar análise” para criar seu primeiro relatório inteligente.</p></div>}
    </div>
  )
}
