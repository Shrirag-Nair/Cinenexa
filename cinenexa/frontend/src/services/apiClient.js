import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const IS_DEV = import.meta.env.DEV

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Cognito JWT to every request
instance.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // public route — no token needed
  }
  if (IS_DEV) console.log(`→ ${config.method?.toUpperCase()} ${config.url}`)
  return config
}, (error) => Promise.reject(error))

// Unwrap { success, data } envelope from Lambda responses
instance.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && body.success !== undefined) return body.data ?? body
    return body
  },
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config

    // Token expired — refresh once and retry
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const session = await fetchAuthSession({ forceRefresh: true })
        const token = session.tokens?.idToken?.toString()
        originalRequest.headers.Authorization = `Bearer ${token}`
        return instance(originalRequest)
      } catch {
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    const message = error.response?.data?.error || error.message || 'Something went wrong'
    if (IS_DEV) console.error(`API Error ${status}:`, message)
    return Promise.reject(new Error(message))
  }
)

const apiClient = {
  get:    (url, config) => instance.get(url, config),
  post:   (url, data, config) => instance.post(url, data, config),
  put:    (url, data, config) => instance.put(url, data, config),
  delete: (url, config) => instance.delete(url, config),
}

export default apiClient