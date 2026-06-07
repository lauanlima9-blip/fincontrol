import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './FeaturePages.css'

export default function TermosPage(){
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const backTo = from === 'cadastro' ? '/cadastro' : from === 'login' ? '/login' : '/'
  const backText = from === 'cadastro' ? 'Voltar para criar conta' : from === 'login' ? 'Voltar para login' : 'Voltar para o site'

  return <div className="feature-page institucional-page fade-in">
    <div className="legal-top-actions"><Link to={backTo} className="btn-cancel"><ArrowLeft size={16}/> {backText}</Link></div>
    <div className="page-header"><div><h1>Termos de Uso</h1><p className="page-desc">Última atualização: 2026.</p></div></div>
    <section className="feature-card legal-text">
      <h2>1. Aceitação dos termos</h2><p>Ao utilizar o Pinnacle Finance, você concorda com estes Termos de Uso e com a Política de Privacidade.</p>
      <h2>2. Objetivo da plataforma</h2><p>O Pinnacle Finance é uma ferramenta de controle financeiro pessoal destinada a auxiliar usuários na organização de receitas, despesas, metas financeiras, cartões, parcelamentos e relatórios.</p>
      <h2>3. Responsabilidades do usuário</h2><p>O usuário é responsável por fornecer informações corretas, manter a segurança de sua conta e utilizar a plataforma de forma lícita.</p>
      <h2>4. Disponibilidade</h2><p>Buscamos manter o sistema disponível, mas não garantimos funcionamento ininterrupto ou ausência total de falhas.</p>
      <h2>5. Limitação de responsabilidade</h2><p>Os relatórios e insights possuem caráter informativo. O Pinnacle Finance não é instituição financeira, não realiza investimentos e não fornece aconselhamento financeiro, contábil ou jurídico.</p>
      <h2>6. Alterações</h2><p>Estes termos poderão ser atualizados periodicamente.</p>
      <h2>7. Contato</h2><p>Dúvidas sobre estes termos podem ser enviadas para <strong>pinnacleb109@gmail.com</strong>.</p>
    </section>
  </div>
}
