from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta, timezone
from database import get_db
import models
from auth import require_admin, criar_token, hash_senha

router = APIRouter(prefix="/admin", tags=["Administração"])

ADMIN_EMAIL = "pinnacleb109@gmail.com"
PREMIUM_DEFAULT = 50.0


def now():
    return datetime.now(timezone.utc)


def log(db, admin, acao, descricao, request=None, user_id=None):
    db.add(models.SystemLog(user_id=user_id or admin.id, acao=acao, descricao=descricao,
                            ip=request.client.host if request and request.client else None,
                            navegador=request.headers.get("user-agent") if request else None))


def ensure_defaults(db: Session):
    admin = db.query(models.Usuario).filter(func.lower(models.Usuario.email) == ADMIN_EMAIL).first()
    if admin:
        admin.role = "admin"
        admin.plano = "Premium"
        if not admin.status:
            admin.status = "Ativo"
    if not db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.nome == "Gratuito").first():
        db.add(models.SubscriptionPlan(nome="Gratuito", valor=0, beneficios="Dashboard básico; Movimentações; Metas financeiras", status="Ativo"))
    if not db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.nome == "Premium").first():
        db.add(models.SubscriptionPlan(nome="Premium", valor=PREMIUM_DEFAULT, beneficios="Cartões; Parcelamentos; Insights IA; Relatórios; Importação; Suporte", status="Ativo"))
    defaults = {
        "nome_plataforma": "Pinnacle Finance",
        "instagram": "https://www.instagram.com/pinnacle.bi/",
        "email_suporte": "pinnacleb109@gmail.com",
        "tema_padrao": "dark",
        "valor_plano_premium": str(PREMIUM_DEFAULT),
        "modo_manutencao": "false",
        "funcionalidades_ativas": "cartoes,parcelamentos,insights,importacao,metas,relatorios",
    }
    for k, v in defaults.items():
        if not db.query(models.SystemSetting).filter(models.SystemSetting.chave == k).first():
            db.add(models.SystemSetting(chave=k, valor=v))
    db.commit()


@router.get("/dashboard")
def dashboard_admin(db: Session = Depends(get_db), admin=Depends(require_admin)):
    ensure_defaults(db)
    limite = now() - timedelta(days=30)
    total_usuarios = db.query(models.Usuario).count()
    ativos = db.query(models.Usuario).filter(models.Usuario.status != "Bloqueado").count()
    gratuitos = db.query(models.Usuario).filter(models.Usuario.plano == "Gratuito").count()
    premium = db.query(models.Usuario).filter(models.Usuario.plano == "Premium").count()
    premium_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.nome == "Premium").first()
    valor = premium_plan.valor if premium_plan else PREMIUM_DEFAULT
    monthly = premium * valor
    def count(model): return db.query(model).count()
    usuarios_mes = db.query(extract('year', models.Usuario.data_criacao).label('ano'), extract('month', models.Usuario.data_criacao).label('mes'), func.count(models.Usuario.id)).group_by('ano','mes').order_by('ano','mes').all()
    receita_mes = [{"mes": f"{int(a)}-{int(m):02d}", "valor": int(q) * valor} for a,m,q in usuarios_mes]
    ultimos = db.query(models.Usuario).order_by(models.Usuario.ultimo_acesso.desc().nullslast()).limit(8).all()
    return {
        "indicadores": {
            "total_usuarios": total_usuarios,
            "usuarios_ativos": ativos,
            "usuarios_gratuitos": gratuitos,
            "usuarios_premium": premium,
            "receita_mensal_estimada": monthly,
            "receita_anual_estimada": monthly * 12,
            "total_movimentacoes": count(models.Movimentacao),
            "total_cartoes": count(models.CartaoCredito),
            "total_metas": count(models.MetaFinanceira) + count(models.Meta),
            "total_parcelamentos_ativos": db.query(models.Parcelamento).filter(models.Parcelamento.quitado == False).count(),
            "novos_usuarios_30_dias": db.query(models.Usuario).filter(models.Usuario.data_criacao >= limite).count(),
        },
        "usuarios_por_mes": [{"mes": f"{int(a)}-{int(m):02d}", "total": int(q)} for a,m,q in usuarios_mes],
        "receita_por_mes": receita_mes,
        "crescimento": [{"mes": f"{int(a)}-{int(m):02d}", "usuarios": int(q), "receita": int(q) * valor} for a,m,q in usuarios_mes],
        "ultimos_acessos": [{"id": u.id, "nome": u.nome, "email": u.email, "ultimo_acesso": u.ultimo_acesso, "ip": u.ultimo_ip} for u in ultimos]
    }


