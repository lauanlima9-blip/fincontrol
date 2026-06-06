# FinControl — Controle Financeiro Pessoal

Sistema completo de controle financeiro pessoal com backend FastAPI + PostgreSQL e frontend React + Vite.

---

## Estrutura do Projeto

```
fincontrol/
├── backend/
│   ├── main.py               # Entry point FastAPI
│   ├── database.py           # Conexão SQLAlchemy
│   ├── models.py             # Modelos ORM (Usuario, Movimentacao)
│   ├── schemas.py            # Schemas Pydantic
│   ├── auth.py               # JWT + bcrypt
│   ├── routes/
│   │   ├── usuarios.py       # /usuarios (cadastro, login, perfil)
│   │   ├── movimentacoes.py  # /movimentacoes (CRUD)
│   │   └── dashboard.py      # /dashboard (resumo, relatório)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx            # Roteamento principal
    │   ├── index.css          # Design system (variáveis CSS)
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   └── api.js         # Axios + serviços
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   └── Layout.css
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── CadastroPage.jsx
    │       ├── DashboardPage.jsx
    │       ├── MovimentacoesPage.jsx
    │       └── RelatoriosPage.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Pré-requisitos

- **Python 3.10+**
- **Node.js 18+** e **npm**
- **PostgreSQL 14+**

---

## 1. Configurar o Banco de Dados (PostgreSQL)

```bash
# Acesse o psql como superusuário
psql -U postgres

# Crie o banco
CREATE DATABASE fincontrol;

# Saia
\q
```

---

## 2. Configurar e Rodar o Backend

```bash
cd backend

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

Edite o `.env` com seus dados:
```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/fincontrol
SECRET_KEY=troque-por-uma-chave-secreta-longa-e-aleatoria
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

```bash
# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# ou: venv\Scripts\activate     # Windows

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor (as tabelas são criadas automaticamente)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

O backend estará disponível em: **http://localhost:8000**
Documentação interativa: **http://localhost:8000/docs**

---

## 3. Configurar e Rodar o Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em: **http://localhost:5173**

O Vite está configurado com proxy: todas as chamadas a `/api` são redirecionadas para `http://localhost:8000`.

---

## 4. Acessar o Sistema

1. Abra **http://localhost:5173** no navegador
2. Clique em "Criar conta grátis"
3. Preencha nome, e-mail e senha (mínimo 6 caracteres)
4. Faça login e comece a registrar suas movimentações!

---

## Funcionalidades

| Área | Funcionalidade |
|------|---------------|
| Autenticação | Cadastro, login, logout com JWT |
| Dashboard | KPIs (receitas, despesas, saldo, qtde), gráfico de pizza por categoria, gráfico de barras mensal |
| Movimentações | Criar, editar, excluir, listar com paginação |
| Filtros | Por mês, ano, tipo (Receita/Despesa), categoria |
| Relatórios | Resumo do período, despesas e receitas por categoria com barras de progresso |
| Segurança | Senhas com bcrypt, rotas protegidas, dados isolados por usuário |

---

## API Endpoints

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/usuarios/cadastro` | Cadastrar novo usuário |
| POST | `/usuarios/login` | Login e obtenção do token |
| GET | `/usuarios/me` | Perfil do usuário logado |

### Movimentações (requer Bearer token)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/movimentacoes/` | Listar (filtros: mes, ano, tipo, categoria) |
| POST | `/movimentacoes/` | Criar movimentação |
| PUT | `/movimentacoes/{id}` | Atualizar movimentação |
| DELETE | `/movimentacoes/{id}` | Excluir movimentação |

### Dashboard (requer Bearer token)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard/resumo` | Resumo geral (KPIs + gráficos) |
| GET | `/dashboard/relatorio` | Relatório detalhado por período |
| GET | `/dashboard/categorias` | Lista de categorias do usuário |

---

## Build para Produção

```bash
# Frontend
cd frontend
npm run build
# Gera a pasta dist/ com os arquivos estáticos

# Backend (com variáveis de produção no .env)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Tecnologias Utilizadas

**Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, JWT (python-jose), bcrypt (passlib), Pydantic v2, Uvicorn

**Frontend:** React 18, Vite, Axios, React Router v6, Chart.js + react-chartjs-2, date-fns, Lucide React

**Design:** CSS customizado com design system baseado em variáveis CSS, tema escuro, tipografia Syne + DM Sans
