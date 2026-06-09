from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime
from calendar import monthrange
from database import get_db
from auth import get_usuario_atual, require_premium
import models, schemas

router = APIRouter(prefix="/parcelamentos", tags=["Parcelamentos"])

def add_months(dt, months):
    m = dt.month - 1 + months
    y = dt.year + m // 12
    m = m % 12 + 1
    d = min(dt.day, monthrange(y, m)[1])
    return dt.replace(year=y, month=m, day=d)

def enrich(p):
    pagas=sum(1 for x in p.parcelas if x.pago)
    rest=p.quantidade_parcelas-pagas
    data=schemas.ParcelamentoResponse.model_validate(p).model_dump()
    data.update({"parcelas_pagas":pagas,"parcelas_restantes":rest,"valor_restante":rest*p.valor_parcela})
    return data

@router.get("/")
def listar(db: Session=Depends(get_db), usuario_atual: models.Usuario=Depends(require_premium)):
    ps=db.query(models.Parcelamento).filter(models.Parcelamento.usuario_id==usuario_atual.id).order_by(models.Parcelamento.data_criacao.desc()).all()
    return [enrich(p) for p in ps]

@router.post("/", status_code=201)
def criar(dados: schemas.ParcelamentoCreate, db: Session=Depends(get_db), usuario_atual: models.Usuario=Depends(require_premium)):
    if dados.valor_total <= 0 or dados.quantidade_parcelas < 1: raise HTTPException(400, "Valor e quantidade de parcelas devem ser positivos")
    if dados.cartao_id:
        c=db.query(models.CartaoCredito).filter(models.CartaoCredito.id==dados.cartao_id, models.CartaoCredito.usuario_id==usuario_atual.id).first()
        if not c: raise HTTPException(404, "Cartão não encontrado")
    total=dados.valor_total*(1+(dados.juros_percentual or 0)/100) if dados.tem_juros else dados.valor_total
    valor_parcela=round(total/dados.quantidade_parcelas, 2)
    p=models.Parcelamento(usuario_id=usuario_atual.id, cartao_id=dados.cartao_id, descricao=dados.descricao, categoria=dados.categoria, valor_total=round(total,2), quantidade_parcelas=dados.quantidade_parcelas, valor_parcela=valor_parcela, tem_juros=dados.tem_juros, juros_percentual=dados.juros_percentual or 0, data_primeira_parcela=dados.data_primeira_parcela)
    db.add(p); db.flush()
    for i in range(dados.quantidade_parcelas):
        db.add(models.Movimentacao(usuario_id=usuario_atual.id,tipo=models.TipoMovimentacao.despesa,valor=valor_parcela,categoria=dados.categoria,descricao=f"{dados.descricao} ({i+1}/{dados.quantidade_parcelas})",data_movimentacao=add_months(dados.data_primeira_parcela,i),cartao_id=dados.cartao_id,parcelamento_id=p.id,numero_parcela=i+1,total_parcelas=dados.quantidade_parcelas,pago=False))
    db.commit(); db.refresh(p)
    return enrich(p)

@router.post("/{id}/quitar")
def quitar(id:int, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(require_premium)):
    p=db.query(models.Parcelamento).filter(models.Parcelamento.id==id, models.Parcelamento.usuario_id==usuario_atual.id).first()
    if not p: raise HTTPException(404,"Parcelamento não encontrado")
    for parcela in p.parcelas: parcela.pago=True
    p.quitado=True; db.commit()
    return {"mensagem":"Parcelamento quitado com sucesso", **enrich(p)}

@router.post("/parcelas/{movimentacao_id}/pagar")
def pagar_parcela(movimentacao_id:int, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(require_premium)):
    m=db.query(models.Movimentacao).filter(models.Movimentacao.id==movimentacao_id, models.Movimentacao.usuario_id==usuario_atual.id).first()
    if not m: raise HTTPException(404,"Parcela não encontrada")
    m.pago=True; db.commit(); return {"mensagem":"Parcela marcada como paga"}

@router.get("/dashboard/resumo")
def resumo(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(require_premium)):
    hoje=datetime.utcnow()
    ps=db.query(models.Parcelamento).filter(models.Parcelamento.usuario_id==usuario_atual.id).all()
    parcelas=db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id, models.Movimentacao.parcelamento_id!=None).all()
    return {"total_comprometido":sum(m.valor for m in parcelas if not m.pago),"parcelas_futuras":sum(m.valor for m in parcelas if m.data_movimentacao.date()>hoje.date() and not m.pago),"parcelas_mes_atual":sum(m.valor for m in parcelas if m.data_movimentacao.month==hoje.month and m.data_movimentacao.year==hoje.year and not m.pago),"ativos":sum(1 for p in ps if not p.quitado)}
