'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UserCog, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ROLE_LABELS } from '@/lib/constants';

interface UserOverride {
  id: number;
  user_id: number;
  field_name: string;
  resource_type: string;
  can_view: boolean;
  can_edit: boolean;
  expires_at: string | null;
  reason: string | null;
  created_at: string;
  user: { id: number; first_name: string; last_name: string; role: string; email: string };
  set_by: { id: number; first_name: string; last_name: string };
}

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const RESOURCE_TYPES = ['project', 'project_financial', 'project_client', 'user', 'audit_log'];
const FIELD_NAMES = ['view', 'edit', 'create', 'delete', 'export_csv', 'manage'];

export default function UserPermissionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    field_name: 'view',
    resource_type: 'project',
    can_view: true,
    can_edit: false,
    expires_at: '',
    reason: '',
  });

  const { data: overrides, isLoading } = useQuery<UserOverride[]>({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data } = await api.get('/user-permissions');
      return data.data;
    },
  });

  const { data: users } = useQuery<UserItem[]>({
    queryKey: ['users-simple'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=200');
      return data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put('/user-permissions', {
        user_id: parseInt(form.user_id),
        field_name: form.field_name,
        resource_type: form.resource_type,
        can_view: form.can_view,
        can_edit: form.can_edit,
        expires_at: form.expires_at || null,
        reason: form.reason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Kişisel yetki kaydedildi');
      setOpen(false);
    },
    onError: () => toast.error('Kaydetme başarısız'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/user-permissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Override silindi');
    },
    onError: () => toast.error('Silme başarısız'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Kişisel Yetki Override
          </h1>
          <p className="text-muted-foreground">Kullanıcı bazlı özel yetki tanımları — rol yetkilerini geçersiz kılar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Yeni Override</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Kişisel Yetki Override</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Kullanıcı</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm((p) => ({ ...p, user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Kullanıcı seç" /></SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.first_name} {u.last_name} ({ROLE_LABELS[u.role] ?? u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kaynak Tipi</Label>
                  <Select value={form.resource_type} onValueChange={(v) => setForm((p) => ({ ...p, resource_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESOURCE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alan Adı</Label>
                  <Select value={form.field_name} onValueChange={(v) => setForm((p) => ({ ...p, field_name: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.can_view} onCheckedChange={(v) => setForm((p) => ({ ...p, can_view: v }))} />
                  <Label>Görüntüle</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.can_edit} onCheckedChange={(v) => setForm((p) => ({ ...p, can_edit: v }))} />
                  <Label>Düzenle</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi (opsiyonel)</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Neden (opsiyonel)</Label>
                <Input placeholder="Override sebebi..." value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
              </div>
              <Button className="w-full" disabled={!form.user_id || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Aktif Override&apos;lar</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !overrides || overrides.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">Henüz kişisel override tanımlı değil.</p>
          ) : (
            <div className="divide-y">
              {overrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {o.user.first_name[0]}{o.user.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{o.user.first_name} {o.user.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.resource_type} / {o.field_name} •{' '}
                        {o.can_view && <span className="text-emerald-500">Görüntüle</span>}
                        {o.can_view && o.can_edit && ' + '}
                        {o.can_edit && <span className="text-blue-500">Düzenle</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.expires_at && (
                      <Badge variant="outline" className="text-xs">
                        Bitiş: {format(new Date(o.expires_at), 'd MMM yyyy', { locale: tr })}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(o.id)}
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
