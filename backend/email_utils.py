import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr, formataddr
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def _env(*names: str, default: str = '') -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and str(value).strip() != '':
            return str(value).strip()
    return default

# Aceita vários nomes de variáveis para evitar erro no Render/Railway.
SMTP_USER = _env('SMTP_USER', 'EMAIL_USER', 'MAIL_USERNAME', 'GMAIL_USER')
SMTP_PASSWORD = _env('SMTP_PASSWORD', 'EMAIL_PASSWORD', 'MAIL_PASSWORD', 'GMAIL_APP_PASSWORD')
SMTP_HOST = _env('SMTP_HOST', 'EMAIL_HOST', 'MAIL_SERVER', default='smtp.gmail.com' if SMTP_USER else '')
SMTP_PORT = int(_env('SMTP_PORT', 'EMAIL_PORT', 'MAIL_PORT', default='587'))
SMTP_FROM = _env('SMTP_FROM', 'EMAIL_FROM', 'MAIL_FROM', default=SMTP_USER or 'pinnacleb109@gmail.com')
SMTP_FROM_NAME = _env('SMTP_FROM_NAME', 'EMAIL_FROM_NAME', default='Pinnacle Finance')
SMTP_USE_TLS = _env('SMTP_USE_TLS', 'EMAIL_USE_TLS', 'MAIL_STARTTLS', default='true').lower() in ('1', 'true', 'yes', 'sim')
SMTP_USE_SSL = _env('SMTP_USE_SSL', 'EMAIL_USE_SSL', 'MAIL_SSL_TLS', default='false').lower() in ('1', 'true', 'yes', 'sim') or SMTP_PORT == 465
APP_URL = _env('APP_URL', 'FRONTEND_URL', 'SITE_URL', 'VITE_PUBLIC_URL', default='http://localhost:5173')
DEBUG_EMAIL = _env('DEBUG_EMAIL', default='false').lower() in ('1', 'true', 'yes', 'sim')
LAST_EMAIL_ERROR: Optional[str] = None


def _sender_email() -> str:
    parsed = parseaddr(SMTP_FROM)[1]
    return parsed or SMTP_USER or 'pinnacleb109@gmail.com'


def _sender_header() -> str:
    name, email = parseaddr(SMTP_FROM)
    email = email or SMTP_USER or 'pinnacleb109@gmail.com'
    return formataddr((name or SMTP_FROM_NAME or 'Pinnacle Finance', email))


def email_configurado() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def status_email() -> dict:
    return {
        'configurado': email_configurado(),
        'smtp_host': SMTP_HOST or None,
        'smtp_port': SMTP_PORT,
        'smtp_user': SMTP_USER or None,
        'smtp_from': _sender_header(),
        'app_url': APP_URL,
        'use_tls': SMTP_USE_TLS,
        'use_ssl': SMTP_USE_SSL,
        'ultimo_erro': LAST_EMAIL_ERROR,
        'observacao': None if email_configurado() else 'Configure SMTP_USER e SMTP_PASSWORD. Para Gmail, use senha de app de 16 caracteres; senha normal da conta não funciona.'
    }


def enviar_email(destinatario: str, assunto: str, html: str, texto: Optional[str] = None) -> bool:
    global LAST_EMAIL_ERROR
    LAST_EMAIL_ERROR = None
    if not email_configurado():
        LAST_EMAIL_ERROR = 'SMTP não configurado. Defina SMTP_USER e SMTP_PASSWORD nas variáveis de ambiente.'
        print('\n[PINNACLE EMAIL NÃO CONFIGURADO]')
        print(f'Para: {destinatario}')
        print(f'Assunto: {assunto}')
        print(LAST_EMAIL_ERROR)
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = assunto
    msg['From'] = _sender_header()
    msg['To'] = destinatario
    msg.attach(MIMEText(texto or 'Mensagem do Pinnacle Finance.', 'plain', 'utf-8'))
    msg.attach(MIMEText(html, 'html', 'utf-8'))

    try:
        if SMTP_USE_SSL:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(_sender_email(), [destinatario], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
                server.ehlo()
                if SMTP_USE_TLS:
                    server.starttls()
                    server.ehlo()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(_sender_email(), [destinatario], msg.as_string())
        return True
    except smtplib.SMTPAuthenticationError as exc:
        LAST_EMAIL_ERROR = 'Falha de autenticação SMTP. No Gmail, ative verificação em duas etapas e use Senha de app, não a senha normal.'
    except smtplib.SMTPRecipientsRefused as exc:
        LAST_EMAIL_ERROR = f'Destinatário recusado pelo provedor SMTP: {exc}'
    except smtplib.SMTPException as exc:
        LAST_EMAIL_ERROR = f'Erro SMTP: {type(exc).__name__}: {exc}'
    except Exception as exc:
        LAST_EMAIL_ERROR = f'Erro inesperado no envio: {type(exc).__name__}: {exc}'
    print('\n[PINNACLE ERRO AO ENVIAR EMAIL]')
    print(f'Para: {destinatario}')
    print(f'Assunto: {assunto}')
    print(LAST_EMAIL_ERROR + '\n')
    return False


def criar_link_recuperacao(token: str) -> str:
    return f"{APP_URL.rstrip('/')}/login?reset_token={token}"


def enviar_recuperacao_senha(destinatario: str, token: str) -> bool:
    link = criar_link_recuperacao(token)
    html = f"""
    <div style='font-family:Arial,sans-serif;line-height:1.6;color:#111'>
      <h2>Redefinição de senha - Pinnacle Finance</h2>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no botão abaixo para criar uma nova senha. O link expira em 30 minutos.</p>
      <p><a href='{link}' style='background:#0ea5e9;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold'>Redefinir senha</a></p>
      <p>Se o botão não abrir, copie e cole este link no navegador:</p>
      <p style='word-break:break-all;color:#2563eb'>{link}</p>
      <p>Se você não solicitou isso, ignore este e-mail.</p>
      <p>Equipe Pinnacle Finance</p>
    </div>
    """
    texto = f"Redefina sua senha pelo link: {link}. Este link expira em 30 minutos."
    return enviar_email(destinatario, 'Redefinição de senha - Pinnacle Finance', html, texto)


def enviar_codigo_2fa(destinatario: str, codigo: str) -> bool:
    html = f"""
    <div style='font-family:Arial,sans-serif;line-height:1.6;color:#111'>
      <h2>Código de acesso - Pinnacle Finance</h2>
      <p>Use o código abaixo para concluir seu login:</p>
      <div style='font-size:28px;font-weight:bold;letter-spacing:6px;background:#f3f4f6;padding:14px;border-radius:10px;text-align:center'>{codigo}</div>
      <p>Este código expira em 10 minutos.</p>
    </div>
    """
    texto = f"Seu código de acesso Pinnacle Finance é: {codigo}. Expira em 10 minutos."
    return enviar_email(destinatario, 'Código de acesso - Pinnacle Finance', html, texto)
