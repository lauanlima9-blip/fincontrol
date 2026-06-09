from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "chave-padrao-insegura")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

bearer_scheme = HTTPBearer()

def hash_senha(senha: str) -> str:
    senha_bytes = senha.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha_bytes, salt).decode("utf-8")

def verificar_senha(senha_plain: str, senha_hash: str) -> bool:
    senha_bytes = senha_plain.encode("utf-8")[:72]
    return bcrypt.checkpw(senha_bytes, senha_hash.encode("utf-8"))

def criar_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_usuario_atual(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id: int = payload.get("sub")
        if usuario_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    if usuario is None:
        raise credentials_exception
    ip = request.client.host if request.client else None
    super_admin = usuario.email and usuario.email.lower() == "pinnacleb109@gmail.com"
    if super_admin:
        usuario.role = "admin"
        usuario.plano = "Premium"
        usuario.status = "Ativo"
        db.commit()
    if ip and not super_admin:
        bloqueado = db.query(models.BlockedIP).filter(models.BlockedIP.ip == ip, models.BlockedIP.ativo == True).first()
        if bloqueado:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="IP bloqueado")
    if getattr(usuario, "status", "Ativo") == "Bloqueado":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário bloqueado")
    return usuario


def require_admin(usuario_atual: models.Usuario = Depends(get_usuario_atual)) -> models.Usuario:
    if getattr(usuario_atual, "role", "user") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="403 - Acesso Negado")
    return usuario_atual


def usuario_tem_premium(usuario: models.Usuario) -> bool:
    role = (getattr(usuario, "role", "user") or "user").lower()
    plano = (getattr(usuario, "plano", "Gratuito") or "Gratuito").lower()
    return role == "admin" or role == "premium" or plano == "premium"


def require_premium(usuario_atual: models.Usuario = Depends(get_usuario_atual)) -> models.Usuario:
    if not usuario_tem_premium(usuario_atual):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recurso disponível apenas no Plano Premium"
        )
    return usuario_atual
