import { useCallback, useEffect, useState } from 'react'
import { insightsService } from '../services/api'
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

  const load = useCallback(async () => {
    setErro('')
    try {
      const r = await insightsService.historico()
      setItems(Array.isArray(r.data) ? r.data : [])
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
          <div className="feature-card insight" key={i.id}>
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
