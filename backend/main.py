from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routes import usuarios, movimentacoes, dashboard

# Cria tabelas automaticamente
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinControl API",
    description="API de Controle Financeiro Pessoal",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(movimentacoes.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"mensagem": "FinControl API está rodando!", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
