from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from migrations_runtime import aplicar_migracoes_simples
from routes import usuarios, movimentacoes, dashboard, metas, categorias

Base.metadata.create_all(bind=engine)
aplicar_migracoes_simples()

app = FastAPI(title="Pinnacle Finance API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(movimentacoes.router)
app.include_router(dashboard.router)
app.include_router(metas.router)
app.include_router(categorias.router)

@app.get("/")
def root():
    return {"mensagem": "Pinnacle Finance API está rodando!", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
