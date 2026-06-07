from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from database import get_db
import models
from auth import get_usuario_atual
from pydantic import BaseModel

router = APIRouter(prefix="/metas", tags=["Metas"])


class MetaCreate(BaseModel):
    descricao: str
    valor_meta: float
    mes: int
    ano: int


class MetaResponse(BaseModel):
    id: int
    descricao: str
    valor_meta: float
    mes: int
    ano: int
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[MetaResponse])
def listar(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    q = db.query(models.Meta).filter(models.Meta.usuario_id == usuario_atual.id)
    if mes: q = q.filter(models.Meta.mes == mes)
    if ano: q = q.filter(models.Meta.ano == ano)
    return q.all()


@router.post("/", response_model=MetaResponse, status_code=201)
def criar(
    dados: MetaCreate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    meta = models.Meta(**dados.model_dump(), usuario_id=usuario_atual.id)
    db.add(meta)
    db.commit()
    db.refresh(meta)
    return meta


@router.put("/{id}", response_model=MetaResponse)
def atualizar(
    id: int,
    dados: MetaCreate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    meta = db.query(models.Meta).filter(models.Meta.id == id, models.Meta.usuario_id == usuario_atual.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    for k, v in dados.model_dump().items():
        setattr(meta, k, v)
    db.commit()
    db.refresh(meta)
    return meta


@router.delete("/{id}", status_code=204)
def excluir(
    id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    meta = db.query(models.Meta).filter(models.Meta.id == id, models.Meta.usuario_id == usuario_atual.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(meta)
    db.commit()
