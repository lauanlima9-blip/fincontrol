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

    def add_col(table, cols, name, ddl):
        if name not in cols:
            statements.append(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")

    add_col("movimentacoes", cols, "cartao_id", "INTEGER")
    add_col("movimentacoes", cols, "parcelamento_id", "INTEGER")
    add_col("movimentacoes", cols, "numero_parcela", "INTEGER")
    add_col("movimentacoes", cols, "total_parcelas", "INTEGER")
    add_col("movimentacoes", cols, "pago", "BOOLEAN DEFAULT FALSE NOT NULL")
    add_col("movimentacoes", cols, "hash_importacao", "VARCHAR(120)")

    tables = insp.get_table_names()
    if "usuarios" in tables:
        user_cols = {c["name"] for c in insp.get_columns("usuarios")}
        add_col("usuarios", user_cols, "foto_perfil", "VARCHAR(500)")
        add_col("usuarios", user_cols, "tema_preferido", "VARCHAR(20) DEFAULT 'dark' NOT NULL")
        add_col("usuarios", user_cols, "notificacoes_ativas", "BOOLEAN DEFAULT TRUE NOT NULL")
        add_col("usuarios", user_cols, "two_factor_enabled", "BOOLEAN DEFAULT FALSE NOT NULL")
        add_col("usuarios", user_cols, "codigo_2fa", "VARCHAR(10)")
        add_col("usuarios", user_cols, "reset_token", "VARCHAR(120)")

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
