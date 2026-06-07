import { useCallback, useEffect, useState } from 'react'
import { parcelamentosService, cartoesService } from '../services/api'
import './FeaturePages.css'

const fmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const initialDate = () => new Date().toISOString().slice(0, 16)
const empty = {
  descricao: '',
  categoria: 'Outros',
  valor_total: '',
  quantidade_parcelas: 2,
  tem_juros: false,
  juros_percentual: 0,
  data_primeira_parcela: initialDate(),
  cartao_id: '',
}

export default function ParcelamentosPage() {
  const [items, setItems] = useState([])
  const [cartoes, setCartoes] = useState([])
  const [resumo, setResumo] = useState({})
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    setErro('')
    try {
      const [parcelasResp, resumoResp, cartoesResp] = await Promise.all([
        parcelamentosService.listar(),
        parcelamentosService.resumo(),
        cartoesService.listar(),
      ])
      setItems(Array.isArray(parcelasResp.data) ? parcelasResp.data : [])
      setResumo(resumoResp.data || {})
      setCartoes(Array.isArray(cartoesResp.data) ? cartoesResp.data : [])
    } catch (e) {
      setErro('Não foi possível carregar os parcelamentos. Confira se o backend foi atualizado e está online.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const qtd = Number(form.quantidade_parcelas) || 1
  const valorTotal = Number(form.valor_total) || 0
  const juros = form.tem_juros ? (Number(form.juros_percentual) || 0) : 0
  const valorFinal = valorTotal * (1 + juros / 100)
  const valorParcela = valorFinal / qtd

  async function save(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await parcelamentosService.criar({
        ...form,
        valor_total: valorTotal,
        quantidade_parcelas: qtd,
        juros_percentual: juros,
        cartao_id: form.cartao_id ? Number(form.cartao_id) : null,
        data_primeira_parcela: new Date(form.data_primeira_parcela || new Date()).toISOString(),
      })
      setForm({ ...empty, data_primeira_parcela: initialDate() })
      await load()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Erro ao criar parcelamento.')
    } finally {
      setLoading(false)
    }
  }

  async function quitar(id) {
    try {
      await parcelamentosService.quitar(id)
      await load()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Erro ao quitar parcelamento.')
    }
  }

  return (
    <div className="feature-page fade-in">
      <div className="page-header">
        <div>
          <h1>Parcelamentos</h1>
          <p className="page-desc">Crie parcelas automáticas e acompanhe o total comprometido.</p>
        </div>
      </div>

      {erro && <div className="empty-state error-state">{erro}</div>}

      <div className="kpi-grid">
        <div className="kpi-card"><span>Total comprometido</span><b>{fmt(resumo.total_comprometido)}</b></div>
        <div className="kpi-card"><span>Parcelas futuras</span><b>{fmt(resumo.parcelas_futuras)}</b></div>
        <div className="kpi-card"><span>Parcelas do mês atual</span><b>{fmt(resumo.parcelas_mes_atual)}</b></div>
      </div>

      <form className="panel-form" onSubmit={save}>
        <input placeholder="Descrição da compra" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
        <input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
        <input type="number" min="0.01" step="0.01" placeholder="Valor total" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} required />
        <input type="number" min="1" placeholder="Quantidade de parcelas" value={form.quantidade_parcelas} onChange={(e) => setForm({ ...form, quantidade_parcelas: e.target.value })} required />
        <label className="feature-check"><input type="checkbox" checked={form.tem_juros} onChange={(e) => setForm({ ...form, tem_juros: e.target.checked })} /> Tem juros?</label>
        {form.tem_juros && <input type="number" min="0" step="0.01" placeholder="Juros %" value={form.juros_percentual} onChange={(e) => setForm({ ...form, juros_percentual: e.target.value })} />}
        <select value={form.cartao_id} onChange={(e) => setForm({ ...form, cartao_id: e.target.value })}>
          <option value="">Sem cartão</option>
          {cartoes.map((c) => <option value={c.id} key={c.id}>{c.nome}</option>)}
        </select>
        <input type="datetime-local" value={form.data_primeira_parcela} onChange={(e) => setForm({ ...form, data_primeira_parcela: e.target.value })} />
        <strong>Cada parcela: {fmt(valorParcela)}</strong>
        <button className="btn-save" disabled={loading}>{loading ? 'Criando...' : 'Criar parcelas'}</button>
      </form>

      <div className="table-card">
        <table className="movs-table">
          <thead>
            <tr><th>Compra</th><th>Total</th><th>Valor da parcela</th><th>Pagas</th><th>Restantes</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.descricao}</td>
                <td>{fmt(p.valor_total)}</td>
                <td>{fmt(p.valor_parcela)}</td>
                <td>{p.parcelas_pagas ?? 0}</td>
                <td>{p.parcelas_restantes ?? 0}</td>
                <td>{p.quitado ? 'Quitado' : 'Em aberto'}</td>
                <td><button className="btn-clear" onClick={() => quitar(p.id)} disabled={p.quitado}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && !erro && <div className="empty-state"><h3>Nenhum parcelamento cadastrado</h3><p>Cadastre uma compra parcelada para acompanhar parcelas futuras e do mês atual.</p></div>}
    </div>
  )
}
