import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ayarlar</h2>
        <p className="text-muted-foreground mt-1">Sistem ve uygulama ayarlarını yapılandırın</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Genel Ayarlar", desc: "Uygulama dili, tema ve görünüm tercihleri" },
          { title: "Bildirim Ayarları", desc: "E-posta, push ve uygulama içi bildirim tercihleri" },
          { title: "Entegrasyonlar", desc: "Monday.com, Slack ve diğer entegrasyonlar" },
          { title: "API Anahtarları", desc: "API erişim anahtarları ve webhook yapılandırması" },
        ].map((item) => (
          <div key={item.title} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <Settings className="w-16 h-16 text-gray-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Sistem Ayarları</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Uygulama ayarları, bildirim tercihleri ve entegrasyon yapılandırmaları.</p>
      </div>
    </div>
  )
}
