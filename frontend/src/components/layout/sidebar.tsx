"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCompanyStore } from "@/stores/company-store"
import {
  LayoutDashboard,
  FolderKanban,
  Factory,
  DollarSign,
  BarChart3,
  CalendarOff,
  ClipboardList,
  Users,
  Shield,
  Settings,
  FileSearch,
  Bell,
  Tags,
  Bot,
  Building2,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react"

const navGroups = [
  {
    label: "Ana Menü",
    items: [
      { label: "Ana Sayfa", href: "/", icon: LayoutDashboard, color: "text-indigo-500" },
      { label: "Analitik", href: "/analytics", icon: BarChart3, color: "text-violet-500" },
      { label: "Bildirimler", href: "/notifications", icon: Bell, color: "text-amber-500" },
    ],
  },
  {
    label: "Projeler",
    items: [
      { label: "Projeler", href: "/projects", icon: FolderKanban, color: "text-blue-500" },
      { label: "Etiketler", href: "/tags", icon: Tags, color: "text-teal-500" },
    ],
  },
  {
    label: "Üretim",
    items: [
      { label: "Üretim Siparişleri", href: "/production", icon: Factory, color: "text-orange-500" },
    ],
  },
  {
    label: "Finans",
    items: [
      { label: "Finans", href: "/finance", icon: DollarSign, color: "text-emerald-500" },
    ],
  },
  {
    label: "İK",
    items: [
      { label: "İzin Yönetimi", href: "/leaves", icon: CalendarOff, color: "text-rose-500" },
      { label: "Günlük Loglar", href: "/daily-logs", icon: ClipboardList, color: "text-cyan-500" },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { label: "Kullanıcılar", href: "/users", icon: Users, color: "text-purple-500" },
      { label: "İzinler/Yetkiler", href: "/permissions", icon: Shield, color: "text-red-500" },
      { label: "Ayarlar", href: "/settings", icon: Settings, color: "text-gray-500" },
      { label: "Denetim Kayıtları", href: "/audit", icon: FileSearch, color: "text-yellow-600" },
      { label: "Şirketler", href: "/companies", icon: Building2, color: "text-sky-500" },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "AI Asistan", href: "/ai-chat", icon: Bot, color: "text-fuchsia-500" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { companies, selectedCompany, selectCompany } = useCompanyStore()
  const [companyOpen, setCompanyOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Company Selector */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <button
            onClick={() => setCompanyOpen(!companyOpen)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "bg-white/10 hover:bg-white/15 transition-colors",
              "text-white text-sm font-medium"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {selectedCompany?.name?.charAt(0) || "Ş"}
            </div>
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left">{selectedCompany?.name || "Şirket Seç"}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", companyOpen && "rotate-180")} />
              </>
            )}
          </button>
          {companyOpen && !collapsed && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => { selectCompany(company); setCompanyOpen(false) }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors",
                    selectedCompany?.id === company.id && "bg-white/10 text-white"
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-[10px]">
                    {company.name.charAt(0)}
                  </div>
                  {company.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/15 text-white shadow-lg shadow-indigo-500/10"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : item.color)} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button (desktop) */}
      <div className="hidden lg:block p-3 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Daralt</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-indigo-600 text-white shadow-lg"
        aria-label="Menüyü aç"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-white/50 hover:text-white"
          aria-label="Menüyü kapat"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-300",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
