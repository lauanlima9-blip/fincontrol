from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class TipoMovimentacao(str, Enum):
    receita = "Receita"
    despesa = "Despesa"


class FrequenciaRecorrencia(str, Enum):
    semanal = "Semanal"
    mensal = "Mensal"
    anual = "Anual"


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


class PerfilUpdate(BaseModel):
    nome: Optional[str] = None
    senha_atual: Optional[str] = None
    nova_senha: Optional[str] = None

    @model_validator(mode="after")
    def validar_senha(self):
        if self.nova_senha:
            if len(self.nova_senha) < 6:
                raise ValueError("A nova senha deve ter ao menos 6 caracteres")
            if not self.senha_atual:
                raise ValueError("Informe a senha atual para alterar a senha")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


class CategoriaBase(BaseModel):
    nome: str
    tipo: Optional[TipoMovimentacao] = None

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, v):
        if not v.strip():
            raise ValueError("Nome da categoria não pode ser vazio")
        return v.strip()


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(CategoriaBase):
    nome: Optional[str] = None


class CategoriaResponse(BaseModel):
    id: int
    usuario_id: Optional[int]
    nome: str
    tipo: Optional[TipoMovimentacao]
    padrao: bool
    data_criacao: datetime
    model_config = {"from_attributes": True}


class MovimentacaoCreate(BaseModel):
    tipo: TipoMovimentacao
    valor: float
    categoria: str
    descricao: Optional[str] = None
    data_movimentacao: datetime
    recorrente: bool = False
    frequencia: Optional[FrequenciaRecorrencia] = None
    proxima_data_lancamento: Optional[datetime] = None

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

    @model_validator(mode="after")
    def validar_recorrencia(self):
        if self.recorrente and not self.frequencia:
            raise ValueError("Informe a frequência da movimentação recorrente")
        return self


class MovimentacaoUpdate(BaseModel):
    tipo: Optional[TipoMovimentacao] = None
    valor: Optional[float] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    data_movimentacao: Optional[datetime] = None
    recorrente: Optional[bool] = None
    frequencia: Optional[FrequenciaRecorrencia] = None
    proxima_data_lancamento: Optional[datetime] = None


class MovimentacaoResponse(BaseModel):
    id: int
    usuario_id: int
    tipo: TipoMovimentacao
    valor: float
    categoria: str
    descricao: Optional[str]
    data_movimentacao: datetime
    recorrente: bool
    frequencia: Optional[FrequenciaRecorrencia]
    proxima_data_lancamento: Optional[datetime]
    recorrencia_origem_id: Optional[int]
    data_criacao: datetime
    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    total_receitas: float
    total_despesas: float
    saldo: float
    quantidade_movimentacoes: int
    recorrentes_ativas: int
    por_categoria: dict
    mensal: list


class FiltroMovimentacao(BaseModel):
    mes: Optional[int] = None
    ano: Optional[int] = None
    categoria: Optional[str] = None
    tipo: Optional[TipoMovimentacao] = None
