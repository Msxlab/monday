import { LayoutDashboard, FolderKanban, Factory, DollarSign, Users, BarChart3 } from "lucide-react"

const stats = [
  { label: "Aktif Projeler", value: "24", icon: FolderKanban, color: "from-blue-500 to-indigo-600", change: "+3" },
  { label: "Üretim Siparişleri", value: "156", icon: Factory, color: "from-orange-500 to-amber-600", change: "+12" },
  { label: "Toplam Gelir", value: "₺2.4M", icon: DollarSign, color: "from-emerald-500 to-teal-600", change: "+8%" },
  { label: "Takım Üyeleri", value: "48", icon: Users, color: "from-violet-500 to-purple-600", change: "+2" },
  { label: "Tamamlanan Görevler", value: "342", icon: BarChart3, color: "from-rose-500 to-pink-600", change: "+28" },
  { label: "Bekleyen İzinler", value: "7", icon: LayoutDashboard, color: "from-cyan-500 to-sky-600", change: "-2" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ana Sayfa</h2>
        <p className="text-muted-foreground mt-1">Projelere ve aktivitelere genel bakış</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">{stat.change} bu ay</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Son Aktiviteler</h3>
          <div className="space-y-3">
            {["Yeni proje oluşturuldu: Webiste Redesign", "Üretim siparişi #1042 tamamlandı", "Ahmet Yılmaz izin talebi gönderdi", "Finans raporu güncellendi"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Yaklaşan Görevler</h3>
          <div className="space-y-3">
            {["Landing page tasarımı — 2 gün kaldı", "Müşteri sunumu — 3 gün kaldı", "Sprint planlama toplantısı — 5 gün kaldı", "Aylık rapor teslimi — 1 hafta kaldı"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
