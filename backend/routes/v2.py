from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime
import json, csv, io
from database import get_db
from auth import get_usuario_atual, hash_senha, verificar_senha
import models, schemas
from routes.notificacoes import gerar_notificacoes

router = APIRouter(prefix='/v2', tags=['Pinnacle Finance v2'])


def fmt_event(nome, categoria, valor, data, tipo):
    return {'nome': nome, 'categoria': categoria, 'valor': float(valor or 0), 'data': data.isoformat() if data else None, 'tipo': tipo}

@router.get('/calendario')
def calendario(mes:int|None=None, ano:int|None=None, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    hoje=datetime.now(); mes=mes or hoje.month; ano=ano or hoje.year
    eventos=[]
    movs=db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id, extract('month', models.Movimentacao.data_movimentacao)==mes, extract('year', models.Movimentacao.data_movimentacao)==ano).all()
    for m in movs:
        eventos.append(fmt_event(m.descricao or m.categoria, m.categoria, m.valor, m.data_movimentacao, 'Receita' if m.tipo.value=='Receita' else 'Despesa'))
    for c in db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id==usuario_atual.id).all():
        eventos.append(fmt_event(f'Fechamento {c.nome}', 'Cartão', 0, datetime(ano, mes, min(c.dia_fechamento,28)), 'Cartão'))
        eventos.append(fmt_event(f'Vencimento {c.nome}', 'Cartão', 0, datetime(ano, mes, min(c.dia_vencimento,28)), 'Cartão'))
    metas=db.query(models.MetaFinanceira).filter(models.MetaFinanceira.usuario_id==usuario_atual.id).all()
    for meta in metas:
        if meta.data_prevista and meta.data_prevista.month==mes and meta.data_prevista.year==ano:
            eventos.append(fmt_event(f'Meta {meta.nome}', 'Meta', max(0, meta.valor_desejado-meta.valor_atual), meta.data_prevista, 'Meta'))
    eventos=sorted(eventos, key=lambda e:e['data'] or '')
    return {'mes':mes,'ano':ano,'eventos':eventos}

@router.get('/score')
def score(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    movs=db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id).all()
    receitas=sum(m.valor for m in movs if m.tipo.value=='Receita')
    despesas=sum(m.valor for m in movs if m.tipo.value=='Despesa')
    saldo=receitas-despesas
    score=100
    if receitas>0:
        taxa=despesas/receitas
        if taxa>1: score-=35
        elif taxa>.8: score-=20
        elif taxa>.6: score-=10
    else:
        score-=20 if despesas else 0
    cartoes=db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id==usuario_atual.id).all()
    limite=sum(c.limite_total for c in cartoes)
    gasto_cartao=sum(m.valor for m in movs if m.cartao_id and m.tipo.value=='Despesa')
    if limite and gasto_cartao/limite>.8: score-=20
    parcelas_abertas=db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id, models.Movimentacao.parcelamento_id.isnot(None), models.Movimentacao.pago==False).count()
    if parcelas_abertas>10: score-=10
    metas=db.query(models.MetaFinanceira).filter(models.MetaFinanceira.usuario_id==usuario_atual.id).all()
    if metas:
        progresso=sum((m.valor_atual/m.valor_desejado*100) if m.valor_desejado else 0 for m in metas)/len(metas)
        if progresso>=50: score+=5
    if saldo<0: score-=15
    score=max(0,min(100,round(score)))
    status='Excelente' if score>=90 else 'Bom' if score>=70 else 'Atenção' if score>=50 else 'Crítico'
    return {'score':score,'status':status,'receitas':receitas,'despesas':despesas,'saldo':saldo,'uso_cartao':gasto_cartao,'limite_cartao':limite,'parcelas_abertas':parcelas_abertas}

