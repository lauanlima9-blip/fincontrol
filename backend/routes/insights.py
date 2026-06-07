from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract
from collections import defaultdict
from datetime import datetime
import json
from database import get_db
from auth import get_usuario_atual
import models

router = APIRouter(prefix="/insights", tags=["Insights IA"])

def _periodo(db, usuario_id, mes, ano):
    return db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_id, extract('month', models.Movimentacao.data_movimentacao)==mes, extract('year', models.Movimentacao.data_movimentacao)==ano).all()

@router.get("/")
def historico(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    itens=db.query(models.InsightIA).filter(models.InsightIA.usuario_id==usuario_atual.id).order_by(models.InsightIA.data_criacao.desc()).all()
    return [{"id":i.id,"mes":i.mes,"ano":i.ano,"titulo":i.titulo,"resumo":i.resumo,"indicadores":json.loads(i.indicadores or '{}'),"data_criacao":i.data_criacao} for i in itens]

@router.post("/gerar")
def gerar(mes:int=Query(...,ge=1,le=12), ano:int=Query(...,ge=2000), db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    movs=_periodo(db, usuario_atual.id, mes, ano)
    mes_ant, ano_ant=(12, ano-1) if mes==1 else (mes-1, ano)
    movs_ant=_periodo(db, usuario_atual.id, mes_ant, ano_ant)
    receitas=sum(m.valor for m in movs if m.tipo.value=='Receita'); despesas=sum(m.valor for m in movs if m.tipo.value=='Despesa')
    receitas_ant=sum(m.valor for m in movs_ant if m.tipo.value=='Receita'); despesas_ant=sum(m.valor for m in movs_ant if m.tipo.value=='Despesa')
    por_cat=defaultdict(float)
    for m in movs:
        if m.tipo.value=='Despesa': por_cat[m.categoria]+=m.valor
    maior=max(por_cat.items(), key=lambda x:x[1], default=('Sem gastos',0))
    saldo=receitas-despesas; saldo_ant=receitas_ant-despesas_ant
    var_saldo=((saldo-saldo_ant)/abs(saldo_ant)*100) if saldo_ant else 0
    economia_lazer=por_cat.get('Lazer',0)*0.15
    economia_maior=maior[1]*0.15
    metas=db.query(models.Meta).filter(models.Meta.usuario_id==usuario_atual.id, models.Meta.mes==mes, models.Meta.ano==ano).all()
    meta_msg='Nenhuma meta financeira cadastrada para este mês.'
    if metas:
        meta=metas[0]; pct=(despesas/meta.valor_meta*100) if meta.valor_meta else 0
        meta_msg='Você está próximo de atingir sua meta financeira.' if pct>=80 and pct<=100 else ('Sua meta foi ultrapassada.' if pct>100 else 'Você ainda tem boa margem dentro da sua meta financeira.')
    cartoes=db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id==usuario_atual.id).count()
    parcelamentos=db.query(models.Parcelamento).filter(models.Parcelamento.usuario_id==usuario_atual.id, models.Parcelamento.quitado==False).count()
    linhas=[
      f"Sua categoria de maior gasto foi {maior[0]}, com R$ {maior[1]:,.2f}.",
      f"Seu saldo disponível {'aumentou' if var_saldo>=0 else 'reduziu'} {abs(var_saldo):.1f}% em relação ao mês anterior.",
      f"Se reduzir seus gastos com {'Lazer' if por_cat.get('Lazer',0)>0 else maior[0]} em 15%, poderá economizar aproximadamente R$ {(economia_lazer or economia_maior):,.2f} por mês.",
      meta_msg,
      f"Você possui {cartoes} cartão(ões) cadastrado(s) e {parcelamentos} parcelamento(s) ativo(s)."
    ]
    indicadores={"receitas":receitas,"despesas":despesas,"saldo":saldo,"maior_categoria":maior[0],"valor_maior_categoria":maior[1],"variacao_saldo_percentual":var_saldo,"economia_sugerida":economia_lazer or economia_maior}
    insight=models.InsightIA(usuario_id=usuario_atual.id,mes=mes,ano=ano,titulo=f"Análise financeira {mes:02d}/{ano}",resumo='\n'.join(linhas),indicadores=json.dumps(indicadores, ensure_ascii=False))
    db.add(insight); db.commit(); db.refresh(insight)
    return {"id":insight.id,"mes":mes,"ano":ano,"titulo":insight.titulo,"resumo":insight.resumo,"indicadores":indicadores,"data_criacao":insight.data_criacao}


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: int, db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    insight = db.query(models.InsightIA).filter(
        models.InsightIA.id == id,
        models.InsightIA.usuario_id == usuario_atual.id
    ).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Análise não encontrada")
    db.delete(insight)
    db.commit()
