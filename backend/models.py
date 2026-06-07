from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class TipoMovimentacao(str, enum.Enum):
    receita = "Receita"
    despesa = "Despesa"


class FrequenciaRecorrencia(str, enum.Enum):
    semanal = "Semanal"
    mensal = "Mensal"
    anual = "Anual"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    foto_perfil = Column(String(500), nullable=True)
    tema_preferido = Column(String(20), default="dark", nullable=False)
    notificacoes_ativas = Column(Boolean, default=True, nullable=False)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    codigo_2fa = Column(String(10), nullable=True)
    reset_token = Column(String(120), nullable=True, index=True)


    movimentacoes = relationship("Movimentacao", back_populates="usuario", cascade="all, delete-orphan")
    metas = relationship("Meta", back_populates="usuario", cascade="all, delete-orphan")
    categorias = relationship("Categoria", back_populates="usuario", cascade="all, delete-orphan")
    cartoes = relationship("CartaoCredito", back_populates="usuario", cascade="all, delete-orphan")
    parcelamentos = relationship("Parcelamento", back_populates="usuario", cascade="all, delete-orphan")
    insights = relationship("InsightIA", back_populates="usuario", cascade="all, delete-orphan")
    metas_planejamento = relationship("MetaFinanceira", back_populates="usuario", cascade="all, delete-orphan")
    simulacoes = relationship("SimulacaoFinanceira", back_populates="usuario", cascade="all, delete-orphan")
    notificacoes = relationship("Notification", back_populates="usuario", cascade="all, delete-orphan")
    patrimonios = relationship("PatrimonioItem", back_populates="usuario", cascade="all, delete-orphan")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    nome = Column(String(100), nullable=False)
    tipo = Column(Enum(TipoMovimentacao), nullable=True)
    padrao = Column(Boolean, default=False, nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="categorias")


class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(Enum(TipoMovimentacao), nullable=False)
    valor = Column(Float, nullable=False)
    categoria = Column(String(100), nullable=False)
    descricao = Column(String(255), nullable=True)
    data_movimentacao = Column(DateTime(timezone=True), nullable=False)
    recorrente = Column(Boolean, default=False, nullable=False)
    frequencia = Column(Enum(FrequenciaRecorrencia), nullable=True)
    proxima_data_lancamento = Column(DateTime(timezone=True), nullable=True)
    recorrencia_origem_id = Column(Integer, ForeignKey("movimentacoes.id"), nullable=True)
    cartao_id = Column(Integer, ForeignKey("cartoes_credito.id"), nullable=True)
    parcelamento_id = Column(Integer, ForeignKey("parcelamentos.id"), nullable=True)
    numero_parcela = Column(Integer, nullable=True)
    total_parcelas = Column(Integer, nullable=True)
    pago = Column(Boolean, default=False, nullable=False)
    hash_importacao = Column(String(120), nullable=True, index=True)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="movimentacoes", foreign_keys=[usuario_id])
    cartao = relationship("CartaoCredito", back_populates="movimentacoes")
    parcelamento = relationship("Parcelamento", back_populates="parcelas")


class Meta(Base):
    __tablename__ = "metas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    descricao = Column(String(255), nullable=False)
    valor_meta = Column(Float, nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="metas")



class StatusCartao(str, enum.Enum):
    ativo = "Ativo"
    inativo = "Inativo"


class CartaoCredito(Base):
    __tablename__ = "cartoes_credito"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    banco_emissor = Column(String(100), nullable=False)
    bandeira = Column(String(50), nullable=False)
    limite_total = Column(Float, nullable=False)
    dia_fechamento = Column(Integer, nullable=False)
    dia_vencimento = Column(Integer, nullable=False)
    cor = Column(String(20), default="#00e5a0", nullable=False)
    status = Column(Enum(StatusCartao), default=StatusCartao.ativo, nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="cartoes")
    movimentacoes = relationship("Movimentacao", back_populates="cartao")


class Parcelamento(Base):
    __tablename__ = "parcelamentos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cartao_id = Column(Integer, ForeignKey("cartoes_credito.id"), nullable=True)
    descricao = Column(String(255), nullable=False)
    categoria = Column(String(100), nullable=False)
    valor_total = Column(Float, nullable=False)
    quantidade_parcelas = Column(Integer, nullable=False)
    valor_parcela = Column(Float, nullable=False)
    tem_juros = Column(Boolean, default=False, nullable=False)
    juros_percentual = Column(Float, default=0, nullable=False)
    data_primeira_parcela = Column(DateTime(timezone=True), nullable=False)
    quitado = Column(Boolean, default=False, nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="parcelamentos")
    cartao = relationship("CartaoCredito")
    parcelas = relationship("Movimentacao", back_populates="parcelamento")


class InsightIA(Base):
    __tablename__ = "insights_ia"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    titulo = Column(String(180), nullable=False)
    resumo = Column(Text, nullable=False)
    indicadores = Column(Text, nullable=True)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="insights")


class MetaFinanceira(Base):
    __tablename__ = "metas_financeiras"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nome = Column(String(140), nullable=False)
    valor_desejado = Column(Float, nullable=False)
    valor_atual = Column(Float, default=0, nullable=False)
    data_prevista = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="Ativa", nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="metas_planejamento")


class SimulacaoFinanceira(Base):
    __tablename__ = "simulacoes_financeiras"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    valor_mensal = Column(Float, nullable=False)
    periodo_meses = Column(Integer, nullable=False)
    valor_final = Column(Float, nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="simulacoes")


class TipoPatrimonio(str, enum.Enum):
    ativo = "Ativo"
    passivo = "Passivo"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String(180), nullable=False)
    mensagem = Column(Text, nullable=False)
    lida = Column(Boolean, default=False, nullable=False)
    tipo = Column(String(40), default="geral", nullable=False)
    data_referencia = Column(DateTime(timezone=True), nullable=True)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="notificacoes")


class PatrimonioItem(Base):
    __tablename__ = "patrimonio_itens"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nome = Column(String(140), nullable=False)
    categoria = Column(String(80), nullable=False)
    tipo = Column(Enum(TipoPatrimonio), nullable=False)
    valor = Column(Float, nullable=False)
    observacao = Column(String(255), nullable=True)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="patrimonios")
