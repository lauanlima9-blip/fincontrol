from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
import models, schemas
from auth import get_usuario_atual

router = APIRouter(prefix="/categorias", tags=["Categorias"])

CATEGORIAS_PADRAO = {
    "Receita": ["Salário", "Freelance", "Investimentos", "Vendas", "Aluguel", "Outros"],
    "Despesa": ["Alimentação", "Moradia", "Transporte", "Saúde", "Educação", "Lazer", "Roupas", "Tecnologia", "Assinaturas", "Cartão de Crédito", "Empréstimo", "Outros"],
}


def garantir_categorias_padrao(db: Session):
    for tipo, nomes in CATEGORIAS_PADRAO.items():
        tipo_enum = models.TipoMovimentacao.receita if tipo == "Receita" else models.TipoMovimentacao.despesa
        for nome in nomes:
            existe = db.query(models.Categoria).filter(
                models.Categoria.usuario_id.is_(None),
                models.Categoria.nome == nome,
                models.Categoria.tipo == tipo_enum,
                models.Categoria.padrao == True,
            ).first()
            if not existe:
                db.add(models.Categoria(nome=nome, tipo=tipo_enum, padrao=True))
    db.commit()


@router.get("/", response_model=list[schemas.CategoriaResponse])
def listar(
    tipo: schemas.TipoMovimentacao | None = None,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    garantir_categorias_padrao(db)
    q = db.query(models.Categoria).filter(or_(models.Categoria.usuario_id == usuario_atual.id, models.Categoria.usuario_id.is_(None)))
    if tipo:
        q = q.filter(or_(models.Categoria.tipo == tipo, models.Categoria.tipo.is_(None)))
    return q.order_by(models.Categoria.padrao.desc(), models.Categoria.nome.asc()).all()


@router.post("/", response_model=schemas.CategoriaResponse, status_code=status.HTTP_201_CREATED)
def criar(
    dados: schemas.CategoriaCreate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    existe = db.query(models.Categoria).filter(
        models.Categoria.usuario_id == usuario_atual.id,
        models.Categoria.nome.ilike(dados.nome),
        models.Categoria.tipo == dados.tipo,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Você já possui uma categoria com esse nome")
    categoria = models.Categoria(**dados.model_dump(), usuario_id=usuario_atual.id, padrao=False)
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.put("/{id}", response_model=schemas.CategoriaResponse)
def atualizar(
    id: int,
    dados: schemas.CategoriaUpdate,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == id, models.Categoria.usuario_id == usuario_atual.id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada ou não editável")
    payload = dados.model_dump(exclude_unset=True)
    for campo, valor in payload.items():
        setattr(categoria, campo, valor)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    id: int,
    db: Session = Depends(get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == id, models.Categoria.usuario_id == usuario_atual.id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada ou não editável")
    usada = db.query(models.Movimentacao).filter(
        models.Movimentacao.usuario_id == usuario_atual.id,
        models.Movimentacao.categoria == categoria.nome,
    ).first()
    if usada:
        raise HTTPException(status_code=400, detail="Categoria já usada em movimentações. Renomeie ou mantenha para preservar o histórico.")
    db.delete(categoria)
    db.commit()
