from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime
from calendar import monthrange
from database import get_db
from auth import get_usuario_atual
import models, schemas

router = APIRouter(prefix="/cartoes", tags=["Cartões de Crédito"])


def _calc(db, cartao, usuario_id):
    movs = db.query(models.Movimentacao).filter(
        models.Movimentacao.usuario_id == usuario_id,
        models.Movimentacao.cartao_id == cartao.id,
        models.Movimentacao.tipo == models.TipoMovimentacao.despesa,
    ).all()
    utilizado = sum(m.valor for m in movs if not m.pago)
    hoje = datetime.utcnow()
    proxima_fatura = sum(m.valor for m in movs if m.data_movimentacao.month == hoje.month and m.data_movimentacao.year == hoje.year and not m.pago)
    limite_disponivel = max(cartao.limite_total - utilizado, 0)
    pct = (utilizado / cartao.limite_total * 100) if cartao.limite_total else 0
    return utilizado, limite_disponivel, pct, proxima_fatura


def _response(db, cartao, usuario_id):
    utilizado, disponivel, pct, fatura = _calc(db, cartao, usuario_id)
    data = schemas.CartaoCreditoResponse.model_validate(cartao).model_dump()
    data.update({"limite_utilizado": utilizado, "limite_disponivel": disponivel, "percentual_utilizado": pct, "proxima_fatura": fatura})
    return data


@router.get("/")
def listar(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    cartoes = db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id == usuario_atual.id).order_by(models.CartaoCredito.data_criacao.desc()).all()
    return [_response(db, c, usuario_atual.id) for c in cartoes]


@router.post("/", status_code=status.HTTP_201_CREATED)
def criar(dados: schemas.CartaoCreditoCreate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    cartao = models.CartaoCredito(**dados.model_dump(), usuario_id=usuario_atual.id)
    db.add(cartao); db.commit(); db.refresh(cartao)
    return _response(db, cartao, usuario_atual.id)


@router.put("/{id}")
def atualizar(id: int, dados: schemas.CartaoCreditoUpdate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    cartao = db.query(models.CartaoCredito).filter(models.CartaoCredito.id == id, models.CartaoCredito.usuario_id == usuario_atual.id).first()
    if not cartao: raise HTTPException(404, "Cartão não encontrado")
    for k, v in dados.model_dump(exclude_unset=True).items(): setattr(cartao, k, v)
    db.commit(); db.refresh(cartao)
    return _response(db, cartao, usuario_atual.id)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: int, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    cartao = db.query(models.CartaoCredito).filter(models.CartaoCredito.id == id, models.CartaoCredito.usuario_id == usuario_atual.id).first()
    if not cartao: raise HTTPException(404, "Cartão não encontrado")
    usado = db.query(models.Movimentacao).filter(models.Movimentacao.cartao_id == id, models.Movimentacao.usuario_id == usuario_atual.id).first()
    if usado: raise HTTPException(400, "Este cartão possui gastos vinculados. Inative o cartão para preservar o histórico.")
    db.delete(cartao); db.commit()


@router.get("/dashboard/gastos")
def gastos_por_cartao(mes: int | None = None, ano: int | None = None, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    cartoes = db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id == usuario_atual.id).all()
    saida=[]
    for c in cartoes:
        q = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id, models.Movimentacao.cartao_id==c.id, models.Movimentacao.tipo==models.TipoMovimentacao.despesa)
        if mes: q=q.filter(extract('month', models.Movimentacao.data_movimentacao)==mes)
        if ano: q=q.filter(extract('year', models.Movimentacao.data_movimentacao)==ano)
        total=sum(m.valor for m in q.all())
        saida.append({"cartao_id":c.id,"nome":c.nome,"cor":c.cor,"total":total})
    return saida
