import os
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr, formataddr
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

LAST_EMAIL_ERROR: Optional[str] = None


class SMTPIPv4(smtplib.SMTP):
    """SMTP que força IPv4.

    Em alguns deploys Docker/Render, smtp.gmail.com resolve IPv6 primeiro e a
    conexão falha com OSError [Errno 101] Network is unreachable. Forçar AF_INET
    evita esse problema sem mudar as variáveis SMTP.
    """
    def _get_socket(self, host, port, timeout):
        if timeout is not None and not timeout:
            raise ValueError('Non-blocking socket (timeout=0) is not supported')
        for family, socktype, proto, canonname, sockaddr in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
            sock = socket.socket(family, socktype, proto)
            try:
                sock.settimeout(timeout)
                sock.connect(sockaddr)
                return sock
            except OSError:
                sock.close()
                raise
        raise OSError(f'Não foi possível resolver/conectar em IPv4: {host}:{port}')


class SMTPSSLIPv4(smtplib.SMTP_SSL):
    """SMTP SSL que força IPv4 pelo mesmo motivo do SMTPIPv4."""
    def _get_socket(self, host, port, timeout):
        if timeout is not None and not timeout:
            raise ValueError('Non-blocking socket (timeout=0) is not supported')
        for family, socktype, proto, canonname, sockaddr in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
            sock = socket.socket(family, socktype, proto)
            try:
                sock.settimeout(timeout)
                sock.connect(sockaddr)
                return self.context.wrap_socket(sock, server_hostname=host)
            except OSError:
                sock.close()
                raise
        raise OSError(f'Não foi possível resolver/conectar em IPv4: {host}:{port}')


def _env(*names: str, default: str = '') -> str:
    """Lê variáveis em tempo de execução para evitar cache antigo no deploy."""
    for name in names:
        value = os.getenv(name)
        if value is not None and str(value).strip() != '':
            return str(value).strip()
    return default


def _bool_env(*names: str, default: str = 'false') -> bool:
    return _env(*names, default=default).lower() in ('1', 'true', 'yes', 'sim', 'on')


def _config() -> dict:
    smtp_user = _env('SMTP_USER', 'EMAIL_USER', 'MAIL_USERNAME', 'GMAIL_USER')
    smtp_password = _env('SMTP_PASSWORD', 'EMAIL_PASSWORD', 'MAIL_PASSWORD', 'GMAIL_APP_PASSWORD')
    smtp_host = _env('SMTP_HOST', 'EMAIL_HOST', 'MAIL_SERVER', default='smtp.gmail.com' if smtp_user else '')
    try:
        smtp_port = int(_env('SMTP_PORT', 'EMAIL_PORT', 'MAIL_PORT', default='587'))
    except ValueError:
        smtp_port = 587
    smtp_from = _env('SMTP_FROM', 'EMAIL_FROM', 'MAIL_FROM', default=smtp_user or 'pinnacleb109@gmail.com')
    smtp_from_name = _env('SMTP_FROM_NAME', 'EMAIL_FROM_NAME', default='Pinnacle Finance')
    smtp_use_ssl = _bool_env('SMTP_USE_SSL', 'EMAIL_USE_SSL', 'MAIL_SSL_TLS', default='false') or smtp_port == 465
    smtp_use_tls = _bool_env('SMTP_USE_TLS', 'EMAIL_USE_TLS', 'MAIL_STARTTLS', default='true') and not smtp_use_ssl
    app_url = _env('APP_URL', 'FRONTEND_URL', 'SITE_URL', 'VITE_PUBLIC_URL', default='http://localhost:5173')
    debug_email = _bool_env('DEBUG_EMAIL', default='false')
    return {
        'smtp_user': smtp_user,
        'smtp_password': smtp_password,
        'smtp_host': smtp_host,
        'smtp_port': smtp_port,
        'smtp_from': smtp_from,
        'smtp_from_name': smtp_from_name,
        'smtp_use_tls': smtp_use_tls,
        'smtp_use_ssl': smtp_use_ssl,
        'app_url': app_url,
        'debug_email': debug_email,
    }


def _sender_email(cfg: Optional[dict] = None) -> str:
    cfg = cfg or _config()
    # O envelope sender deve ser o usuário autenticado para evitar bloqueio do Gmail/SMTP.
    return cfg['smtp_user'] or parseaddr(cfg['smtp_from'])[1] or 'pinnacleb109@gmail.com'


