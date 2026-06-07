from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import hash_senha, verificar_senha, criar_token, get_usuario_atual
from datetime import datetime, timedelta, timezone
import secrets
import random
import hashlib
from email_utils import enviar_recuperacao_senha, enviar_codigo_2fa

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


def _token_response(usuario: models.Usuario):
    token = criar_token({"sub": str(usuario.id)})
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}


def _gerar_codigo_2fa():
    return str(random.randint(100000, 999999))


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _agora():
    return datetime.now(timezone.utc)


@router.post("/cadastro", status_code=status.HTTP_201_CREATED)
def cadastrar(usuario_data: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    existente = db.query(models.Usuario).filter(models.Usuario.email == usuario_data.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    novo = models.Usuario(nome=usuario_data.nome, email=usuario_data.email, senha_hash=hash_senha(usuario_data.senha))
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return _token_response(novo)


@router.post("/login")
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    if getattr(usuario, "two_factor_enabled", False):
        if not dados.codigo_2fa:
            usuario.codigo_2fa = _gerar_codigo_2fa()
            usuario.codigo_2fa_expira_em = _agora() + timedelta(minutes=10)
            db.commit()
            enviar_codigo_2fa(usuario.email, usuario.codigo_2fa)
            return {"requires_2fa": True, "mensagem": "Código de verificação enviado para o e-mail cadastrado."}
        if not usuario.codigo_2fa or dados.codigo_2fa != usuario.codigo_2fa:
            raise HTTPException(status_code=401, detail="Código de verificação inválido")
        if usuario.codigo_2fa_expira_em:
            expira = usuario.codigo_2fa_expira_em
            if expira.tzinfo is None:
                expira = expira.replace(tzinfo=timezone.utc)
            if expira < _agora():
                usuario.codigo_2fa = None
                usuario.codigo_2fa_expira_em = None
                db.commit()
                raise HTTPException(status_code=401, detail="Código expirado. Solicite login novamente.")
        usuario.codigo_2fa = None
        usuario.codigo_2fa_expira_em = None
        db.commit()

    return _token_response(usuario)


@router.post("/esqueci-senha")
def esqueci_senha(dados: schemas.EsqueciSenhaRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    # Resposta neutra para não revelar se o e-mail existe.
    mensagem = "Se este e-mail estiver cadastrado, enviaremos instruções de recuperação."
    if not usuario:
        return {"mensagem": mensagem}
    token = secrets.token_urlsafe(48)
    usuario.reset_token = _hash_token(token)
    usuario.reset_token_expira_em = _agora() + timedelta(minutes=30)
    db.commit()
    enviar_recuperacao_senha(usuario.email, token)
    return {"mensagem": mensagem}


@router.post("/redefinir-senha")
def redefinir_senha(dados: schemas.RedefinirSenhaRequest, db: Session = Depends(get_db)):
    token_hash = _hash_token(dados.token)
    usuario = db.query(models.Usuario).filter(models.Usuario.reset_token == token_hash).first()
    if not usuario:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    if usuario.reset_token_expira_em:
        expira = usuario.reset_token_expira_em
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if expira < _agora():
            usuario.reset_token = None
            usuario.reset_token_expira_em = None
            db.commit()
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    usuario.senha_hash = hash_senha(dados.nova_senha)
    usuario.reset_token = None
    usuario.reset_token_expira_em = None
    usuario.codigo_2fa = None
    usuario.codigo_2fa_expira_em = None
    db.commit()
    return {"mensagem": "Senha redefinida com sucesso"}


@router.get("/me", response_model=schemas.UsuarioResponse)
def perfil(usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    return usuario_atual


@router.put("/me", response_model=schemas.UsuarioResponse)
def atualizar_perfil(dados: schemas.PerfilUpdate, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    payload = dados.model_dump(exclude_unset=True)
    if payload.get("nome"):
        usuario_atual.nome = payload["nome"].strip()
    if payload.get("email") and payload["email"] != usuario_atual.email:
        existente = db.query(models.Usuario).filter(models.Usuario.email == payload["email"]).first()
        if existente:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")
        usuario_atual.email = payload["email"]
    if "foto_perfil" in payload:
        usuario_atual.foto_perfil = payload.get("foto_perfil")
    if "tema_preferido" in payload and payload.get("tema_preferido") in ["dark", "light"]:
        usuario_atual.tema_preferido = payload.get("tema_preferido")
    if "notificacoes_ativas" in payload:
        usuario_atual.notificacoes_ativas = bool(payload.get("notificacoes_ativas"))
    if "two_factor_enabled" in payload:
        usuario_atual.two_factor_enabled = bool(payload.get("two_factor_enabled"))
        usuario_atual.codigo_2fa = None
        usuario_atual.codigo_2fa_expira_em = None
    if payload.get("nova_senha"):
        if not verificar_senha(payload.get("senha_atual", ""), usuario_atual.senha_hash):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        usuario_atual.senha_hash = hash_senha(payload["nova_senha"])
    db.commit()
    db.refresh(usuario_atual)
    return usuario_atual


@router.delete("/me", status_code=204)
def excluir_conta(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    db.delete(usuario_atual)
    db.commit()
