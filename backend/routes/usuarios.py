from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import hash_senha, verificar_senha, criar_token, get_usuario_atual
from datetime import timedelta

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


@router.post("/cadastro", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def cadastrar(usuario_data: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    existente = db.query(models.Usuario).filter(models.Usuario.email == usuario_data.email).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já cadastrado"
        )
    novo = models.Usuario(
        nome=usuario_data.nome,
        email=usuario_data.email,
        senha_hash=hash_senha(usuario_data.senha),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    token = criar_token({"sub": str(novo.id)})
    return {"access_token": token, "token_type": "bearer", "usuario": novo}


@router.post("/login", response_model=schemas.Token)
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )
    token = criar_token({"sub": str(usuario.id)})
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}


@router.get("/me", response_model=schemas.UsuarioResponse)
def perfil(usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    return usuario_atual


@router.put("/me", response_model=schemas.UsuarioResponse)
def atualizar_perfil(
    dados: schemas.PerfilUpdate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual)
):
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
