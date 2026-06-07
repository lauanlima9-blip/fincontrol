from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routes import usuarios, movimentacoes, dashboard, metas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinControl API", version="1.0.0")

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

@app.get("/")
def root():
    return {"mensagem": "FinControl API esta rodando!", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
