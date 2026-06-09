# Correção SMTP Render/Gmail

Este projeto agora força conexão SMTP por IPv4 para evitar o erro comum em Docker/Render:

`OSError: [Errno 101] Network is unreachable`

Variáveis recomendadas no Render > fincontrol-backend > Environment:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=pinnacleb109@gmail.com
SMTP_PASSWORD=SENHA_DE_APP_DO_GMAIL_SEM_ESPACOS
SMTP_FROM=pinnacleb109@gmail.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
APP_URL=https://SEU_FRONTEND.onrender.com
```

Depois de salvar, faça Manual Deploy no backend.

Se mesmo forçando IPv4 o erro persistir, provavelmente o ambiente está bloqueando SMTP externo. Nesse caso use Brevo, Resend, SendGrid ou Mailgun.
