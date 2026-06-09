import { CheckCircle, Crown, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './FeaturePages.css'

const isPremiumUser = (usuario) => {
  const role = (usuario?.role || '').toLowerCase()
  const plano = (usuario?.plano || '').toLowerCase()
  return role === 'admin' || role === 'premium' || plano === 'premium'
}

export default function PlanosPage(){
  const { usuario } = useAuth()
  const premium = isPremiumUser(usuario)
  const gratuito = ['Dashboard financeiro', 'Receitas e despesas', 'Categorias personalizadas', 'Metas básicas', 'Perfil e configurações']
  const premiumFeatures = ['Cartões de crédito', 'Compras parceladas', 'Insights IA', 'Importação de extratos', 'Relatórios avançados', 'Calendário financeiro', 'Score financeiro', 'Patrimônio e backup']
  return <div className="feature-page fade-in"><div className="page-header"><div><h1>Planos</h1><p className="page-desc">Separação oficial entre Plano Gratuito e Plano Premium do Pinnacle Finance.</p></div></div><div className="pricing-grid"><div className="feature-card plan-card"><h2>Gratuito</h2><strong>R$ 0</strong><p className="muted">Para começar a organizar a vida financeira.</p>{gratuito.map(x=><p key={x}><CheckCircle size={15}/> {x}</p>)}<button className="btn-cancel">{premium?'Disponível':'Plano atual'}</button></div><div className="feature-card plan-card premium"><Crown size={26}/><h2>Premium</h2><strong>R$ 19,90/mês</strong><p className="muted">Para quem quer controle completo e recursos avançados.</p>{premiumFeatures.map(x=><p key={x}><CheckCircle size={15}/> {x}</p>)}<button className="btn-save">{premium?'Plano Premium ativo':'Assinar Premium em breve'}</button><small>{premium?'Seu usuário já possui acesso Premium.':'Pagamento ainda será integrado ao Mercado Pago/Stripe na próxima etapa.'}</small></div></div><div className="feature-card"><h3><Lock size={18}/> Como a separação funciona</h3><p>Usuários gratuitos continuam usando dashboard, movimentações, categorias, metas básicas, perfil e configurações.</p><p>Usuários Premium acessam os módulos avançados: cartões, parcelamentos, IA, importação, relatórios, calendário, score, patrimônio e backup.</p><p><Sparkles size={16}/> Administradores têm acesso total automaticamente.</p></div></div>
}
