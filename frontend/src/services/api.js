import axios from 'axios'
const BASE_URL = import.meta.env.VITE_API_URL || ''
const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => { const token = localStorage.getItem('fincontrol_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config })
api.interceptors.response.use((res) => res, (err) => { if (err.response?.status === 401) { localStorage.removeItem('fincontrol_token'); localStorage.removeItem('fincontrol_usuario'); window.location.href = '/login' } return Promise.reject(err) })
export default api
export const authService = { cadastrar: (dados) => api.post('/usuarios/cadastro', dados), login: (dados) => api.post('/usuarios/login', dados), perfil: () => api.get('/usuarios/me'), atualizarPerfil: (dados) => api.put('/usuarios/me', dados) }
export const movimentacoesService = { listar: (params) => api.get('/movimentacoes/', { params }), criar: (dados) => api.post('/movimentacoes/', dados), atualizar: (id, dados) => api.put(`/movimentacoes/${id}`, dados), excluir: (id) => api.delete(`/movimentacoes/${id}`), gerarRecorrentes: () => api.post('/movimentacoes/recorrentes/gerar') }
export const categoriasService = { listar: (params) => api.get('/categorias/', { params }), criar: (dados) => api.post('/categorias/', dados), atualizar: (id, dados) => api.put(`/categorias/${id}`, dados), excluir: (id) => api.delete(`/categorias/${id}`) }
export const dashboardService = { resumo: (params) => api.get('/dashboard/resumo', { params }), categorias: () => api.get('/dashboard/categorias'), relatorio: (params) => api.get('/dashboard/relatorio', { params }) }
export const metasService = { listar: (params) => api.get('/metas/', { params }), criar: (dados) => api.post('/metas/', dados), atualizar: (id, dados) => api.put(`/metas/${id}`, dados), excluir: (id) => api.delete(`/metas/${id}`) }

export const cartoesService = { listar: () => api.get('/cartoes/'), criar: (dados) => api.post('/cartoes/', dados), atualizar: (id,dados) => api.put(`/cartoes/${id}`, dados), excluir: (id) => api.delete(`/cartoes/${id}`), gastos: (params) => api.get('/cartoes/dashboard/gastos', { params }) }
export const parcelamentosService = { listar: () => api.get('/parcelamentos/'), criar: (dados) => api.post('/parcelamentos/', dados), quitar: (id) => api.post(`/parcelamentos/${id}/quitar`), pagarParcela: (id) => api.post(`/parcelamentos/parcelas/${id}/pagar`), resumo: () => api.get('/parcelamentos/dashboard/resumo') }
export const insightsService = { historico: () => api.get('/insights/'), gerar: (params) => api.post('/insights/gerar', null, { params }) }
export const importacaoService = { preview: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/importacao/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }, confirmar: (itens) => api.post('/importacao/confirmar', itens) }

export const planejamentoService = { metas: () => api.get('/planejamento/metas'), criarMeta: (dados) => api.post('/planejamento/metas', dados), atualizarMeta: (id,dados) => api.put(`/planejamento/metas/${id}`, dados), excluirMeta: (id) => api.delete(`/planejamento/metas/${id}`), aportarMeta: (id,dados) => api.post(`/planejamento/metas/${id}/aporte`, dados), retirarMeta: (id,dados) => api.post(`/planejamento/metas/${id}/retirada`, dados), sobraMesAnterior: () => api.get('/planejamento/sobra-mes-anterior'), simular: (dados) => api.post('/planejamento/simulacoes', dados), resumo: () => api.get('/planejamento/resumo') }
