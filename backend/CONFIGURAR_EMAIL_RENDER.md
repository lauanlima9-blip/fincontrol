# Configurar envio de e-mail em produção

Para recuperação de senha e 2FA enviarem e-mail de verdade, configure estas variáveis de ambiente no Render/Railway:

```env
APP_URL=https://pinnaclefinance.com.br
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=pinnacleb109@gmail.com
SMTP_PASSWORD=SENHA_DE_APP_DO_GMAIL
SMTP_FROM=Pinnacle Finance <pinnacleb109@gmail.com>
SMTP_FROM_NAME=Pinnacle Finance
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Importante: no Gmail, use **Senha de app**, não a senha normal da conta.

Depois de configurar, acesse:

`Administração > Segurança > Status do e-mail > Enviar e-mail de teste`

Se falhar, o backend registra o erro completo no log do servidor.
