import { ClipboardList, Plus } from "lucide-react"

export default function DailyLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Günlük Loglar</h2>
          <p className="text-muted-foreground mt-1">Günlük çalışma kayıtlarını görüntüleyin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 transition-colors">
          <Plus className="w-4 h-4" /> Yeni Kayıt
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <ClipboardList className="w-16 h-16 text-cyan-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Günlük Loglar</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Günlük çalışma raporları, mesai takibi ve aktivite kayıtlarını yönetin.</p>
      </div>
    </div>
  )
}
