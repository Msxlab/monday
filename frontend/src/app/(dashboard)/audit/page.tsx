import { FileSearch, Search } from "lucide-react"

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Denetim Kayıtları</h2>
        <p className="text-muted-foreground mt-1">Sistem aktivitelerini ve değişiklikleri takip edin</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Kayıt ara..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <FileSearch className="w-16 h-16 text-yellow-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Denetim Kayıtları</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Tüm sistem aktiviteleri, kullanıcı işlemleri ve veri değişiklikleri burada kayıt altında tutulur.</p>
      </div>
    </div>
  )
}
