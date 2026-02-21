import { FolderKanban, Plus, Search } from "lucide-react"

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projeler</h2>
          <p className="text-muted-foreground mt-1">Tüm projeleri yönetin ve takip edin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Yeni Proje
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Proje ara..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <FolderKanban className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Proje Yönetimi</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Projelerinizi oluşturun, düzenleyin ve ekibinizle birlikte takip edin. Alt görevler, etiketler ve yorumlar ile detaylı yönetim.</p>
      </div>
    </div>
  )
}
