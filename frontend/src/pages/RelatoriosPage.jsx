import { useState, useEffect, useRef } from 'react'
import { dashboardService } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, Wallet, FileDown } from 'lucide-react'
import './RelatoriosPage.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const COLORS_RED = ['#ff4d6d','#e0263f','#b5001d','#800015','#5a000f']
const COLORS_GREEN = ['#00e5a0','#00b87a','#00855a','#005a3c','#003d29']

export default function RelatoriosPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
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
    } catch {} finally { setLoading(false) }
  }

  const fmt = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const periodoLabel = () => {
    if (filters.mes && filters.ano)
      return format(new Date(+filters.ano, +filters.mes-1, 1), 'MMMM \'de\' yyyy', { locale: ptBR })
    if (filters.ano) return `Ano de ${filters.ano}`
    return 'Todos os períodos'
  }

  const exportPDF = async () => {
    if (!data) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      const periodo = periodoLabel()

      // Header
      doc.setFillColor(10, 13, 20)
      doc.rect(0, 0, 210, 40, 'F')
      doc.setTextColor(0, 229, 160)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('FinControl', 14, 18)
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Relatório Financeiro — ${periodo}`, 14, 28)
      doc.setFontSize(9)
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 36)

      // Summary cards
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumo do Período', 14, 52)

      const summaryData = [
        ['💰 Total de Receitas', fmt(data.total_receitas)],
        ['💸 Total de Despesas', fmt(data.total_despesas)],
        ['📊 Saldo', fmt(data.saldo)],
        ['🔢 Movimentações', String(data.movimentacoes?.length || 0)],
      ]

      autoTable(doc, {
        startY: 56,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 11, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [245, 245, 250] },
      })

      // Despesas por categoria
      const despCats = Object.entries(data.despesas_por_categoria || {}).sort((a,b)=>b[1]-a[1])
      if (despCats.length > 0) {
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Despesas por Categoria', 14, doc.lastAutoTable.finalY + 14)

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 18,
          head: [['Categoria', 'Valor', '% do Total']],
          body: despCats.map(([cat, val]) => [
            cat,
            fmt(val),
            `${(val / data.total_despesas * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        })
      }

      // Receitas por categoria
      const recCats = Object.entries(data.receitas_por_categoria || {}).sort((a,b)=>b[1]-a[1])
      if (recCats.length > 0) {
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Receitas por Categoria', 14, doc.lastAutoTable.finalY + 14)

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 18,
          head: [['Categoria', 'Valor', '% do Total']],
          body: recCats.map(([cat, val]) => [
            cat,
            fmt(val),
            `${(val / data.total_receitas * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [0, 150, 100], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        })
      }

      // Movimentações detalhadas — new page
      if (data.movimentacoes?.length > 0) {
        doc.addPage()
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30,30,30)
        doc.text('Movimentações Detalhadas', 14, 20)

        autoTable(doc, {
          startY: 24,
          head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
          body: data.movimentacoes.map(m => [
            format(new Date(m.data), 'dd/MM/yyyy'),
            m.tipo,
            m.categoria,
            m.descricao || '—',
            (m.tipo === 'Receita' ? '+' : '-') + fmt(m.valor),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [17, 21, 32], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 4: { halign: 'right' } },
          didParseCell: (hookData) => {
            if (hookData.column.index === 4 && hookData.section === 'body') {
              const val = hookData.cell.raw
              hookData.cell.styles.textColor = val.startsWith('+') ? [0, 180, 120] : [200, 40, 60]
            }
          }
        })
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`PinnacleBI — FinControl | Página ${i} de ${pageCount}`, 14, 290)
        doc.text('Todos os direitos reservados — Lauan De Lima 2026', 210-14, 290, { align: 'right' })
      }

      doc.save(`fincontrol-relatorio-${periodo.replace(/ /g,'-')}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally { setExporting(false) }
  }

  const despCats = Object.entries(data?.despesas_por_categoria || {}).sort((a,b)=>b[1]-a[1])
  const recCats = Object.entries(data?.receitas_por_categoria || {}).sort((a,b)=>b[1]-a[1])

  const barDespOptions = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b2e', borderColor:'rgba(255,255,255,0.06)', borderWidth:1, titleColor:'#e8eaf0', bodyColor:'#8892aa',
      callbacks: { label: ctx => ` ${ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` }
    }},
    scales: {
      x: { ticks: { color: '#4a5270', callback: v => 'R$ '+v.toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { ticks: { color: '#8892aa' }, grid: { display: false } }
    }
  }

  return (
    <div className="relatorios-page fade-in">
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p className="page-desc">Análise detalhada de {periodoLabel()}</p>
        </div>
        <div className="rel-top-actions">
          <div className="rel-filters">
            <select value={filters.mes} onChange={e => setFilters(p=>({...p,mes:e.target.value}))}>
              <option value="">Todos os meses</option>
              {Array.from({length:12},(_,i)=>i+1).map(m => (
                <option key={m} value={m}>{format(new Date(2024,m-1,1),'MMMM',{locale:ptBR})}</option>
              ))}
            </select>
            <select value={filters.ano} onChange={e => setFilters(p=>({...p,ano:e.target.value}))}>
              <option value="">Todos os anos</option>
              {[2022,2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn-export" onClick={exportPDF} disabled={exporting || !data}>
            <FileDown size={15} />
            {exporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="table-loading"><div className="spinner" /></div>
      ) : !data ? null : (
        <>
          <div className="rel-summary">
            <div className="rel-card green"><TrendingUp size={20} /><div><span>Receitas</span><strong>{fmt(data.total_receitas)}</strong></div></div>
            <div className="rel-card red"><TrendingDown size={20} /><div><span>Despesas</span><strong>{fmt(data.total_despesas)}</strong></div></div>
            <div className={`rel-card ${data.saldo >= 0 ? 'blue' : 'red'}`}><Wallet size={20} /><div><span>Saldo</span><strong>{fmt(data.saldo)}</strong></div></div>
          </div>

          <div className="rel-grid">
            <div className="rel-section">
              <h3>Despesas por Categoria</h3>
              {despCats.length === 0 ? <p className="no-data">Nenhuma despesa no período</p> : (
                <>
                  <div style={{ height: Math.max(200, despCats.length * 44) }}>
                    <Bar data={{ labels: despCats.map(([k])=>k), datasets:[{ data: despCats.map(([,v])=>v), backgroundColor: COLORS_RED, borderRadius:6, borderSkipped:false }] }} options={barDespOptions} />
                  </div>
                  <div className="cat-list">
                    {despCats.map(([cat,val],i) => (
                      <div key={cat} className="cat-row">
                        <span className="cat-dot" style={{background:COLORS_RED[i%COLORS_RED.length]}} />
                        <span className="cat-name">{cat}</span>
                        <div className="cat-bar-wrap"><div className="cat-bar-fill red" style={{width:`${(val/data.total_despesas*100).toFixed(1)}%`}} /></div>
                        <span className="cat-pct">{(val/data.total_despesas*100).toFixed(1)}%</span>
                        <span className="cat-val">{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rel-section">
              <h3>Receitas por Categoria</h3>
              {recCats.length === 0 ? <p className="no-data">Nenhuma receita no período</p> : (
                <div className="cat-list">
                  {recCats.map(([cat,val],i) => (
                    <div key={cat} className="cat-row">
                      <span className="cat-dot" style={{background:COLORS_GREEN[i%COLORS_GREEN.length]}} />
                      <span className="cat-name">{cat}</span>
                      <div className="cat-bar-wrap"><div className="cat-bar-fill green" style={{width:`${(val/data.total_receitas*100).toFixed(1)}%`}} /></div>
                      <span className="cat-pct">{(val/data.total_receitas*100).toFixed(1)}%</span>
                      <span className="cat-val">{fmt(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{marginTop:'1.5rem'}}>Últimas movimentações</h3>
              <div className="mini-table">
                {(data.movimentacoes||[]).slice(0,10).map(m => (
                  <div key={m.id} className="mini-row">
                    <span className={`mini-badge ${m.tipo==='Receita'?'green':'red'}`}>{m.tipo[0]}</span>
                    <span className="mini-cat">{m.categoria}</span>
                    <span className="mini-desc">{m.descricao||'—'}</span>
                    <span className={`mini-val ${m.tipo==='Receita'?'text-green':'text-red'}`}>
                      {m.tipo==='Receita'?'+':'-'}{fmt(m.valor)}
                    </span>
                  </div>
                ))}
                {data.movimentacoes?.length===0 && <p className="no-data">Nenhuma movimentação no período</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
