# Configurar e-mail de recuperação no Render

Sem SMTP configurado, o sistema não consegue enviar e-mail real. Para usar Gmail:

1. Entre na conta Gmail que enviará os e-mails.
2. Ative a verificação em duas etapas.
3. Gere uma **Senha de app** de 16 caracteres.
4. No Render, em **Environment**, adicione:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=pinnacleb109@gmail.com
SMTP_PASSWORD=SENHA_DE_APP_DE_16_CARACTERES
SMTP_FROM=Pinnacle Finance <pinnacleb109@gmail.com>
SMTP_FROM_NAME=Pinnacle Finance
SMTP_USE_TLS=true
SMTP_USE_SSL=false
APP_URL=https://pinnaclefinance.com.br
```

Depois clique em **Manual Deploy > Clear build cache & deploy**.

No painel admin, use **Administração > Segurança > Testar e-mail**. Se falhar, o endpoint `/admin/email/status` mostra o último erro SMTP.
