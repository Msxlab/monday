import { Bell } from "lucide-react"

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Bildirimler</h2>
        <p className="text-muted-foreground mt-1">Tüm bildirimlerinizi görüntüleyin</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <Bell className="w-16 h-16 text-amber-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Bildirimler</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Proje güncellemeleri, görev atamaları, izin onayları ve sistem bildirimleri.</p>
      </div>
    </div>
  )
}
