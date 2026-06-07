from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime, timedelta
from database import get_db
from auth import get_usuario_atual
import models

router = APIRouter(prefix='/notificacoes', tags=['Notificações'])


def _add(db, usuario_id, titulo, mensagem, tipo='geral', data_referencia=None):
    existe = db.query(models.Notification).filter(
        models.Notification.usuario_id == usuario_id,
        models.Notification.titulo == titulo,
        models.Notification.mensagem == mensagem,
        models.Notification.lida == False,
    ).first()
    if not existe:
        db.add(models.Notification(usuario_id=usuario_id, titulo=titulo, mensagem=mensagem, tipo=tipo, data_referencia=data_referencia))


def gerar_notificacoes(db: Session, usuario_id: int):
    hoje = datetime.now()
    # cartões com vencimento próximo e uso alto
    cartoes = db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id == usuario_id).all()
    for c in cartoes:
        despesas = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_id, models.Movimentacao.cartao_id == c.id, models.Movimentacao.tipo == models.TipoMovimentacao.despesa).all()
        usado = sum(float(m.valor or 0) for m in despesas)
        pct = (usado / c.limite_total * 100) if c.limite_total else 0
        if pct >= 80:
            _add(db, usuario_id, 'Limite do cartão em atenção', f'O cartão {c.nome} atingiu {pct:.0f}% do limite disponível.', 'cartao')
        venc = datetime(hoje.year, hoje.month, min(c.dia_vencimento, 28))
        if 0 <= (venc.date() - hoje.date()).days <= 3:
            _add(db, usuario_id, 'Fatura próxima do vencimento', f'A fatura do cartão {c.nome} vence em até 3 dias.', 'cartao', venc)
    # metas
    metas = db.query(models.MetaFinanceira).filter(models.MetaFinanceira.usuario_id == usuario_id).all()
    for m in metas:
        pct = (m.valor_atual / m.valor_desejado * 100) if m.valor_desejado else 0
        if 0 < pct < 50 and m.data_prevista and m.data_prevista < hoje + timedelta(days=30):
            _add(db, usuario_id, 'Meta atrasada', f'A meta {m.nome} está próxima da data prevista e ainda está em {pct:.0f}%.', 'meta', m.data_prevista)
        if pct >= 80 and pct < 100:
            _add(db, usuario_id, 'Meta quase concluída', f'Você está perto de concluir a meta {m.nome}: {pct:.0f}% alcançado.', 'meta')
    # parcelas do mês
    parcelas = db.query(models.Movimentacao).filter(models.Movimentacao.usuario_id == usuario_id, models.Movimentacao.parcelamento_id.isnot(None), models.Movimentacao.pago == False, extract('month', models.Movimentacao.data_movimentacao) == hoje.month, extract('year', models.Movimentacao.data_movimentacao) == hoje.year).all()
    if parcelas:
        _add(db, usuario_id, 'Parcelas deste mês', f'Você tem {len(parcelas)} parcela(s) em aberto este mês.', 'parcelamento')
    db.commit()


@router.get('/')
def listar(db: Session = Depends(get_db), usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    gerar_notificacoes(db, usuario_atual.id)
    itens = db.query(models.Notification).filter(models.Notification.usuario_id == usuario_atual.id).order_by(models.Notification.data_criacao.desc()).limit(50).all()
    return itens


@router.post('/{id}/lida')
def marcar_lida(id:int, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    item = db.query(models.Notification).filter(models.Notification.id == id, models.Notification.usuario_id == usuario_atual.id).first()
    if not item: raise HTTPException(404, 'Notificação não encontrada')
    item.lida = True
    db.commit()
    return {'ok': True}


@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def excluir(id:int, db:Session=Depends(get_db), usuario_atual:models.Usuario=Depends(get_usuario_atual)):
    item = db.query(models.Notification).filter(models.Notification.id == id, models.Notification.usuario_id == usuario_atual.id).first()
    if not item: raise HTTPException(404, 'Notificação não encontrada')
    db.delete(item); db.commit()
