'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ChatItem {
  role: 'user' | 'assistant';
  message: string;
}

export default function AIChatPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = query.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', message: text }]);
    setQuery('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/ai/query', { query: text });
      const reply = data?.data?.answer || data?.answer || 'Yanıt alınamadı.';
      setMessages((prev) => [...prev, { role: 'assistant', message: String(reply) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', message: 'İstek başarısız oldu.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Asistan</h1>
          <p className="text-muted-foreground">/api/ai/query endpoint&apos;ine bağlı sohbet ekranı.</p>
        </div>
        <Button variant="outline" onClick={() => setMessages([])}>Sohbeti Temizle</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mesaj Yaz</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sorunuzu yazın..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage();
            }}
          />
          <Button onClick={sendMessage} disabled={loading || !query.trim()}>
            {loading ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konuşma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz mesaj yok.</p>
          ) : (
            messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className="rounded-lg border p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{item.role}</p>
                <p className="text-sm">{item.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
