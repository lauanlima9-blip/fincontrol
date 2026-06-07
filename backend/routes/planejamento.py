from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from auth import get_usuario_atual
import models

router = APIRouter(prefix="/planejamento", tags=["Planejamento Financeiro"])

class MetaFinanceiraCreate(BaseModel):
    nome: str
    valor_desejado: float
    valor_atual: float = 0
    data_prevista: Optional[datetime] = None
    status: str = "Ativa"

    @field_validator("nome")
    @classmethod
    def nome_ok(cls, v):
        if not v.strip():
            raise ValueError("Nome da meta é obrigatório")
        return v.strip()

    @field_validator("valor_desejado")
    @classmethod
    def meta_positiva(cls, v):
        if v <= 0:
            raise ValueError("Valor desejado deve ser positivo")
        return v

    @field_validator("valor_atual")
    @classmethod
    def atual_ok(cls, v):
        if v < 0:
            raise ValueError("Valor atual não pode ser negativo")
        return v

class MetaFinanceiraResponse(MetaFinanceiraCreate):
    id: int
    usuario_id: int
    progresso: float = 0
    faltam: float = 0
    data_criacao: datetime
    model_config = {"from_attributes": True}



class MetaValorPayload(BaseModel):
    valor: float
    usar_sobra_mes_anterior: bool = False

    @field_validator("valor")
    @classmethod
    def valor_positivo(cls, v):
        if v <= 0:
            raise ValueError("Informe um valor positivo")
        return v

def saldo_mes_anterior(db: Session, usuario_id: int):
    hoje = datetime.utcnow()
    ano = hoje.year
    mes = hoje.month - 1
    if mes == 0:
        mes = 12
        ano -= 1
    movs = db.query(models.Movimentacao).filter(
        models.Movimentacao.usuario_id == usuario_id,
        extract("month", models.Movimentacao.data_movimentacao) == mes,
        extract("year", models.Movimentacao.data_movimentacao) == ano,
    ).all()
    receitas = sum(float(m.valor or 0) for m in movs if m.tipo == models.TipoMovimentacao.receita)
    despesas = sum(float(m.valor or 0) for m in movs if m.tipo == models.TipoMovimentacao.despesa)
    return max(receitas - despesas, 0)

def buscar_meta(db: Session, usuario_id: int, id: int):
    meta = db.query(models.MetaFinanceira).filter(
        models.MetaFinanceira.id == id,
        models.MetaFinanceira.usuario_id == usuario_id
    ).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta financeira não encontrada")
    return meta

class SimulacaoCreate(BaseModel):
    valor_mensal: float
    periodo_meses: int

    @field_validator("valor_mensal")
    @classmethod
    def valor_ok(cls, v):
        if v <= 0:
            raise ValueError("Valor mensal deve ser positivo")
        return v

    @field_validator("periodo_meses")
    @classmethod
    def periodo_ok(cls, v):
        if v < 1 or v > 600:
            raise ValueError("Período deve estar entre 1 e 600 meses")
        return v

def enriquecer_meta(m):
    progresso = min((float(m.valor_atual or 0) / float(m.valor_desejado or 1)) * 100, 100)
    faltam = max(float(m.valor_desejado or 0) - float(m.valor_atual or 0), 0)
    return {
        "id": m.id,
        "usuario_id": m.usuario_id,
        "nome": m.nome,
        "valor_desejado": m.valor_desejado,
        "valor_atual": m.valor_atual,
        "data_prevista": m.data_prevista,
        "status": m.status,
        "data_criacao": m.data_criacao,
        "progresso": progresso,
        "faltam": faltam,
    }

