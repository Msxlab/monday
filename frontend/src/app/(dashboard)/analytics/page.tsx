import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analitik</h2>
        <p className="text-muted-foreground mt-1">Detaylı analiz ve raporlar</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <BarChart3 className="w-16 h-16 text-violet-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Analitik Paneli</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Proje performansı, ekip verimliliği ve iş süreçleri hakkında detaylı grafikler ve raporlar.</p>
      </div>
    </div>
  )
}
