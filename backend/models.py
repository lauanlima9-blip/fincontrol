from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean
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

    movimentacoes = relationship("Movimentacao", back_populates="usuario", cascade="all, delete-orphan")
    metas = relationship("Meta", back_populates="usuario", cascade="all, delete-orphan")
    categorias = relationship("Categoria", back_populates="usuario", cascade="all, delete-orphan")


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
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="movimentacoes", foreign_keys=[usuario_id])


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
