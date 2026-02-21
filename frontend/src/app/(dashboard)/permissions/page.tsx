import { Shield } from "lucide-react"

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">İzinler / Yetkiler</h2>
        <p className="text-muted-foreground mt-1">Kullanıcı yetki ve erişim haklarını yapılandırın</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <Shield className="w-16 h-16 text-red-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Yetki Yönetimi</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Rol tabanlı erişim kontrolü (RBAC) ile kullanıcı yetkilerini detaylı şekilde yapılandırın.</p>
      </div>
    </div>
  )
}
