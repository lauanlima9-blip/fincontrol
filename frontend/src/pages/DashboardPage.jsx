import { useState, useEffect } from 'react'
import { dashboardService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  TrendingUp, TrendingDown, Wallet, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import './DashboardPage.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const COLORS = ['#00e5a0','#4d9fff','#ffd166','#b57bee','#ff6b9d','#ff9f40','#36a2eb','#ff6384']

const MESES = [
  { value: '', label: 'Todos os meses' },
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    loadDashboard()
  }, [ano, mes])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const params = { ano }
      if (mes) params.mes = mes
      const res = await dashboardService.resumo(params)
      setData(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
    </div>
  )

  const categories = Object.entries(data?.por_categoria || {}).sort((a,b) => b[1]-a[1])

  const pieData = {
    labels: categories.map(([k]) => k),
    datasets: [{
      data: categories.map(([,v]) => v),
      backgroundColor: COLORS,
      borderColor: 'transparent',
      hoverOffset: 8,
    }]
  }

  const barLabels = (data?.mensal || []).map(m => {
    const [y, mo] = m.mes.split('-')
    return format(new Date(+y, +mo-1, 1), 'MMM/yy', { locale: ptBR })
  })

  const barData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Receitas',
        data: (data?.mensal || []).map(m => m.receitas),
        backgroundColor: 'rgba(0, 229, 160, 0.7)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Despesas',
        data: (data?.mensal || []).map(m => m.despesas),
        backgroundColor: 'rgba(255, 77, 109, 0.7)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8892aa', font: { family: 'DM Sans', size: 12 } } },
      tooltip: {
        backgroundColor: '#161b2e',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8892aa',
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${(+ctx.parsed.y || +ctx.parsed).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
        }
      }
    },
    scales: {
      x: { ticks: { color: '#4a5270' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: {
        ticks: {
          color: '#4a5270',
          callback: v => 'R$ ' + v.toLocaleString('pt-BR')
        },
        grid: { color: 'rgba(255,255,255,0.03)' }
      }
    }
  }

  const saldo = data?.saldo ?? 0
  const mesLabel = MESES.find(m => m.value === mes)?.label || 'Todos os meses'

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-desc">Olá, {usuario?.nome?.split(' ')[0]}! Aqui está seu resumo financeiro.</p>
        </div>
        <div className="filters-header">
          <select
            className="year-select"
            value={mes}
            onChange={e => setMes(e.target.value ? +e.target.value : '')}
          >
            {MESES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            className="year-select"
            value={ano}
            onChange={e => setAno(+e.target.value)}
          >
            {[2022,2023,2024,2025,2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-green">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Total de Receitas</span>
            <span className="kpi-value">{fmt(data?.total_receitas)}</span>
          </div>
          <ArrowUpRight size={16} className="kpi-arrow up" />
        </div>

        <div className="kpi-card kpi-red">
          <div className="kpi-icon"><TrendingDown size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Total de Despesas</span>
            <span className="kpi-value">{fmt(data?.total_despesas)}</span>
          </div>
          <ArrowDownRight size={16} className="kpi-arrow down" />
        </div>

        <div className={`kpi-card ${saldo >= 0 ? 'kpi-blue' : 'kpi-red'}`}>
          <div className="kpi-icon"><Wallet size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Saldo Atual</span>
            <span className="kpi-value">{fmt(saldo)}</span>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon"><Activity size={20} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Movimentações</span>
            <span className="kpi-value">{data?.quantidade_movimentacoes ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Evolução Mensal</h3>
          <div className="chart-wrapper bar-chart">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Despesas por Categoria</h3>
          {categories.length === 0 ? (
            <div className="empty-chart">Sem despesas registradas</div>
          ) : (
            <>
              <div className="chart-wrapper pie-chart">
                <Doughnut
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#161b2e',
                        borderColor: 'rgba(255,255,255,0.06)',
                        borderWidth: 1,
                        titleColor: '#e8eaf0',
                        bodyColor: '#8892aa',
                        callbacks: {
                          label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="pie-legend">
                {categories.slice(0, 6).map(([cat, val], i) => (
                  <div key={cat} className="legend-item">
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="legend-label">{cat}</span>
                    <span className="legend-value">{fmt(val)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