def _sender_header(cfg: Optional[dict] = None) -> str:
    cfg = cfg or _config()
    name, email = parseaddr(cfg['smtp_from'])
    email = email or cfg['smtp_user'] or 'pinnacleb109@gmail.com'
    return formataddr((name or cfg['smtp_from_name'] or 'Pinnacle Finance', email))


def email_configurado() -> bool:
    cfg = _config()
    return bool(cfg['smtp_host'] and cfg['smtp_user'] and cfg['smtp_password'])


def status_email() -> dict:
    cfg = _config()
    return {
        'configurado': email_configurado(),
        'smtp_host': cfg['smtp_host'] or None,
        'smtp_port': cfg['smtp_port'],
        'smtp_user': cfg['smtp_user'] or None,
        'smtp_from': _sender_header(cfg),
        'app_url': cfg['app_url'],
        'use_tls': cfg['smtp_use_tls'],
        'use_ssl': cfg['smtp_use_ssl'],
        'ultimo_erro': LAST_EMAIL_ERROR,
        'observacao': None if email_configurado() else 'Configure SMTP_USER e SMTP_PASSWORD no Render. Para Gmail, use Senha de app de 16 caracteres; senha normal da conta não funciona.'
    }


def enviar_email(destinatario: str, assunto: str, html: str, texto: Optional[str] = None) -> bool:
    global LAST_EMAIL_ERROR
    LAST_EMAIL_ERROR = None
    cfg = _config()

    if not email_configurado():
        LAST_EMAIL_ERROR = 'SMTP não configurado. Defina SMTP_USER e SMTP_PASSWORD nas variáveis de ambiente do backend.'
        print('\n[PINNACLE EMAIL NÃO CONFIGURADO]')
        print(f'Para: {destinatario}')
        print(f'Assunto: {assunto}')
        print(LAST_EMAIL_ERROR)
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = assunto
    msg['From'] = _sender_header(cfg)
    msg['To'] = destinatario
    msg.attach(MIMEText(texto or 'Mensagem do Pinnacle Finance.', 'plain', 'utf-8'))
    msg.attach(MIMEText(html, 'html', 'utf-8'))

    try:
        if cfg['smtp_use_ssl']:
            with SMTPSSLIPv4(cfg['smtp_host'], cfg['smtp_port'], timeout=30) as server:
                server.login(cfg['smtp_user'], cfg['smtp_password'])
                server.sendmail(_sender_email(cfg), [destinatario], msg.as_string())
        else:
            with SMTPIPv4(cfg['smtp_host'], cfg['smtp_port'], timeout=30) as server:
                server.ehlo()
                if cfg['smtp_use_tls']:
                    server.starttls()
                    server.ehlo()
                server.login(cfg['smtp_user'], cfg['smtp_password'])
                server.sendmail(_sender_email(cfg), [destinatario], msg.as_string())
        return True
    except smtplib.SMTPAuthenticationError as exc:
        LAST_EMAIL_ERROR = 'Falha de autenticação SMTP. No Gmail, ative verificação em duas etapas e use Senha de app, não a senha normal.'
    except smtplib.SMTPRecipientsRefused as exc:
        LAST_EMAIL_ERROR = f'Destinatário recusado pelo provedor SMTP: {exc}'
    except smtplib.SMTPSenderRefused as exc:
        LAST_EMAIL_ERROR = f'Remetente recusado pelo provedor SMTP. Use SMTP_FROM igual ao SMTP_USER. Detalhe: {exc}'
    except smtplib.SMTPException as exc:
        LAST_EMAIL_ERROR = f'Erro SMTP: {type(exc).__name__}: {exc}'
    except Exception as exc:
        
        if isinstance(exc, OSError) and getattr(exc, 'errno', None) == 101:
            LAST_EMAIL_ERROR = 'Não foi possível conectar ao SMTP pela rede do deploy. O código agora força IPv4; confirme SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USE_TLS=true e faça novo deploy. Se persistir, use um provedor transacional como Brevo/Resend.'
        else:
            LAST_EMAIL_ERROR = f'Erro inesperado no envio: {type(exc).__name__}: {exc}'
    print('\n[PINNACLE ERRO AO ENVIAR EMAIL]')
    print(f'Host: {cfg["smtp_host"]}:{cfg["smtp_port"]}')
    print(f'Usuário SMTP: {cfg["smtp_user"]}')
    print(f'Para: {destinatario}')
    print(f'Assunto: {assunto}')
    print(LAST_EMAIL_ERROR + '\n')
    return False


def criar_link_recuperacao(token: str) -> str:
    cfg = _config()
    return f"{cfg['app_url'].rstrip('/')}/login?reset_token={token}"


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
