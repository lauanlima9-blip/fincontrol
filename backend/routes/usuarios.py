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
    dados: dict,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual)
):
    if "nome" in dados:
        usuario_atual.nome = dados["nome"]
    db.commit()
    db.refresh(usuario_atual)
    return usuario_atual
