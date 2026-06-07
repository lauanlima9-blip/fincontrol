# Pinnacle Finance

Sistema de controle financeiro pessoal com login, dashboard, movimentações, categorias personalizadas, metas, relatórios, tema claro/escuro e PWA.

## Novidades desta versão

- Movimentações recorrentes com frequência semanal, mensal ou anual.
- Botão para lançar recorrentes vencidas automaticamente.
- Categorias personalizadas por usuário, com CRUD completo.
- Link oficial do Instagram da Pinnacle BI no menu e rodapé.
- Tema claro/escuro salvo no localStorage.
- PWA com `manifest.json`, ícone e service worker.
- Tela de perfil com alteração de nome e senha, validando senha atual.

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

Configure o `.env` com `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM` e `ACCESS_TOKEN_EXPIRE_MINUTES`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Se o backend estiver em outro domínio, crie `.env` no frontend:

```env
VITE_API_URL=http://localhost:8000
```

## PWA

Em produção com HTTPS, o navegador poderá exibir a opção de instalar o Pinnacle Finance no celular ou desktop.