@router.get('/patrimonio')
def listar_patrimonio(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    itens=db.query(models.PatrimonioItem).filter(models.PatrimonioItem.usuario_id==usuario_atual.id).order_by(models.PatrimonioItem.data_criacao.desc()).all()
    ativos=sum(i.valor for i in itens if i.tipo.value=='Ativo')
    passivos=sum(i.valor for i in itens if i.tipo.value=='Passivo')
    return {'itens':itens,'ativos':ativos,'passivos':passivos,'patrimonio_liquido':ativos-passivos}

@router.post('/patrimonio', status_code=201)
def criar_patrimonio(dados:schemas.PatrimonioCreate, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    tipo = models.TipoPatrimonio.ativo if dados.tipo == 'Ativo' else models.TipoPatrimonio.passivo
    item=models.PatrimonioItem(usuario_id=usuario_atual.id,nome=dados.nome,categoria=dados.categoria,tipo=tipo,valor=dados.valor,observacao=dados.observacao)
    db.add(item); db.commit(); db.refresh(item); return item

@router.put('/patrimonio/{id}')
def atualizar_patrimonio(id:int,dados:schemas.PatrimonioCreate,db:Session=Depends(get_db),usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    item=db.query(models.PatrimonioItem).filter(models.PatrimonioItem.id==id, models.PatrimonioItem.usuario_id==usuario_atual.id).first()
    if not item: raise HTTPException(404,'Item não encontrado')
    item.nome=dados.nome; item.categoria=dados.categoria; item.tipo=models.TipoPatrimonio.ativo if dados.tipo=='Ativo' else models.TipoPatrimonio.passivo; item.valor=dados.valor; item.observacao=dados.observacao
    db.commit(); db.refresh(item); return item

@router.delete('/patrimonio/{id}', status_code=204)
def excluir_patrimonio(id:int,db:Session=Depends(get_db),usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    item=db.query(models.PatrimonioItem).filter(models.PatrimonioItem.id==id, models.PatrimonioItem.usuario_id==usuario_atual.id).first()
    if not item: raise HTTPException(404,'Item não encontrado')
    db.delete(item); db.commit()

@router.get('/backup')
def backup(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    def mov(m): return {'tipo':m.tipo.value,'valor':m.valor,'categoria':m.categoria,'descricao':m.descricao,'data_movimentacao':m.data_movimentacao.isoformat()}
    data={
      'usuario': {'nome':usuario_atual.nome,'email':usuario_atual.email},
      'movimentacoes':[mov(m) for m in db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id).all()],
      'cartoes':[{'nome':c.nome,'banco_emissor':c.banco_emissor,'bandeira':c.bandeira,'limite_total':c.limite_total,'dia_fechamento':c.dia_fechamento,'dia_vencimento':c.dia_vencimento,'cor':c.cor,'status':c.status.value} for c in db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id==usuario_atual.id).all()],
      'metas':[{'nome':m.nome,'valor_desejado':m.valor_desejado,'valor_atual':m.valor_atual,'data_prevista':m.data_prevista.isoformat() if m.data_prevista else None} for m in db.query(models.MetaFinanceira).filter(models.MetaFinanceira.usuario_id==usuario_atual.id).all()],
      'patrimonio':[{'nome':p.nome,'categoria':p.categoria,'tipo':p.tipo.value,'valor':p.valor,'observacao':p.observacao} for p in db.query(models.PatrimonioItem).filter(models.PatrimonioItem.usuario_id==usuario_atual.id).all()]
    }
    return data

@router.get('/backup/excel')
def backup_csv(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    out=io.StringIO(); w=csv.writer(out); w.writerow(['tipo','valor','categoria','descricao','data'])
    for m in db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id==usuario_atual.id).all(): w.writerow([m.tipo.value,m.valor,m.categoria,m.descricao,m.data_movimentacao.isoformat()])
    return Response(out.getvalue(), media_type='text/csv', headers={'Content-Disposition':'attachment; filename=pinnacle-backup.csv'})

@router.post('/backup/importar')
def importar_backup(payload:dict, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    criados=0
    for m in payload.get('movimentacoes',[]):
        try:
            db.add(models.Movimentacao(usuario_id=usuario_atual.id,tipo=models.TipoMovimentacao.receita if m.get('tipo')=='Receita' else models.TipoMovimentacao.despesa,valor=float(m.get('valor',0)),categoria=m.get('categoria','Outros'),descricao=m.get('descricao'),data_movimentacao=datetime.fromisoformat(m.get('data_movimentacao') or m.get('data')))); criados+=1
        except Exception: pass
    db.commit(); return {'importados':criados}

@router.get('/notificacoes/resumo')
def notificacoes_resumo(db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    gerar_notificacoes(db, usuario_atual.id)
    total=db.query(models.Notification).filter(models.Notification.usuario_id==usuario_atual.id, models.Notification.lida==False).count()
    return {'nao_lidas':total}
