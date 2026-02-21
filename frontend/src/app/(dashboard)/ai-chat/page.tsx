import { Bot } from "lucide-react"

export default function AiChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Asistan</h2>
        <p className="text-muted-foreground mt-1">Yapay zeka destekli asistanınız</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <Bot className="w-16 h-16 text-fuchsia-500/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">AI Asistan</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Proje önerileri, veri analizi ve akıllı raporlama için AI destekli asistanınızı kullanın. Sağ alt köşedeki sohbet butonunu da kullanabilirsiniz.</p>
      </div>
    </div>
  )
}
