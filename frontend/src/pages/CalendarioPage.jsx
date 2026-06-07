import { useEffect, useState } from 'react'
import { CalendarDays, List, RefreshCw } from 'lucide-react'
import { v2Service } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './FeaturePages.css'

const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const tipoClass=t=>({Receita:'event-income',Despesa:'event-expense',Meta:'event-goal',Cartão:'event-card',Parcelamento:'event-installment'}[t]||'event-default')

export default function CalendarioPage(){
 const { usuario } = useAuth()
 const hoje=new Date(); const [mes,setMes]=useState(hoje.getMonth()+1); const [ano,setAno]=useState(hoje.getFullYear()); const [eventos,setEventos]=useState([]); const [modo,setModo]=useState('lista')
 async function carregar(){
   setEventos([])
   const r=await v2Service.calendario({mes,ano,_uid: usuario?.id || '', _t: Date.now()});
   setEventos(Array.isArray(r.data?.eventos) ? r.data.eventos : [])
 }
 useEffect(()=>{ carregar().catch(()=>setEventos([])) },[mes,ano,usuario?.id])
 const porDia=eventos.reduce((acc,e)=>{const d=e.data?new Date(e.data).getDate():0;(acc[d]??=[]).push(e);return acc},{})
 const dias=new Date(ano,mes,0).getDate()
 return <div className="feature-page fade-in"><div className="page-header"><div><h1>Calendário Financeiro</h1><p className="page-desc">Receitas, despesas, parcelas, vencimentos de cartões, metas e recorrências em uma visão mensal. Dados exibidos somente da conta logada{usuario?.email ? `: ${usuario.email}` : ''}.</p></div><button className="btn-save" onClick={carregar}><RefreshCw size={15}/> Atualizar</button></div>
 <div className="filters-header"><select className="year-select" value={mes} onChange={e=>setMes(+e.target.value)}>{MESES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select><select className="year-select" value={ano} onChange={e=>setAno(+e.target.value)}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select><button className="btn-cancel" onClick={()=>setModo(modo==='lista'?'mensal':'lista')}>{modo==='lista'?<CalendarDays size={15}/>:<List size={15}/>} {modo==='lista'?'Ver mensal':'Ver lista'}</button></div>
 {modo==='mensal'?<div className="calendar-grid">{Array.from({length:dias},(_,i)=>i+1).map(d=><div className="calendar-day" key={d}><strong>{d}</strong>{(porDia[d]||[]).slice(0,3).map((e,i)=><span key={i} className={`event-pill ${tipoClass(e.tipo)}`}>{e.nome} {e.valor?fmt(e.valor):''}</span>)}</div>)}</div>:<div className="feature-card"><h3>Eventos do mês</h3>{eventos.length===0?<div className="empty-state">Nenhum evento financeiro encontrado neste mês.</div>:<div className="table-list">{eventos.map((e,i)=><div className="table-row" key={i}><div><strong>{new Date(e.data).toLocaleDateString('pt-BR')} — {e.nome}</strong><p>{e.categoria} • {e.tipo}</p></div><b className={tipoClass(e.tipo)}>{e.valor?fmt(e.valor):'—'}</b></div>)}</div>}</div>}
 </div>
}
