import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react"

const financeStats = [
  { label: "Toplam Gelir", value: "₺2,450,000", icon: TrendingUp, color: "text-emerald-500" },
  { label: "Toplam Gider", value: "₺1,820,000", icon: TrendingDown, color: "text-rose-500" },
  { label: "Net Kâr", value: "₺630,000", icon: Wallet, color: "text-indigo-500" },
]

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Finans</h2>
        <p className="text-muted-foreground mt-1">Finansal verileri ve raporları görüntüleyin</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {financeStats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <DollarSign className="w-16 h-16 text-emerald-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Finans Yönetimi</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Gelir-gider takibi, fatura yönetimi ve finansal raporlama araçları.</p>
      </div>
    </div>
  )
}