@router.get("/metas")
def listar_metas(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    metas = db.query(models.MetaFinanceira).filter(models.MetaFinanceira.usuario_id == usuario_atual.id).order_by(models.MetaFinanceira.data_criacao.desc()).all()
    return [enriquecer_meta(m) for m in metas]

@router.post("/metas", status_code=201)
def criar_meta(dados: MetaFinanceiraCreate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    meta = models.MetaFinanceira(**dados.model_dump(), usuario_id=usuario_atual.id)
    db.add(meta)
    db.commit()
    db.refresh(meta)
    return enriquecer_meta(meta)

@router.put("/metas/{id}")
def atualizar_meta(id: int, dados: MetaFinanceiraCreate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    meta = db.query(models.MetaFinanceira).filter(models.MetaFinanceira.id == id, models.MetaFinanceira.usuario_id == usuario_atual.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta financeira não encontrada")
    for k, v in dados.model_dump().items():
        setattr(meta, k, v)
    db.commit()
    db.refresh(meta)
    return enriquecer_meta(meta)

@router.delete("/metas/{id}", status_code=204)
def excluir_meta(id: int, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    meta = db.query(models.MetaFinanceira).filter(models.MetaFinanceira.id == id, models.MetaFinanceira.usuario_id == usuario_atual.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta financeira não encontrada")
    db.delete(meta)
    db.commit()



@router.post("/metas/{id}/aporte")
def adicionar_valor_meta(id: int, dados: MetaValorPayload, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    meta = buscar_meta(db, usuario_atual.id, id)
    sobra = saldo_mes_anterior(db, usuario_atual.id) if dados.usar_sobra_mes_anterior else 0
    valor_total = float(dados.valor or 0) + float(sobra or 0)
    meta.valor_atual = min(float(meta.valor_atual or 0) + valor_total, float(meta.valor_desejado or 0))
    mov = models.Movimentacao(
        usuario_id=usuario_atual.id,
        tipo=models.TipoMovimentacao.despesa,
        valor=valor_total,
        categoria="Metas Financeiras",
        descricao=f"Meta - {meta.nome}",
        data_movimentacao=datetime.utcnow(),
        recorrente=False,
    )
    db.add(mov)
    db.commit()
    db.refresh(meta)
    return {"meta": enriquecer_meta(meta), "movimentacao_id": mov.id, "valor_lancado": valor_total, "sobra_usada": sobra}

@router.post("/metas/{id}/retirada")
def retirar_valor_meta(id: int, dados: MetaValorPayload, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    meta = buscar_meta(db, usuario_atual.id, id)
    valor = min(float(dados.valor or 0), float(meta.valor_atual or 0))
    if valor <= 0:
        raise HTTPException(status_code=400, detail="Esta meta não possui saldo para retirada")
    meta.valor_atual = max(float(meta.valor_atual or 0) - valor, 0)
    mov = models.Movimentacao(
        usuario_id=usuario_atual.id,
        tipo=models.TipoMovimentacao.receita,
        valor=valor,
        categoria="Metas Financeiras",
        descricao=f"Retirada da meta - {meta.nome}",
        data_movimentacao=datetime.utcnow(),
        recorrente=False,
    )
    db.add(mov)
    db.commit()
    db.refresh(meta)
    return {"meta": enriquecer_meta(meta), "movimentacao_id": mov.id, "valor_retirado": valor}

@router.get("/sobra-mes-anterior")
def obter_sobra_mes_anterior(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    return {"sobra": saldo_mes_anterior(db, usuario_atual.id)}

@router.post("/simulacoes", status_code=201)
def criar_simulacao(dados: SimulacaoCreate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    valor_final = dados.valor_mensal * dados.periodo_meses
    sim = models.SimulacaoFinanceira(usuario_id=usuario_atual.id, valor_mensal=dados.valor_mensal, periodo_meses=dados.periodo_meses, valor_final=valor_final)
    db.add(sim)
    db.commit()
    db.refresh(sim)
    serie = [{"mes": i, "valor": dados.valor_mensal * i} for i in range(1, dados.periodo_meses + 1)]
    return {"id": sim.id, "valor_mensal": sim.valor_mensal, "periodo_meses": sim.periodo_meses, "valor_final": sim.valor_final, "serie": serie}

@router.get("/resumo")
def resumo(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    metas = db.query(models.MetaFinanceira).filter(models.MetaFinanceira.usuario_id == usuario_atual.id).all()
    total_meta = sum(float(m.valor_desejado or 0) for m in metas)
    total_guardado = sum(float(m.valor_atual or 0) for m in metas)
    progresso_medio = (total_guardado / total_meta * 100) if total_meta else 0
    proximas = sorted([enriquecer_meta(m) for m in metas], key=lambda x: x["faltam"])
    return {"total_meta": total_meta, "total_guardado": total_guardado, "progresso_medio": progresso_medio, "quantidade": len(metas), "proxima_meta": proximas[0] if proximas else None, "metas": proximas[:3]}
