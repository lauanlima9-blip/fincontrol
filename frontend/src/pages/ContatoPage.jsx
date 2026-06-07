import { Mail, Instagram, MessageCircle } from 'lucide-react'
import './FeaturePages.css'

export default function ContatoPage(){
  return <div className="feature-page institucional-page fade-in">
    <div className="page-header"><div><h1>Contato</h1><p className="page-desc">Dúvidas, sugestões ou suporte do Pinnacle Finance.</p></div></div>
    <div className="feature-grid two">
      <section className="feature-card contact-card"><Mail size={28}/><h2>E-mail</h2><p>Envie sua mensagem para:</p><strong>pinnacleb109@gmail.com</strong></section>
      <section className="feature-card contact-card"><Instagram size={28}/><h2>Instagram</h2><p>Acompanhe novidades e conteúdos:</p><a href="https://www.instagram.com/pinnacle.bi/" target="_blank" rel="noreferrer">@pinnacle.bi</a></section>
    </div>
    <section className="feature-card"><MessageCircle size={26}/><h2>Suporte</h2><p>Para problemas de acesso, dúvidas sobre dados, privacidade ou sugestões de melhorias, entre em contato pelo e-mail acima. Responderemos o mais breve possível.</p><p>Desenvolvido por <strong>Lauan De Lima</strong>.</p></section>
  </div>
}
