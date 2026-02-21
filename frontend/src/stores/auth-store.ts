import { create } from "zustand"
import api from "@/lib/api"

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password })
    localStorage.setItem("token", data.accessToken)
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken)
    }
    set({
      user: data.user,
      token: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  setUser: (user: User) => set({ user, isAuthenticated: true, isLoading: false }),

  checkAuth: () => {
    const token = localStorage.getItem("token")
    if (token) {
      set({ token, isAuthenticated: true, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },
}))
