import { HeartHandshake, ShieldCheck, Mail, Instagram } from 'lucide-react'
import './FeaturePages.css'

export default function SobrePage(){
  return <div className="feature-page institucional-page fade-in">
    <div className="page-header"><div><h1>Sobre o Pinnacle Finance</h1><p className="page-desc">Controle financeiro pessoal moderno, criado para transformar dados em decisões inteligentes.</p></div></div>
    <div className="feature-grid two">
      <section className="feature-card"><HeartHandshake size={28}/><h2>Nossa história</h2><p>O Pinnacle Finance nasceu para ajudar pessoas a organizarem receitas, despesas, cartões, parcelamentos, metas e relatórios em um só lugar.</p><p>A plataforma foi criada para ser simples, visual e inteligente, ajudando o usuário a entender para onde o dinheiro está indo e como melhorar sua vida financeira.</p></section>
      <section className="feature-card"><ShieldCheck size={28}/><h2>Segurança e privacidade</h2><p>Seus dados pertencem a você. O Pinnacle Finance não vende informações pessoais e utiliza separação por usuário para que cada conta visualize somente os próprios dados.</p><p>As análises da plataforma são informativas e não representam recomendação financeira profissional.</p></section>
    </div>
    <section className="feature-card"><h2>O que você encontra aqui?</h2><div className="benefits-list"><span>Dashboard financeiro</span><span>Movimentações</span><span>Cartões de crédito</span><span>Parcelamentos</span><span>Metas financeiras</span><span>Simulador</span><span>Calendário financeiro</span><span>Insights IA</span><span>Relatórios</span></div></section>
    <section className="feature-card"><h2>Contato</h2><p><Mail size={16}/> pinnacleb109@gmail.com</p><p><Instagram size={16}/> @pinnacle.bi</p><p>Desenvolvido por <strong>Lauan De Lima</strong>.</p></section>
  </div>
}
