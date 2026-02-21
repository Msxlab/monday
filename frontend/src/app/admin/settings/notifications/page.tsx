'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Bell, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface NotificationRule {
  id: number;
  rule_name: string;
  rule_type: string;
  trigger_condition: string;
  threshold_value: number | null;
  threshold_unit: string | null;
  target_roles: string | null;
  channels: string;
  is_active: boolean;
}

export default function NotificationRulesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    rule_name: '',
    rule_type: 'deadline_warning',
    trigger_condition: 'days_before_deadline',
    threshold_value: '3',
    threshold_unit: 'days',
    target_roles: 'designer,admin',
    channels: 'in_app',
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['notification-rules'],
    queryFn: async () => {
      const { data } = await api.get('/settings/notification-rules');
      return data.data as NotificationRule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/settings/notification-rules', {
        ...form,
        threshold_value: form.threshold_value ? parseInt(form.threshold_value) : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Kural oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      setCreateOpen(false);
    },
    onError: () => toast.error('Kural oluşturulamadı'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.patch(`/settings/notification-rules/${id}`, { is_active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/settings/notification-rules/${id}`);
    },
    onSuccess: () => {
      toast.success('Kural silindi');
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Geri</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Bildirim Kuralları
          </h1>
          <p className="text-muted-foreground">Otomatik bildirim tetikleyicilerini yönetin</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Yeni Kural</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Bildirim Kuralı Oluştur</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Kural Adı</Label>
                <Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} placeholder="Deadline uyarısı..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Eşik Değeri</Label>
                  <Input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Birim</Label>
                  <Input value={form.threshold_unit} onChange={(e) => setForm({ ...form, threshold_unit: e.target.value })} placeholder="days" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hedef Roller (virgülle)</Label>
                <Input value={form.target_roles} onChange={(e) => setForm({ ...form, target_roles: e.target.value })} placeholder="designer,admin" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.rule_name}>
                  Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Kurallar</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !rules || rules.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Henüz kural eklenmemiş.</div>
          ) : (
            <div className="divide-y">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{rule.rule_name}</span>
                      <Badge variant="outline" className="text-xs">{rule.rule_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.threshold_value} {rule.threshold_unit} — Hedef: {rule.target_roles}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(v: boolean) => toggleMutation.mutate({ id: rule.id, is_active: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
