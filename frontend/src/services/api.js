import axios from 'axios'
const BASE_URL = import.meta.env.VITE_API_URL || ''
const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } })
api.interceptors.request.use((config) => { const token = localStorage.getItem('fincontrol_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config })
api.interceptors.response.use((res) => res, (err) => { if (err.response?.status === 401) { localStorage.removeItem('fincontrol_token'); localStorage.removeItem('fincontrol_usuario'); window.location.href = '/login' } return Promise.reject(err) })
export default api
export const authService = { cadastrar: (dados) => api.post('/usuarios/cadastro', dados), login: (dados) => api.post('/usuarios/login', dados), perfil: () => api.get('/usuarios/me'), atualizarPerfil: (dados) => api.put('/usuarios/me', dados), excluirConta: () => api.delete('/usuarios/me'), esqueciSenha: (dados) => api.post('/usuarios/esqueci-senha', dados), redefinirSenha: (dados) => api.post('/usuarios/redefinir-senha', dados) }
export const movimentacoesService = { listar: (params) => api.get('/movimentacoes/', { params }), criar: (dados) => api.post('/movimentacoes/', dados), atualizar: (id, dados) => api.put(`/movimentacoes/${id}`, dados), excluir: (id) => api.delete(`/movimentacoes/${id}`), gerarRecorrentes: () => api.post('/movimentacoes/recorrentes/gerar') }
export const categoriasService = { listar: (params) => api.get('/categorias/', { params }), criar: (dados) => api.post('/categorias/', dados), atualizar: (id, dados) => api.put(`/categorias/${id}`, dados), excluir: (id) => api.delete(`/categorias/${id}`) }
export const dashboardService = { resumo: (params) => api.get('/dashboard/resumo', { params }), categorias: () => api.get('/dashboard/categorias'), relatorio: (params) => api.get('/dashboard/relatorio', { params }) }
export const metasService = { listar: (params) => api.get('/metas/', { params }), criar: (dados) => api.post('/metas/', dados), atualizar: (id, dados) => api.put(`/metas/${id}`, dados), excluir: (id) => api.delete(`/metas/${id}`) }

export const cartoesService = { listar: () => api.get('/cartoes/'), criar: (dados) => api.post('/cartoes/', dados), atualizar: (id,dados) => api.put(`/cartoes/${id}`, dados), excluir: (id) => api.delete(`/cartoes/${id}`), gastos: (params) => api.get('/cartoes/dashboard/gastos', { params }) }
export const parcelamentosService = { listar: () => api.get('/parcelamentos/'), criar: (dados) => api.post('/parcelamentos/', dados), quitar: (id) => api.post(`/parcelamentos/${id}/quitar`), pagarParcela: (id) => api.post(`/parcelamentos/parcelas/${id}/pagar`), resumo: () => api.get('/parcelamentos/dashboard/resumo') }
export const insightsService = { historico: () => api.get('/insights/'), gerar: (params) => api.post('/insights/gerar', null, { params }), excluir: (id) => api.delete(`/insights/${id}`) }
export const importacaoService = { preview: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/importacao/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }, confirmar: (itens) => api.post('/importacao/confirmar', itens) }

export const planejamentoService = { metas: () => api.get('/planejamento/metas'), criarMeta: (dados) => api.post('/planejamento/metas', dados), atualizarMeta: (id,dados) => api.put(`/planejamento/metas/${id}`, dados), excluirMeta: (id) => api.delete(`/planejamento/metas/${id}`), aportarMeta: (id,dados) => api.post(`/planejamento/metas/${id}/aporte`, dados), retirarMeta: (id,dados) => api.post(`/planejamento/metas/${id}/retirada`, dados), sobraMesAnterior: () => api.get('/planejamento/sobra-mes-anterior'), simular: (dados) => api.post('/planejamento/simulacoes', dados), resumo: () => api.get('/planejamento/resumo') }

export const notificacoesService = { listar: () => api.get('/notificacoes/'), lida: (id) => api.post(`/notificacoes/${id}/lida`), excluir: (id) => api.delete(`/notificacoes/${id}`), resumo: () => api.get('/v2/notificacoes/resumo') }
export const v2Service = { calendario: (params) => api.get('/v2/calendario', { params }), score: () => api.get('/v2/score'), patrimonio: () => api.get('/v2/patrimonio'), criarPatrimonio: (dados) => api.post('/v2/patrimonio', dados), atualizarPatrimonio: (id,dados) => api.put(`/v2/patrimonio/${id}`, dados), excluirPatrimonio: (id) => api.delete(`/v2/patrimonio/${id}`), backup: () => api.get('/v2/backup'), backupCsv: () => api.get('/v2/backup/excel', { responseType: 'text' }), importarBackup: (dados) => api.post('/v2/backup/importar', dados) }

export const adminService = {
  dashboard: () => api.get('/admin/dashboard'),
  usuarios: () => api.get('/admin/usuarios'),
  usuario: (id) => api.get(`/admin/usuarios/${id}`),
  editarUsuario: (id,dados) => api.put(`/admin/usuarios/${id}`, dados),
  acaoUsuario: (id,dados) => api.post(`/admin/usuarios/${id}/acao`, dados),
  excluirUsuario: (id) => api.delete(`/admin/usuarios/${id}`),
  impersonar: (id) => api.post(`/admin/usuarios/${id}/impersonar`),
  planos: () => api.get('/admin/planos'),
  criarPlano: (dados) => api.post('/admin/planos', dados),
  editarPlano: (id,dados) => api.put(`/admin/planos/${id}`, dados),
  analytics: () => api.get('/admin/analytics'),
  logs: (params) => api.get('/admin/logs', { params }),
  configuracoes: () => api.get('/admin/configuracoes'),
  salvarConfiguracoes: (dados) => api.put('/admin/configuracoes', dados),
  seguranca: () => api.get('/admin/seguranca'),
  encerrarSessao: (id) => api.post(`/admin/seguranca/encerrar-sessao/${id}`),
  bloquearIp: (dados) => api.post('/admin/seguranca/bloquear-ip', dados),
  backup: (tipo) => api.get(`/admin/backup/${tipo}`, { responseType: 'blob' }),
  restaurarBackup: (dados) => api.post('/admin/backup/restaurar', dados),
  emailStatus: () => api.get('/admin/email/status'),
  emailTeste: (dados) => api.post('/admin/email/teste', dados),
}
