import { useState, useEffect } from 'react'
import { dashboardService } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { FileText, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import './RelatoriosPage.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const COLORS_GREEN = ['#00e5a0','#00b87a','#00855a','#005a3c','#003d29']
const COLORS_RED = ['#ff4d6d','#e0263f','#b5001d','#800015','#5a000f']

export default function RelatoriosPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
  })

  useEffect(() => { load() }, [filters])

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.mes) params.mes = filters.mes
      if (filters.ano) params.ano = filters.ano
      const res = await dashboardService.relatorio(params)
      setData(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const fmt = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const despCats = Object.entries(data?.despesas_por_categoria || {}).sort((a,b) => b[1]-a[1])
  const recCats = Object.entries(data?.receitas_por_categoria || {}).sort((a,b) => b[1]-a[1])

  const barDespOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161b2e',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8892aa',
        callbacks: {
          label: ctx => ` ${ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#4a5270', callback: v => 'R$ '+v.toLocaleString('pt-BR') },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: { ticks: { color: '#8892aa' }, grid: { display: false } }
    }
  }

  const periodoLabel = () => {
    if (filters.mes && filters.ano)
      return format(new Date(+filters.ano, +filters.mes-1, 1), 'MMMM \'de\' yyyy', { locale: ptBR })
    if (filters.ano) return `Ano de ${filters.ano}`
    return 'Todos os períodos'
  }

  return (
    <div className="relatorios-page fade-in">
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p className="page-desc">Análise detalhada de {periodoLabel()}</p>
        </div>

        <div className="rel-filters">
          <select value={filters.mes} onChange={e => setFilters(p => ({ ...p, mes: e.target.value }))}>
            <option value="">Todos os meses</option>
            {Array.from({length:12},(_,i)=>i+1).map(m => (
              <option key={m} value={m}>
                {format(new Date(2024, m-1, 1), 'MMMM', { locale: ptBR })}
              </option>
            ))}
          </select>
          <select value={filters.ano} onChange={e => setFilters(p => ({ ...p, ano: e.target.value }))}>
            <option value="">Todos os anos</option>
            {[2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="table-loading"><div className="spinner" /></div>
      ) : !data ? null : (
        <>
          {/* Summary cards */}
          <div className="rel-summary">
            <div className="rel-card green">
              <TrendingUp size={20} />
              <div>
                <span>Receitas</span>
                <strong>{fmt(data.total_receitas)}</strong>
              </div>
            </div>
            <div className="rel-card red">
              <TrendingDown size={20} />
              <div>
                <span>Despesas</span>
                <strong>{fmt(data.total_despesas)}</strong>
              </div>
            </div>
            <div className={`rel-card ${data.saldo >= 0 ? 'blue' : 'red'}`}>
              <Wallet size={20} />
              <div>
                <span>Saldo</span>
                <strong>{fmt(data.saldo)}</strong>
              </div>
            </div>
          </div>

          {/* Charts + tables */}
          <div className="rel-grid">
            {/* Despesas por categoria */}
            <div className="rel-section">
              <h3>Despesas por Categoria</h3>
              {despCats.length === 0 ? (
                <p className="no-data">Nenhuma despesa no período</p>
              ) : (
                <>
                  <div style={{ height: Math.max(200, despCats.length * 44) }}>
                    <Bar
                      data={{
                        labels: despCats.map(([k]) => k),
                        datasets: [{
                          data: despCats.map(([,v]) => v),
                          backgroundColor: COLORS_RED,
                          borderRadius: 6,
                          borderSkipped: false,
                        }]
                      }}
                      options={barDespOptions}
                    />
                  </div>
                  <div className="cat-list">
                    {despCats.map(([cat, val], i) => (
                      <div key={cat} className="cat-row">
                        <span className="cat-dot" style={{ background: COLORS_RED[i % COLORS_RED.length] }} />
                        <span className="cat-name">{cat}</span>
                        <div className="cat-bar-wrap">
                          <div
                            className="cat-bar-fill red"
                            style={{ width: `${(val / data.total_despesas * 100).toFixed(1)}%` }}
                          />
                        </div>
                        <span className="cat-pct">{(val / data.total_despesas * 100).toFixed(1)}%</span>
                        <span className="cat-val">{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Receitas por categoria */}
            <div className="rel-section">
              <h3>Receitas por Categoria</h3>
              {recCats.length === 0 ? (
                <p className="no-data">Nenhuma receita no período</p>
              ) : (
                <div className="cat-list">
                  {recCats.map(([cat, val], i) => (
                    <div key={cat} className="cat-row">
                      <span className="cat-dot" style={{ background: COLORS_GREEN[i % COLORS_GREEN.length] }} />
                      <span className="cat-name">{cat}</span>
                      <div className="cat-bar-wrap">
                        <div
                          className="cat-bar-fill green"
                          style={{ width: `${(val / data.total_receitas * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="cat-pct">{(val / data.total_receitas * 100).toFixed(1)}%</span>
                      <span className="cat-val">{fmt(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent transactions */}
              <h3 style={{ marginTop: '1.5rem' }}>Últimas movimentações</h3>
              <div className="mini-table">
                {(data.movimentacoes || []).slice(0, 10).map(m => (
                  <div key={m.id} className="mini-row">
                    <span className={`mini-badge ${m.tipo === 'Receita' ? 'green' : 'red'}`}>
                      {m.tipo[0]}
                    </span>
                    <span className="mini-cat">{m.categoria}</span>
                    <span className="mini-desc">{m.descricao || '—'}</span>
                    <span className={`mini-val ${m.tipo === 'Receita' ? 'text-green' : 'text-red'}`}>
                      {m.tipo === 'Receita' ? '+' : '-'}{fmt(m.valor)}
                    </span>
                  </div>
                ))}
                {data.movimentacoes?.length === 0 && (
                  <p className="no-data">Nenhuma movimentação no período</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
