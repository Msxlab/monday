import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const companyId = localStorage.getItem("selectedCompanyId")
    if (companyId) {
      config.headers["x-company-id"] = companyId
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem("refreshToken")
        if (refreshToken) {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          )
          localStorage.setItem("token", data.accessToken)
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        }
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
