import { useEffect, useState } from 'react'
import { categoriasService } from '../services/api'
import { Plus, Pencil, Trash2, X, Tags } from 'lucide-react'
import './MovimentacoesPage.css'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState({ nome: '', tipo: 'Despesa' })
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const load = async () => { const { data } = await categoriasService.listar(); setCategorias(data) }
  useEffect(() => { load() }, [])
  const save = async (e) => { e.preventDefault(); setMsg(''); setErro(''); try { if (editing) await categoriasService.atualizar(editing.id, form); else await categoriasService.criar(form); setForm({ nome:'', tipo:'Despesa' }); setEditing(null); setMsg('Categoria salva com sucesso!'); load() } catch(err) { setErro(err.response?.data?.detail || 'Erro ao salvar categoria') } }
  const edit = (c) => { setEditing(c); setForm({ nome:c.nome, tipo:c.tipo || 'Despesa' }) }
  const del = async (c) => { if (!confirm(`Excluir a categoria ${c.nome}?`)) return; setErro(''); try { await categoriasService.excluir(c.id); load() } catch(err) { setErro(err.response?.data?.detail || 'Erro ao excluir categoria') } }
  return <div className="movs-page fade-in">
    <div className="page-header"><div><h1>Categorias</h1><p className="page-desc">Crie categorias personalizadas para receitas, despesas e gráficos.</p></div></div>
    {(msg || erro) && <div className={`summary-item ${erro ? 'red':'green'}`}>{erro || msg}</div>}
    <div className="charts-grid" style={{gridTemplateColumns:'360px 1fr'}}>
      <div className="chart-card"><h3>{editing ? 'Editar categoria' : 'Nova categoria'}</h3><form onSubmit={save} className="modal-form">
        <div className="field"><label>Nome</label><input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Ex: Academia, Pet, Cartão" required /></div>
        <div className="field"><label>Tipo</label><select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}><option value="Despesa">Despesa</option><option value="Receita">Receita</option></select></div>
        <div className="modal-actions"><button type="submit" className="btn-save"><Plus size={14}/> {editing ? 'Salvar' : 'Criar'}</button>{editing && <button type="button" className="btn-cancel" onClick={()=>{setEditing(null);setForm({nome:'',tipo:'Despesa'})}}><X size={14}/>Cancelar</button>}</div>
      </form></div>
      <div className="table-card"><table className="movs-table"><thead><tr><th>Categoria</th><th>Tipo</th><th>Origem</th><th>Ações</th></tr></thead><tbody>{categorias.map(c=><tr key={c.id}><td><Tags size={14}/> {c.nome}</td><td>{c.tipo || 'Geral'}</td><td>{c.padrao ? 'Padrão' : 'Personalizada'}</td><td><div className="actions">{!c.padrao && <><button className="btn-edit" onClick={()=>edit(c)}><Pencil size={14}/></button><button className="btn-del" onClick={()=>del(c)}><Trash2 size={14}/></button></>}</div></td></tr>)}</tbody></table></div>
    </div>
  </div>
}
