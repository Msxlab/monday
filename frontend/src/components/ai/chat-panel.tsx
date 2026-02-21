"use client"

import React, { useState, useRef, useEffect } from "react"
import { Bot, Send, X, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "ai"
  content: string
  timestamp: Date
}

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Merhaba! Ben AI Asistanınızım. Size nasıl yardımcı olabilirim?",
      timestamp: new Date(),
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")

    // Simulated AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Talebinizi aldım. Bu özellik yakında aktif olacak. Şimdilik size başka nasıl yardımcı olabilirim?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    }, 1000)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl",
            "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
            "flex items-center justify-center",
            "hover:shadow-2xl hover:scale-105 transition-all duration-200",
            "animate-bounce-gentle"
          )}
          aria-label="AI Asistan"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom-4"
        )} style={{ height: "500px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">AI Asistan</p>
                <p className="text-[11px] text-white/70">Çevrimiçi</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <Minimize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-indigo-500 text-white rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {msg.content}
                  <p className={cn(
                    "text-[10px] mt-1",
                    msg.role === "user" ? "text-white/60" : "text-muted-foreground"
                  )}>
                    {msg.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Mesajınızı yazın..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  "p-2.5 rounded-xl transition-all",
                  input.trim()
                    ? "bg-indigo-500 text-white hover:bg-indigo-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
