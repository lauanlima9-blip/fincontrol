from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, Any
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
    foto_perfil: Optional[str] = None
    tema_preferido: Optional[str] = "dark"
    notificacoes_ativas: Optional[bool] = True
    model_config = {"from_attributes": True}


class PerfilUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    foto_perfil: Optional[str] = None
    tema_preferido: Optional[str] = None
    notificacoes_ativas: Optional[bool] = None
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
    cartao_id: Optional[int] = None

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
    cartao_id: Optional[int] = None


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
    cartao_id: Optional[int] = None
    parcelamento_id: Optional[int] = None
    numero_parcela: Optional[int] = None
    total_parcelas: Optional[int] = None
    pago: bool = False
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


class StatusCartao(str, Enum):
    ativo = "Ativo"
    inativo = "Inativo"

class CartaoCreditoBase(BaseModel):
    nome: str
    banco_emissor: str
    bandeira: str
    limite_total: float
    dia_fechamento: int
    dia_vencimento: int
    cor: str = "#00e5a0"
    status: StatusCartao = StatusCartao.ativo

    @field_validator("limite_total")
    @classmethod
    def limite_positivo(cls, v):
        if v <= 0: raise ValueError("Limite deve ser positivo")
        return v

    @field_validator("dia_fechamento", "dia_vencimento")
    @classmethod
    def dia_valido(cls, v):
        if v < 1 or v > 31: raise ValueError("Dia deve estar entre 1 e 31")
        return v

class CartaoCreditoCreate(CartaoCreditoBase): pass
class CartaoCreditoUpdate(BaseModel):
    nome: Optional[str] = None
    banco_emissor: Optional[str] = None
    bandeira: Optional[str] = None
    limite_total: Optional[float] = None
    dia_fechamento: Optional[int] = None
    dia_vencimento: Optional[int] = None
    cor: Optional[str] = None
    status: Optional[StatusCartao] = None

class CartaoCreditoResponse(CartaoCreditoBase):
    id: int
    usuario_id: int
    limite_utilizado: float = 0
    limite_disponivel: float = 0
    percentual_utilizado: float = 0
    proxima_fatura: float = 0
    data_criacao: datetime
    model_config = {"from_attributes": True}

class ParcelamentoCreate(BaseModel):
    descricao: str
    categoria: str
    valor_total: float
    quantidade_parcelas: int
    tem_juros: bool = False
    juros_percentual: float = 0
    data_primeira_parcela: datetime
    cartao_id: Optional[int] = None

class ParcelamentoResponse(BaseModel):
    id: int
    descricao: str
    categoria: str
    valor_total: float
    quantidade_parcelas: int
    valor_parcela: float
    tem_juros: bool
    juros_percentual: float
    data_primeira_parcela: datetime
    cartao_id: Optional[int]
    quitado: bool
    parcelas_pagas: int = 0
    parcelas_restantes: int = 0
    valor_restante: float = 0
    model_config = {"from_attributes": True}

class InsightResponse(BaseModel):
    id: int
    mes: int
    ano: int
    titulo: str
    resumo: str
    indicadores: Optional[Any] = None
    data_criacao: datetime
    model_config = {"from_attributes": True}


class NotificationResponse(BaseModel):
    id: int
    titulo: str
    mensagem: str
    lida: bool
    tipo: str
    data_referencia: Optional[datetime] = None
    data_criacao: datetime
    model_config = {"from_attributes": True}


class PatrimonioCreate(BaseModel):
    nome: str
    categoria: str
    tipo: str
    valor: float
    observacao: Optional[str] = None

    @field_validator("nome", "categoria")
    @classmethod
    def texto_ok(cls, v):
        if not str(v).strip():
            raise ValueError("Campo obrigatório")
        return str(v).strip()

    @field_validator("valor")
    @classmethod
    def valor_ok(cls, v):
        if v < 0:
            raise ValueError("Valor não pode ser negativo")
        return v


class PatrimonioResponse(BaseModel):
    id: int
    nome: str
    categoria: str
    tipo: str
    valor: float
    observacao: Optional[str] = None
    data_criacao: datetime
    model_config = {"from_attributes": True}
