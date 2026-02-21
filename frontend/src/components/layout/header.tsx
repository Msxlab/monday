"use client"

import React, { useState, useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Bell, User, LogOut, Settings, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title?: string
}

export function Header({ title = "Ana Sayfa" }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: page title */}
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Tema değiştir"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-medium">
                K
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground">Kullanıcı</span>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Kullanıcı Adı</p>
                  <p className="text-xs text-muted-foreground">admin@sirket.com</p>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                    <User className="w-4 h-4" /> Profil
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                    <Settings className="w-4 h-4" /> Ayarlar
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
