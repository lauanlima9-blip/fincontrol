from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from datetime import datetime, timedelta
from calendar import monthrange
from database import get_db
import models, schemas
from auth import get_usuario_atual

router = APIRouter(prefix="/movimentacoes", tags=["Movimentações"])


def _base_query(db: Session, usuario_id: int):
    return db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_id)


def _somar_frequencia(data: datetime, frequencia):
    freq = frequencia.value if hasattr(frequencia, "value") else frequencia
    if freq == "Semanal":
        return data + timedelta(days=7)
    if freq == "Anual":
        try:
            return data.replace(year=data.year + 1)
        except ValueError:
            return data.replace(year=data.year + 1, day=28)
    # Mensal
    mes = data.month + 1
    ano = data.year
    if mes > 12:
        mes = 1
        ano += 1
    ultimo_dia = monthrange(ano, mes)[1]
    return data.replace(year=ano, month=mes, day=min(data.day, ultimo_dia))


@router.get("/", response_model=list[schemas.MovimentacaoResponse])
def listar(
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2000),
    categoria: Optional[str] = None,
    tipo: Optional[schemas.TipoMovimentacao] = None,
    recorrente: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    q = _base_query(db, usuario_atual.id)
    if mes:
        q = q.filter(extract("month", models.Movimentacao.data_movimentacao) == mes)
    if ano:
        q = q.filter(extract("year", models.Movimentacao.data_movimentacao) == ano)
    if categoria:
        q = q.filter(models.Movimentacao.categoria.ilike(f"%{categoria}%"))
    if tipo:
        q = q.filter(models.Movimentacao.tipo == tipo)
    if recorrente is not None:
        q = q.filter(models.Movimentacao.recorrente == recorrente)
    return q.order_by(models.Movimentacao.data_movimentacao.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.MovimentacaoResponse, status_code=status.HTTP_201_CREATED)
def criar(dados: schemas.MovimentacaoCreate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    payload = dados.model_dump()
    if payload.get("recorrente") and not payload.get("proxima_data_lancamento"):
        payload["proxima_data_lancamento"] = _somar_frequencia(payload["data_movimentacao"], payload["frequencia"])
    nova = models.Movimentacao(**payload, usuario_id=usuario_atual.id)
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.post("/recorrentes/gerar")
def gerar_recorrentes(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    hoje = datetime.utcnow()
    recorrentes = _base_query(db, usuario_atual.id).filter(
        models.Movimentacao.recorrente == True,
        models.Movimentacao.proxima_data_lancamento != None,
        models.Movimentacao.proxima_data_lancamento <= hoje,
    ).all()
    criadas = []
    for base in recorrentes:
        nova = models.Movimentacao(
            usuario_id=usuario_atual.id,
            tipo=base.tipo,
            valor=base.valor,
            categoria=base.categoria,
            descricao=f"{base.descricao or base.categoria} (recorrente)",
            data_movimentacao=base.proxima_data_lancamento,
            recorrente=False,
            recorrencia_origem_id=base.id,
        )
        base.proxima_data_lancamento = _somar_frequencia(base.proxima_data_lancamento, base.frequencia)
        db.add(nova)
        criadas.append(nova)
    db.commit()
    return {"geradas": len(criadas), "mensagem": f"{len(criadas)} movimentação(ões) recorrente(s) lançada(s)."}


@router.get("/{id}", response_model=schemas.MovimentacaoResponse)
def obter(id: int, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    mov = _base_query(db, usuario_atual.id).filter(models.Movimentacao.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    return mov


@router.put("/{id}", response_model=schemas.MovimentacaoResponse)
def atualizar(id: int, dados: schemas.MovimentacaoUpdate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    mov = _base_query(db, usuario_atual.id).filter(models.Movimentacao.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    payload = dados.model_dump(exclude_unset=True)
    if payload.get("recorrente") and payload.get("frequencia") and not payload.get("proxima_data_lancamento"):
        payload["proxima_data_lancamento"] = _somar_frequencia(payload.get("data_movimentacao") or mov.data_movimentacao, payload["frequencia"])
    for campo, valor in payload.items():
        setattr(mov, campo, valor)
    db.commit()
    db.refresh(mov)
    return mov


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: int, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    mov = _base_query(db, usuario_atual.id).filter(models.Movimentacao.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    db.delete(mov)
    db.commit()
