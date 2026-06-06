import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fincontrol_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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

export const authService = {
  cadastrar: (dados) => api.post('/usuarios/cadastro', dados),
  login: (dados) => api.post('/usuarios/login', dados),
  perfil: () => api.get('/usuarios/me'),
}

export const movimentacoesService = {
  listar: (params) => api.get('/movimentacoes/', { params }),
  criar: (dados) => api.post('/movimentacoes/', dados),
  atualizar: (id, dados) => api.put(`/movimentacoes/${id}`, dados),
  excluir: (id) => api.delete(`/movimentacoes/${id}`),
}

export const dashboardService = {
  resumo: (params) => api.get('/dashboard/resumo', { params }),
  categorias: () => api.get('/dashboard/categorias'),
  relatorio: (params) => api.get('/dashboard/relatorio', { params }),
}
