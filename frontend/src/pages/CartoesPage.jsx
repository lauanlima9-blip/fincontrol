import { useEffect, useState } from 'react'
import { cartoesService } from '../services/api'
import { CreditCard, Plus, Pencil, Trash2, X } from 'lucide-react'
import './FeaturePages.css'

const empty = {
  nome: '',
  banco_emissor: '',
  bandeira: 'Visa',
  limite_total: '',
  dia_fechamento: 10,
  dia_vencimento: 20,
  cor: '#00e5a0',
  status: 'Ativo',
}

const fmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CartoesPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function load() {
    try {
      const r = await cartoesService.listar()
      setItems(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setErro('Não foi possível carregar os cartões. Verifique se o backend está atualizado.')
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(empty)
    setShow(true)
  }

  function openEdit(card) {
    setEditing(card.id)
    setForm({
      nome: card.nome || '',
      banco_emissor: card.banco_emissor || '',
      bandeira: card.bandeira || 'Visa',
      limite_total: card.limite_total || '',
      dia_fechamento: card.dia_fechamento || 10,
      dia_vencimento: card.dia_vencimento || 20,
      cor: card.cor || '#00e5a0',
      status: card.status || 'Ativo',
    })
    setShow(true)
  }

  async function save(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const payload = {
      ...form,
      limite_total: Number(form.limite_total),
      dia_fechamento: Number(form.dia_fechamento),
      dia_vencimento: Number(form.dia_vencimento),
    }
    try {
      if (editing) await cartoesService.atualizar(editing, payload)
      else await cartoesService.criar(payload)
      setForm(empty)
      setEditing(null)
      setShow(false)
      await load()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Erro ao salvar cartão.')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id) {
    if (!confirm('Deseja excluir este cartão?')) return
    try {
      await cartoesService.excluir(id)
      await load()
    } catch (e) {
      setErro(e?.response?.data?.detail || 'Erro ao excluir cartão.')
    }
  }

  return (
    <div className="feature-page fade-in">
      <div className="page-header">
        <div>
          <h1>Cartões de Crédito</h1>
          <p className="page-desc">Gerencie limite, fechamento, vencimento e fatura.</p>
        </div>
        <button className="btn-add" onClick={openNew}><Plus size={16} /> Novo cartão</button>
      </div>

      {erro && <div className="empty-state error-state">{erro}</div>}

      <div className="feature-grid">
        {items.map((c) => {
          const percentual = Number(c.percentual_utilizado) || 0
          return (
            <div className="credit-card" key={c.id} style={{ borderColor: c.cor || '#00e5a0' }}>
              <CreditCard />
              <h3>{c.nome}</h3>
              <p>{c.banco_emissor} • {c.bandeira}</p>
              <div className="mini-row"><span>Utilizado</span><strong>{fmt(c.limite_utilizado)}</strong></div>
              <div className="progress"><i style={{ width: `${Math.min(percentual, 100)}%`, background: c.cor || '#00e5a0' }} /></div>
              <div className="mini-row"><span>Disponível</span><strong>{fmt(c.limite_disponivel)}</strong></div>
              <small>Fecha dia {c.dia_fechamento} • Vence dia {c.dia_vencimento} • {c.status}</small>
              <div className="modal-actions" style={{ marginTop: '.5rem', paddingTop: '.75rem' }}>
                <button type="button" className="btn-clear" onClick={() => openEdit(c)}><Pencil size={14} />Editar</button>
                <button type="button" className="btn-danger" onClick={() => remove(c.id)}><Trash2 size={14} />Excluir</button>
              </div>
            </div>
          )
        })}
      </div>

      {items.length === 0 && !erro && <div className="empty-state"><h3>Nenhum cartão cadastrado</h3><p>Cadastre seu primeiro cartão para acompanhar limite, fatura e gastos.</p></div>}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <form className="modal modal-form" onSubmit={save} onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h3>{editing ? 'Editar cartão' : 'Novo cartão'}</h3>
              <button type="button" className="btn-icon" onClick={() => setShow(false)}><X size={18} /></button>
            </div>

            <div className="field"><label>Nome do cartão</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="field"><label>Banco emissor</label><input value={form.banco_emissor} onChange={(e) => setForm({ ...form, banco_emissor: e.target.value })} required /></div>
            <div className="field"><label>Bandeira</label><select value={form.bandeira} onChange={(e) => setForm({ ...form, bandeira: e.target.value })}><option>Visa</option><option>Mastercard</option><option>Elo</option><option>American Express</option><option>Hipercard</option><option>Outra</option></select></div>
            <div className="field"><label>Limite total</label><input type="number" min="0" step="0.01" value={form.limite_total} onChange={(e) => setForm({ ...form, limite_total: e.target.value })} required /></div>
            <div className="field"><label>Dia de fechamento</label><input type="number" min="1" max="31" value={form.dia_fechamento} onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })} required /></div>
            <div className="field"><label>Dia de vencimento</label><input type="number" min="1" max="31" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} required /></div>
            <div className="field"><label>Cor do cartão</label><input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Ativo</option><option>Inativo</option></select></div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShow(false)}>Cancelar</button>
              <button className="btn-save" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
