import { CalendarOff, Plus } from "lucide-react"

export default function LeavesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">İzin Yönetimi</h2>
          <p className="text-muted-foreground mt-1">İzin taleplerini yönetin ve takip edin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
          <Plus className="w-4 h-4" /> Yeni İzin Talebi
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <CalendarOff className="w-16 h-16 text-rose-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">İzin Yönetimi</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Yıllık izin, hastalık izni ve diğer izin türlerini talep edin, onaylayın ve takip edin.</p>
      </div>
    </div>
  )
}
