from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import Optional
from database import get_db
import models
from auth import get_usuario_atual
from collections import defaultdict

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumo")
def resumo(
    ano: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    q = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_atual.id)
    if ano:
        q = q.filter(extract("year", models.Movimentacao.data_movimentacao) == ano)

    movs = q.all()

    total_receitas = sum(m.valor for m in movs if m.tipo.value == "Receita")
    total_despesas = sum(m.valor for m in movs if m.tipo.value == "Despesa")
    saldo = total_receitas - total_despesas

    # Por categoria
    por_categoria: dict = defaultdict(float)
    for m in movs:
        if m.tipo.value == "Despesa":
            por_categoria[m.categoria] += m.valor

    # Mensal (últimos 12 meses)
    mensal_receitas: dict = defaultdict(float)
    mensal_despesas: dict = defaultdict(float)
    for m in movs:
        key = f"{m.data_movimentacao.year}-{m.data_movimentacao.month:02d}"
        if m.tipo.value == "Receita":
            mensal_receitas[key] += m.valor
        else:
            mensal_despesas[key] += m.valor

    all_keys = sorted(set(list(mensal_receitas.keys()) + list(mensal_despesas.keys())))[-12:]
    mensal = [
        {
            "mes": k,
            "receitas": mensal_receitas.get(k, 0),
            "despesas": mensal_despesas.get(k, 0),
        }
        for k in all_keys
    ]

    return {
        "total_receitas": total_receitas,
        "total_despesas": total_despesas,
        "saldo": saldo,
        "quantidade_movimentacoes": len(movs),
        "por_categoria": dict(por_categoria),
        "mensal": mensal,
    }


@router.get("/categorias")
def categorias_disponiveis(
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    cats = (
        db.query(models.Movimentacao.categoria)
        .filter(models.Movimentacao.usuario_id == usuario_atual.id)
        .distinct()
        .all()
    )
    return [c[0] for c in cats]


@router.get("/relatorio")
def relatorio(
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

    movs = q.order_by(models.Movimentacao.data_movimentacao.desc()).all()

    receitas_por_categoria: dict = defaultdict(float)
    despesas_por_categoria: dict = defaultdict(float)

    for m in movs:
        if m.tipo.value == "Receita":
            receitas_por_categoria[m.categoria] += m.valor
        else:
            despesas_por_categoria[m.categoria] += m.valor

    total_receitas = sum(receitas_por_categoria.values())
    total_despesas = sum(despesas_por_categoria.values())

    return {
        "total_receitas": total_receitas,
        "total_despesas": total_despesas,
        "saldo": total_receitas - total_despesas,
        "receitas_por_categoria": dict(receitas_por_categoria),
        "despesas_por_categoria": dict(despesas_por_categoria),
        "movimentacoes": [
            {
                "id": m.id,
                "tipo": m.tipo.value,
                "valor": m.valor,
                "categoria": m.categoria,
                "descricao": m.descricao,
                "data": m.data_movimentacao.isoformat(),
            }
            for m in movs
        ],
    }
