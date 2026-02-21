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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Send, TrendingDown, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Yıllık İzin',
  sick: 'Hastalık İzni',
  excuse: 'Mazeret İzni',
  remote: 'Uzaktan Çalışma',
};

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

interface Leave {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function LeaveRequestPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    is_half_day: false,
    half_day_period: 'am',
    notes: '',
  });
  const [showForm, setShowForm] = useState(false);

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: async () => {
      const { data } = await api.get('/leaves/balance');
      return data.data as {
        year: number;
        annual_allowance: number;
        used_days: number;
        pending_days: number;
        remaining_days: number;
      };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: async () => {
      const { data } = await api.get('/leaves?limit=50');
      return data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/leaves/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast.success('İzin talebi iptal edildi');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'İptal işlemi başarısız');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/leaves', {
        leave_type: form.leave_type,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_half_day: form.is_half_day,
        half_day_period: form.is_half_day ? form.half_day_period : undefined,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('İzin talebiniz gönderildi');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      setShowForm(false);
      setForm({ leave_type: 'annual', start_date: '', end_date: '', is_half_day: false, half_day_period: 'am', notes: '' });
    },
    onError: () => toast.error('İzin talebi gönderilemedi'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      toast.error('Başlangıç ve bitiş tarihi zorunludur');
      return;
    }
    createMutation.mutate();
  };

  const leaves: Leave[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Leave Balance Card */}
      {balance && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-primary" />
              {balance.year} Yıllık İzin Bakiyesi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-500">{balance.remaining_days}</p>
                <p className="text-xs text-muted-foreground">Kalan</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{balance.used_days}</p>
                <p className="text-xs text-muted-foreground">Kullanılan</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{balance.pending_days}</p>
                <p className="text-xs text-muted-foreground">Bekleyen</p>
              </div>
            </div>
            <Progress value={(balance.used_days / balance.annual_allowance) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {balance.used_days} / {balance.annual_allowance} gün kullanıldı
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            İzin Talebi
          </h1>
          <p className="text-muted-foreground">İzin taleplerini yönetin</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Send className="mr-2 h-4 w-4" />
          Yeni Talep
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">İzin Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>İzin Tipi</Label>
                <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Başlangıç Tarihi *</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Bitiş Tarihi *</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="half-day"
                    checked={form.is_half_day}
                    onCheckedChange={(v) => setForm({ ...form, is_half_day: v })}
                  />
                  <Label htmlFor="half-day" className="cursor-pointer">Yarım gün izin</Label>
                </div>
                {form.is_half_day && (
                  <Select value={form.half_day_period} onValueChange={(v) => setForm({ ...form, half_day_period: v })}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="am">Sabah</SelectItem>
                      <SelectItem value="pm">Öğleden Sonra</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Açıklama (opsiyonel)</Label>
                <Textarea
                  placeholder="İzin sebebi..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Gönderiliyor...' : 'Talep Gönder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Geçmiş Taleplerim</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Henüz izin talebi bulunmuyor.</div>
          ) : (
            <div className="divide-y">
              {leaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{LEAVE_TYPE_LABELS[leave.leave_type]}</span>
                      {leave.is_half_day && <Badge variant="secondary" className="text-xs">Yarım Gün</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(leave.start_date), 'd MMM yyyy', { locale: tr })}
                      {leave.start_date !== leave.end_date && ` — ${format(new Date(leave.end_date), 'd MMM yyyy', { locale: tr })}`}
                    </p>
                    {leave.rejection_reason && (
                      <p className="text-xs text-red-500 mt-0.5 italic">{leave.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border text-xs ${LEAVE_STATUS_COLORS[leave.status]}`}>
                      {LEAVE_STATUS_LABELS[leave.status]}
                    </Badge>
                    {leave.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(leave.id)}
                        title="İptal Et"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
