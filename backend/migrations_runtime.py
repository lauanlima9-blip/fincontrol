from sqlalchemy import inspect, text
from database import engine


def aplicar_migracoes_simples():
    """Adiciona colunas novas em bancos já existentes sem exigir Alembic."""
    insp = inspect(engine)
    if "movimentacoes" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("movimentacoes")}
    dialect = engine.dialect.name
    bool_default = "BOOLEAN DEFAULT FALSE NOT NULL" if dialect != "postgresql" else "BOOLEAN DEFAULT FALSE NOT NULL"
    dt = "TIMESTAMP" if dialect != "postgresql" else "TIMESTAMP WITH TIME ZONE"
    statements = []
    if "recorrente" not in cols:
        statements.append(f"ALTER TABLE movimentacoes ADD COLUMN recorrente {bool_default}")
    if "frequencia" not in cols:
        statements.append("ALTER TABLE movimentacoes ADD COLUMN frequencia VARCHAR(20)")
    if "proxima_data_lancamento" not in cols:
        statements.append(f"ALTER TABLE movimentacoes ADD COLUMN proxima_data_lancamento {dt}")
    if "recorrencia_origem_id" not in cols:
        statements.append("ALTER TABLE movimentacoes ADD COLUMN recorrencia_origem_id INTEGER")
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
