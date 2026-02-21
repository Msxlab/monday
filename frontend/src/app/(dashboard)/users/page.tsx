import { Users, Plus, Search } from "lucide-react"

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kullanıcılar</h2>
          <p className="text-muted-foreground mt-1">Kullanıcıları ve rollerini yönetin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus className="w-4 h-4" /> Kullanıcı Ekle
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Kullanıcı ara..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <Users className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Kullanıcı Yönetimi</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Kullanıcıları ekleyin, düzenleyin, rol atayın ve erişim yetkilerini yönetin.</p>
      </div>
    </div>
  )
}
