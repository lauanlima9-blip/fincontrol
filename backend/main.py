from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from migrations_runtime import aplicar_migracoes_simples
from routes import usuarios, movimentacoes, dashboard, metas, categorias, cartoes, parcelamentos, insights, importacao, planejamento, notificacoes, v2, admin

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
app.include_router(cartoes.router)
app.include_router(parcelamentos.router)
app.include_router(insights.router)
app.include_router(importacao.router)
app.include_router(planejamento.router)
app.include_router(notificacoes.router)
app.include_router(v2.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"mensagem": "Pinnacle Finance API está rodando!", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
