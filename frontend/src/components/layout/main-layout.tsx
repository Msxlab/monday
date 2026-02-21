"use client"

import React from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { ChatPanel } from "@/components/ai/chat-panel"

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <ChatPanel />
    </div>
  )
}
