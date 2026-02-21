import { Tags, Plus } from "lucide-react"

export default function TagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Etiketler</h2>
          <p className="text-muted-foreground mt-1">Proje ve görev etiketlerini yönetin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
          <Plus className="w-4 h-4" /> Yeni Etiket
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <Tags className="w-16 h-16 text-teal-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Etiket Yönetimi</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Projelerinizi ve görevlerinizi kategorize etmek için etiketler oluşturun ve yönetin.</p>
      </div>
    </div>
  )
}