@router.get("/usuarios")
def listar_usuarios(db: Session = Depends(get_db), admin=Depends(require_admin)):
    ensure_defaults(db)
    users = db.query(models.Usuario).order_by(models.Usuario.data_criacao.desc()).all()
    return [{"id": u.id, "nome": u.nome, "email": u.email, "plano": u.plano, "role": u.role, "data_cadastro": u.data_criacao, "ultimo_acesso": u.ultimo_acesso, "status": u.status} for u in users]


@router.get("/usuarios/{user_id}")
def obter_usuario(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    return {"id": u.id, "nome": u.nome, "email": u.email, "plano": u.plano, "role": u.role, "status": u.status, "data_cadastro": u.data_criacao, "ultimo_acesso": u.ultimo_acesso, "movimentacoes": len(u.movimentacoes), "cartoes": len(u.cartoes), "metas": len(u.metas_planejamento) + len(u.metas)}


@router.put("/usuarios/{user_id}")
def editar_usuario(user_id: int, dados: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    for campo in ["nome", "email", "plano", "status"]:
        if campo in dados and dados[campo] is not None:
            setattr(u, campo, dados[campo])
    if "role" in dados and dados["role"] in ["admin", "premium", "user"]:
        u.role = dados["role"]
    log(db, admin, "Admin - Editar usuário", f"Usuário {u.email} atualizado", request, u.id)
    db.commit(); db.refresh(u)
    return {"mensagem": "Usuário atualizado", "usuario": {"id": u.id, "nome": u.nome, "email": u.email, "role": u.role, "plano": u.plano, "status": u.status}}


@router.post("/usuarios/{user_id}/acao")
def acao_usuario(user_id: int, dados: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    acao = dados.get("acao")
    if acao == "promover_admin": u.role = "admin"
    elif acao == "remover_admin": u.role = "premium" if u.plano == "Premium" else "user"
    elif acao == "bloquear": u.status = "Bloqueado"
    elif acao == "desbloquear": u.status = "Ativo"
    elif acao == "alterar_plano": u.plano = dados.get("plano", u.plano); u.role = "premium" if u.plano == "Premium" and u.role != "admin" else u.role
    else: raise HTTPException(400, "Ação inválida")
    log(db, admin, f"Admin - {acao}", f"Ação aplicada no usuário {u.email}", request, u.id)
    db.commit()
    return {"mensagem": "Ação realizada com sucesso"}


@router.delete("/usuarios/{user_id}")
def excluir_usuario(user_id: int, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    if u.id == admin.id: raise HTTPException(400, "Você não pode excluir seu próprio usuário admin")
    log(db, admin, "Admin - Excluir usuário", f"Usuário {u.email} excluído", request, u.id)
    db.delete(u); db.commit()
    return {"mensagem": "Usuário excluído"}


@router.post("/usuarios/{user_id}/impersonar")
def impersonar(user_id: int, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not u: raise HTTPException(404, "Usuário não encontrado")
    token = criar_token({"sub": str(u.id), "impersonated_by": str(admin.id)})
    log(db, admin, "Acesso administrativo", f"Admin entrou como {u.email}", request, u.id)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "usuario": u, "admin": {"id": admin.id, "nome": admin.nome, "email": admin.email}}


@router.get("/planos")
def planos(db: Session = Depends(get_db), admin=Depends(require_admin)):
    ensure_defaults(db)
    return db.query(models.SubscriptionPlan).order_by(models.SubscriptionPlan.valor).all()


@router.post("/planos")
def criar_plano(dados: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    plano = models.SubscriptionPlan(nome=dados.get("nome"), valor=float(dados.get("valor", 0)), beneficios=dados.get("beneficios", ""), status=dados.get("status", "Ativo"))
    db.add(plano); log(db, admin, "Criar plano", f"Plano {plano.nome} criado", request); db.commit(); db.refresh(plano)
    return plano


@router.put("/planos/{plan_id}")
def editar_plano(plan_id: int, dados: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    plano = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plano: raise HTTPException(404, "Plano não encontrado")
    for c in ["nome", "beneficios", "status"]:
        if c in dados: setattr(plano, c, dados[c])
    if "valor" in dados: plano.valor = float(dados["valor"])
    log(db, admin, "Editar plano", f"Plano {plano.nome} atualizado", request); db.commit(); db.refresh(plano)
    return plano


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), admin=Depends(require_admin)):
    ensure_defaults(db)
    total = max(db.query(models.Usuario).count(), 1)
    ativos_dia = db.query(models.Usuario).filter(models.Usuario.ultimo_acesso >= now() - timedelta(days=1)).count()
    ativos_mes = db.query(models.Usuario).filter(models.Usuario.ultimo_acesso >= now() - timedelta(days=30)).count()
    novos = db.query(models.Usuario).filter(models.Usuario.data_criacao >= now() - timedelta(days=30)).count()
    return {
        "usuarios_ativos_dia": ativos_dia,
        "usuarios_ativos_mes": ativos_mes,
        "taxa_retencao": round((ativos_mes / total) * 100, 2),
        "taxa_crescimento": round((novos / total) * 100, 2),
        "tempo_medio_uso": "Métrica preparada para integração com tracking de sessão",
        "paginas_mais_acessadas": ["Dashboard", "Movimentações", "Cartões", "Parcelamentos", "Relatórios"],
        "funcionalidades_mais_utilizadas": ["Cadastro de despesas", "Cartões", "Metas", "Importação", "Insights IA"],
        "origem_usuarios": ["Orgânico", "Instagram", "Indicação", "Direto"]
    }


@router.get("/logs")
def logs(q: str | None = None, acao: str | None = None, data: str | None = None, db: Session = Depends(get_db), admin=Depends(require_admin)):
    query = db.query(models.SystemLog)
    if acao: query = query.filter(models.SystemLog.acao.ilike(f"%{acao}%"))
    if q: query = query.join(models.Usuario, models.Usuario.id == models.SystemLog.user_id, isouter=True).filter((models.Usuario.email.ilike(f"%{q}%")) | (models.Usuario.nome.ilike(f"%{q}%")) | (models.SystemLog.descricao.ilike(f"%{q}%")))
    if data:
        d = datetime.fromisoformat(data)
        query = query.filter(models.SystemLog.created_at >= d, models.SystemLog.created_at < d + timedelta(days=1))
    rows = query.order_by(models.SystemLog.created_at.desc()).limit(300).all()
    return [{"id": l.id, "user_id": l.user_id, "acao": l.acao, "descricao": l.descricao, "ip": l.ip, "dispositivo": l.dispositivo, "navegador": l.navegador, "created_at": l.created_at} for l in rows]


@router.get("/configuracoes")
def configuracoes(db: Session = Depends(get_db), admin=Depends(require_admin)):
    ensure_defaults(db)
    return {s.chave: s.valor for s in db.query(models.SystemSetting).all()}


@router.put("/configuracoes")
def salvar_configuracoes(dados: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ensure_defaults(db)
    for k, v in dados.items():
        item = db.query(models.SystemSetting).filter(models.SystemSetting.chave == k).first()
        if item: item.valor = str(v)
        else: db.add(models.SystemSetting(chave=k, valor=str(v)))
    log(db, admin, "Configurações do Sistema", "Configurações atualizadas", request); db.commit()
    return {"mensagem": "Configurações salvas"}


@router.get("/seguranca")
def seguranca(db: Session = Depends(get_db), admin=Depends(require_admin)):
    historico = db.query(models.LoginHistory).order_by(models.LoginHistory.created_at.desc()).limit(200).all()
    ips = db.query(models.BlockedIP).order_by(models.BlockedIP.created_at.desc()).all()
    return {"historico_login": [{"id": h.id, "user_id": h.user_id, "ip": h.ip, "dispositivo": h.dispositivo, "navegador": h.navegador, "ativo": h.ativo, "created_at": h.created_at} for h in historico], "ips_bloqueados": ips}


@router.post("/seguranca/encerrar-sessao/{login_id}")
def encerrar_sessao(login_id: int, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    h = db.query(models.LoginHistory).filter(models.LoginHistory.id == login_id).first()
    if not h: raise HTTPException(404, "Sessão não encontrada")
    h.ativo = False; log(db, admin, "Encerrar sessão", f"Sessão {login_id} encerrada", request, h.user_id); db.commit()
    return {"mensagem": "Sessão encerrada no histórico"}


@router.post("/seguranca/bloquear-ip")
def bloquear_ip(dados: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ip = dados.get("ip")
    if not ip: raise HTTPException(400, "Informe o IP")
    item = db.query(models.BlockedIP).filter(models.BlockedIP.ip == ip).first()
    if item: item.ativo = True; item.motivo = dados.get("motivo", item.motivo)
    else: db.add(models.BlockedIP(ip=ip, motivo=dados.get("motivo", "Bloqueado pelo admin")))
    log(db, admin, "Bloquear IP", f"IP {ip} bloqueado", request); db.commit()
    return {"mensagem": "IP bloqueado"}


@router.get("/backup/{tipo}")
def backup(tipo: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    data = {"exportado_em": now().isoformat(), "tipo": tipo}
    if tipo in ["banco", "usuarios"]: data["usuarios"] = [{"id": u.id, "nome": u.nome, "email": u.email, "plano": u.plano, "role": u.role, "status": u.status} for u in db.query(models.Usuario).all()]
    if tipo in ["banco", "movimentacoes"]: data["movimentacoes"] = [{"id": m.id, "usuario_id": m.usuario_id, "tipo": m.tipo.value, "valor": m.valor, "categoria": m.categoria, "descricao": m.descricao} for m in db.query(models.Movimentacao).all()]
    if tipo in ["banco", "metas"]: data["metas"] = [{"id": m.id, "usuario_id": m.usuario_id, "nome": getattr(m, "nome", getattr(m, "descricao", ""))} for m in db.query(models.MetaFinanceira).all()]
    if tipo in ["banco", "cartoes"]: data["cartoes"] = [{"id": c.id, "usuario_id": c.usuario_id, "nome": c.nome, "banco": c.banco_emissor, "limite_total": c.limite_total} for c in db.query(models.CartaoCredito).all()]
    if tipo in ["banco", "parcelamentos"]: data["parcelamentos"] = [{"id": p.id, "usuario_id": p.usuario_id, "descricao": p.descricao, "valor_total": p.valor_total, "quantidade_parcelas": p.quantidade_parcelas} for p in db.query(models.Parcelamento).all()]
    return JSONResponse(content=data, headers={"Content-Disposition": f"attachment; filename=pinnacle-{tipo}.json"})


@router.post("/backup/restaurar")
def restaurar_backup(payload: dict, request: Request, db: Session = Depends(get_db), admin=Depends(require_admin)):
    log(db, admin, "Restaurar backup", "Backup recebido para restauração manual/assistida", request); db.commit()
    return {"mensagem": "Backup recebido. Por segurança, a restauração automática deve ser validada antes de sobrescrever dados em produção."}
