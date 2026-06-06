from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from database import get_db
import models, schemas
from auth import get_usuario_atual

router = APIRouter(prefix="/movimentacoes", tags=["Movimentações"])


def _base_query(db: Session, usuario_id: int):
    return db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_id)


@router.get("/", response_model=list[schemas.MovimentacaoResponse])
def listar(
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2000),
    categoria: Optional[str] = None,
    tipo: Optional[schemas.TipoMovimentacao] = None,
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
    return q.order_by(models.Movimentacao.data_movimentacao.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.MovimentacaoResponse, status_code=status.HTTP_201_CREATED)
def criar(
    dados: schemas.MovimentacaoCreate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    nova = models.Movimentacao(**dados.model_dump(), usuario_id=usuario_atual.id)
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.get("/{id}", response_model=schemas.MovimentacaoResponse)
def obter(
    id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    mov = _base_query(db, usuario_atual.id).filter(models.Movimentacao.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    return mov


@router.put("/{id}", response_model=schemas.MovimentacaoResponse)
def atualizar(
    id: int,
    dados: schemas.MovimentacaoUpdate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    mov = _base_query(db, usuario_atual.id).filter(models.Movimentacao.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(mov, campo, valor)
    db.commit()
    db.refresh(mov)
    return mov


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    mov = _base_query(db, usuario_atual.id).filter(models.Movimentacao.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
    db.delete(mov)
    db.commit()
