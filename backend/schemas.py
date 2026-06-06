from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class TipoMovimentacao(str, Enum):
    receita = "Receita"
    despesa = "Despesa"


# ─── Usuário ────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, v):
        if not v.strip():
            raise ValueError("Nome não pode ser vazio")
        return v.strip()

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v):
        if len(v) < 6:
            raise ValueError("Senha deve ter ao menos 6 caracteres")
        return v


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    data_criacao: datetime

    model_config = {"from_attributes": True}


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


# ─── Movimentação ────────────────────────────────────────────────────────────

class MovimentacaoCreate(BaseModel):
    tipo: TipoMovimentacao
    valor: float
    categoria: str
    descricao: Optional[str] = None
    data_movimentacao: datetime

    @field_validator("valor")
    @classmethod
    def valor_positivo(cls, v):
        if v <= 0:
            raise ValueError("Valor deve ser positivo")
        return v

    @field_validator("categoria")
    @classmethod
    def categoria_nao_vazia(cls, v):
        if not v.strip():
            raise ValueError("Categoria não pode ser vazia")
        return v.strip()


class MovimentacaoUpdate(BaseModel):
    tipo: Optional[TipoMovimentacao] = None
    valor: Optional[float] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    data_movimentacao: Optional[datetime] = None


class MovimentacaoResponse(BaseModel):
    id: int
    usuario_id: int
    tipo: TipoMovimentacao
    valor: float
    categoria: str
    descricao: Optional[str]
    data_movimentacao: datetime
    data_criacao: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_receitas: float
    total_despesas: float
    saldo: float
    quantidade_movimentacoes: int
    por_categoria: dict
    mensal: list


class FiltroMovimentacao(BaseModel):
    mes: Optional[int] = None
    ano: Optional[int] = None
    categoria: Optional[str] = None
    tipo: Optional[TipoMovimentacao] = None
