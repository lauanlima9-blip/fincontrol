import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr, formataddr
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv('SMTP_HOST', '').strip()
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '').strip()
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '').strip()
SMTP_FROM = os.getenv('SMTP_FROM', SMTP_USER or 'pinnacleb109@gmail.com').strip()
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Pinnacle Finance').strip()
SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() in ('1', 'true', 'yes', 'sim')
SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'false').lower() in ('1', 'true', 'yes', 'sim') or SMTP_PORT == 465
APP_URL = (os.getenv('APP_URL') or os.getenv('FRONTEND_URL') or os.getenv('SITE_URL') or 'http://localhost:5173').strip()


def _sender_email() -> str:
    """Retorna apenas o e-mail para o envelope SMTP, mesmo se SMTP_FROM tiver nome."""
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
        'observacao': None if email_configurado() else 'Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM e APP_URL nas variáveis de ambiente do deploy.'
    }


def enviar_email(destinatario: str, assunto: str, html: str, texto: Optional[str] = None) -> bool:
    """Envia e-mail via SMTP. Nunca retorna tokens/códigos ao cliente."""
    if not email_configurado():
        print('\n[PINNACLE EMAIL NÃO CONFIGURADO]')
        print(f'Para: {destinatario}')
        print(f'Assunto: {assunto}')
        print('Configure as variáveis SMTP_* e APP_URL no ambiente de produção.')
        print('Conteúdo omitido por segurança.\n')
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = assunto
    msg['From'] = _sender_header()
    msg['To'] = destinatario
    msg.attach(MIMEText(texto or 'Mensagem do Pinnacle Finance.', 'plain', 'utf-8'))
    msg.attach(MIMEText(html, 'html', 'utf-8'))

    try:
        if SMTP_USE_SSL:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(_sender_email(), [destinatario], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                server.ehlo()
                if SMTP_USE_TLS:
                    server.starttls()
                    server.ehlo()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(_sender_email(), [destinatario], msg.as_string())
        return True
    except Exception as exc:
        print('\n[PINNACLE ERRO AO ENVIAR EMAIL]')
        print(f'Para: {destinatario}')
        print(f'Assunto: {assunto}')
        print(f'Erro: {type(exc).__name__}: {exc}\n')
        return False


def enviar_recuperacao_senha(destinatario: str, token: str) -> bool:
    link = f"{APP_URL.rstrip('/')}/login?reset_token={token}"
    html = f"""
    <div style='font-family:Arial,sans-serif;line-height:1.6;color:#111'>
      <h2>Redefinição de senha - Pinnacle Finance</h2>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no botão abaixo para criar uma nova senha. O link expira em 30 minutos.</p>
      <p><a href='{link}' style='background:#00e5a0;color:#03110d;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold'>Redefinir senha</a></p>
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
      <p>Se você não tentou acessar sua conta, altere sua senha.</p>
    </div>
    """
    texto = f"Seu código de acesso Pinnacle Finance é: {codigo}. Expira em 10 minutos."
    return enviar_email(destinatario, 'Código de acesso - Pinnacle Finance', html, texto)
