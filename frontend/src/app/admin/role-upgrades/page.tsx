'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ROLE_LABELS } from '@/lib/constants';

interface UpgradeRequest {
  id: number;
  from_role: string;
  to_role: string;
  reason: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  user: { id: number; first_name: string; last_name: string; role: string; email: string };
  reviewer: { first_name: string; last_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi',
};

export default function AdminRoleUpgradesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dialog, setDialog] = useState<{ open: boolean; req: UpgradeRequest | null; action: 'approve' | 'reject' | null }>({
    open: false, req: null, action: null,
  });
  const [note, setNote] = useState('');

  const { data: requests, isLoading } = useQuery<UpgradeRequest[]>({
    queryKey: ['role-upgrades', statusFilter],
    queryFn: async () => {
      const { data } = await api.get(`/role-upgrades?status=${statusFilter}`);
      return data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      await api.patch(`/role-upgrades/${id}/approve`, { note: note || undefined });
    },
    onSuccess: () => {
      toast.success('Rol yükseltme onaylandı');
      queryClient.invalidateQueries({ queryKey: ['role-upgrades'] });
      setDialog({ open: false, req: null, action: null });
      setNote('');
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      await api.patch(`/role-upgrades/${id}/reject`, { note: note || undefined });
    },
    onSuccess: () => {
      toast.success('Rol yükseltme reddedildi');
      queryClient.invalidateQueries({ queryKey: ['role-upgrades'] });
      setDialog({ open: false, req: null, action: null });
      setNote('');
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Rol Yükseltme Talepleri
          </h1>
          <p className="text-muted-foreground">Designer rol yükseltme taleplerini inceleyin</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Bekleyenler</SelectItem>
            <SelectItem value="approved">Onaylananlar</SelectItem>
            <SelectItem value="rejected">Reddedilenler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Talepler</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !requests || requests.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">Bu kategoride talep bulunmuyor.</p>
          ) : (
            <div className="divide-y">
              {requests.map((req) => (
                <div key={req.id} className="flex items-start justify-between px-4 py-4 hover:bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {req.user.first_name[0]}{req.user.last_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{req.user.first_name} {req.user.last_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[req.from_role] ?? req.from_role} → {ROLE_LABELS[req.to_role] ?? req.to_role}
                        </Badge>
                        <Badge className={`border text-xs ${STATUS_STYLES[req.status]}`}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.user.email}</p>
                      {req.reason && (
                        <p className="text-sm mt-1 text-muted-foreground max-w-md">{req.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(req.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
                        {req.reviewed_at && ` • İncelendi: ${format(new Date(req.reviewed_at), 'd MMM yyyy', { locale: tr })}`}
                      </p>
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 ml-4 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                        onClick={() => setDialog({ open: true, req, action: 'approve' })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => setDialog({ open: true, req, action: 'reject' })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reddet
                      </Button>
                    </div>
                  )}
                  {req.status !== 'pending' && req.reviewer && (
                    <span className="text-xs text-muted-foreground ml-4 shrink-0">
                      {req.reviewer.first_name} {req.reviewer.last_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(open) => { setDialog({ open, req: null, action: null }); setNote(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialog.action === 'approve' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              {dialog.action === 'approve' ? 'Rol Yükseltmeyi Onayla' : 'Rol Yükseltmeyi Reddet'}
            </DialogTitle>
          </DialogHeader>
          {dialog.req && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                <strong>{dialog.req.user.first_name} {dialog.req.user.last_name}</strong> için{' '}
                {ROLE_LABELS[dialog.req.from_role] ?? dialog.req.from_role} →{' '}
                {ROLE_LABELS[dialog.req.to_role] ?? dialog.req.to_role}
              </p>
              <div className="space-y-2">
                <Label>Not (opsiyonel)</Label>
                <Textarea
                  placeholder="Bir not ekleyin..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialog({ open: false, req: null, action: null }); setNote(''); }}>
                  İptal
                </Button>
                <Button
                  variant={dialog.action === 'approve' ? 'default' : 'destructive'}
                  onClick={() => {
                    if (!dialog.req) return;
                    if (dialog.action === 'approve') {
                      approveMutation.mutate({ id: dialog.req.id, note });
                    } else {
                      rejectMutation.mutate({ id: dialog.req.id, note });
                    }
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {dialog.action === 'approve' ? 'Onayla' : 'Reddet'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
