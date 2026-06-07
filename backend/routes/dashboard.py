from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, or_
from typing import Optional
from database import get_db
import models
from auth import get_usuario_atual
from collections import defaultdict

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumo")
def resumo(
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    q = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_atual.id)
    if mes:
        q = q.filter(extract("month", models.Movimentacao.data_movimentacao) == mes)
    if ano:
        q = q.filter(extract("year", models.Movimentacao.data_movimentacao) == ano)
    movs = q.all()
    total_receitas = sum(m.valor for m in movs if m.tipo.value == "Receita")
    total_despesas = sum(m.valor for m in movs if m.tipo.value == "Despesa")
    por_categoria = defaultdict(float)
    for m in movs:
        if m.tipo.value == "Despesa":
            por_categoria[m.categoria] += m.valor
    mensal_receitas, mensal_despesas = defaultdict(float), defaultdict(float)
    q_mensal = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_atual.id)
    if ano:
        q_mensal = q_mensal.filter(extract("year", models.Movimentacao.data_movimentacao) == ano)
    for m in q_mensal.all():
        key = f"{m.data_movimentacao.year}-{m.data_movimentacao.month:02d}"
        if m.tipo.value == "Receita": mensal_receitas[key] += m.valor
        else: mensal_despesas[key] += m.valor
    all_keys = sorted(set(list(mensal_receitas.keys()) + list(mensal_despesas.keys())))[-12:]
    mensal = [{"mes": k, "receitas": mensal_receitas.get(k, 0), "despesas": mensal_despesas.get(k, 0)} for k in all_keys]
    recorrentes_ativas = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_atual.id, models.Movimentacao.recorrente == True).count()
    return {"total_receitas": total_receitas, "total_despesas": total_despesas, "saldo": total_receitas-total_despesas, "quantidade_movimentacoes": len(movs), "recorrentes_ativas": recorrentes_ativas, "por_categoria": dict(por_categoria), "mensal": mensal}


@router.get("/categorias")
def categorias_disponiveis(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    cats_mov = [c[0] for c in db.query(models.Movimentacao.categoria).filter(models.Movimentacao.usuario_id == usuario_atual.id).distinct().all()]
    cats_cad = [c.nome for c in db.query(models.Categoria).filter(or_(models.Categoria.usuario_id == usuario_atual.id, models.Categoria.usuario_id.is_(None))).all()]
    return sorted(set(cats_mov + cats_cad))


@router.get("/relatorio")
def relatorio(mes: Optional[int] = Query(None, ge=1, le=12), ano: Optional[int] = Query(None), db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    q = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_atual.id)
    if mes: q = q.filter(extract("month", models.Movimentacao.data_movimentacao) == mes)
    if ano: q = q.filter(extract("year", models.Movimentacao.data_movimentacao) == ano)
    movs = q.order_by(models.Movimentacao.data_movimentacao.desc()).all()
    receitas_por_categoria, despesas_por_categoria = defaultdict(float), defaultdict(float)
    for m in movs:
        if m.tipo.value == "Receita": receitas_por_categoria[m.categoria] += m.valor
        else: despesas_por_categoria[m.categoria] += m.valor
    total_receitas = sum(receitas_por_categoria.values())
    total_despesas = sum(despesas_por_categoria.values())
    return {"total_receitas": total_receitas, "total_despesas": total_despesas, "saldo": total_receitas-total_despesas, "receitas_por_categoria": dict(receitas_por_categoria), "despesas_por_categoria": dict(despesas_por_categoria), "movimentacoes": [{"id": m.id, "tipo": m.tipo.value, "valor": m.valor, "categoria": m.categoria, "descricao": m.descricao, "data": m.data_movimentacao.isoformat(), "recorrente": m.recorrente} for m in movs]}
