import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

SMTP_HOST = os.getenv('SMTP_HOST', '')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM = os.getenv('SMTP_FROM', SMTP_USER or 'pinnacleb109@gmail.com')
APP_URL = os.getenv('APP_URL', 'http://localhost:5173')


def email_configurado() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def enviar_email(destinatario: str, assunto: str, html: str, texto: Optional[str] = None) -> bool:
    """Envia e-mail via SMTP quando configurado. Nunca retorna tokens/códigos ao cliente."""
    if not email_configurado():
        # Segurança: não expor token/código na API. Apenas registra no servidor para desenvolvimento local.
        print('\n[PINNACLE EMAIL NÃO CONFIGURADO]')
        print(f'Para: {destinatario}')
        print(f'Assunto: {assunto}')
        print('Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM e APP_URL no .env')
        print('Conteúdo omitido por segurança.\n')
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = assunto
    msg['From'] = SMTP_FROM
    msg['To'] = destinatario
    msg.attach(MIMEText(texto or 'Mensagem do Pinnacle Finance.', 'plain', 'utf-8'))
    msg.attach(MIMEText(html, 'html', 'utf-8'))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [destinatario], msg.as_string())
    return True


def enviar_recuperacao_senha(destinatario: str, token: str) -> bool:
    link = f"{APP_URL.rstrip('/')}/login?reset_token={token}"
    html = f"""
    <div style='font-family:Arial,sans-serif;line-height:1.6;color:#111'>
      <h2>Redefinição de senha - Pinnacle Finance</h2>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no botão abaixo para criar uma nova senha. O link expira em 30 minutos.</p>
      <p><a href='{link}' style='background:#00e5a0;color:#03110d;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold'>Redefinir senha</a></p>
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
