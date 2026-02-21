"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      // Simulated login
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/")
    } catch {
      setError("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">Proje Yönetim</span>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Projelerinizi<br />akıllıca yönetin
          </h1>
          <p className="text-lg text-white/70 max-w-md">
            Ekibinizle birlikte projeleri takip edin, üretim süreçlerini optimize edin ve iş akışlarınızı dijitalleştirin.
          </p>
        </div>
        <p className="text-sm text-white/40">© 2024 Proje Yönetim Sistemi</p>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-foreground">Proje Yönetim</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Giriş Yap</h2>
            <p className="text-muted-foreground mt-2">Hesabınıza giriş yaparak devam edin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" className="rounded border-border" />
                Beni hatırla
              </label>
              <button type="button" className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                Şifremi unuttum
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium text-sm hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Giriş Yap
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
