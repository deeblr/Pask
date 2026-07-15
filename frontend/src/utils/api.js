import axios from 'axios'

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080')
  .replace(/\/api\/?$/, '')  // strip a trailing /api if present in the env var

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pask_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pask_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
    
  }
)


export default api
