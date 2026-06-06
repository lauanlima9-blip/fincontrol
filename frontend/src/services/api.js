import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Injeta token em cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fincontrol_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redireciona para login se 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fincontrol_token')
      localStorage.removeItem('fincontrol_usuario')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Usuários ─────────────────────────────────────────────────────────────────
export const authService = {
  cadastrar: (dados) => api.post('/usuarios/cadastro', dados),
  login: (dados) => api.post('/usuarios/login', dados),
  perfil: () => api.get('/usuarios/me'),
}

// ── Movimentações ─────────────────────────────────────────────────────────────
export const movimentacoesService = {
  listar: (params) => api.get('/movimentacoes/', { params }),
  criar: (dados) => api.post('/movimentacoes/', dados),
  atualizar: (id, dados) => api.put(`/movimentacoes/${id}`, dados),
  excluir: (id) => api.delete(`/movimentacoes/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardService = {
  resumo: (params) => api.get('/dashboard/resumo', { params }),
  categorias: () => api.get('/dashboard/categorias'),
  relatorio: (params) => api.get('/dashboard/relatorio', { params }),
}
