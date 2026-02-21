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
import { TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuthStore } from '@/lib/auth-store';
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

export default function RoleUpgradePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const { data: requests, isLoading } = useQuery<UpgradeRequest[]>({
    queryKey: ['my-role-upgrades'],
    queryFn: async () => {
      const { data } = await api.get('/role-upgrades/my');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/role-upgrades', { reason: reason || undefined });
    },
    onSuccess: () => {
      toast.success('Rol yükseltme talebiniz gönderildi');
      queryClient.invalidateQueries({ queryKey: ['my-role-upgrades'] });
      setReason('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Talep gönderilemedi');
    },
  });

  const canRequest = user && ['designer', 'senior_designer'].includes(user.role);
  const hasPending = requests?.some((r) => r.status === 'pending');
  const nextRole = user?.role === 'designer' ? 'senior_designer' : 'admin';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Rol Yükseltme Talebi
        </h1>
        <p className="text-muted-foreground">
          Mevcut rol: <strong>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</strong>
        </p>
      </div>

      {canRequest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {hasPending ? 'Bekleyen Talebiniz Var' : `${ROLE_LABELS[nextRole] ?? nextRole} olmak için talep oluştur`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPending ? (
              <p className="text-muted-foreground text-sm">Bekleyen bir yükseltme talebiniz bulunuyor. Sonucu bekleyin.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Neden (opsiyonel)</Label>
                  <Textarea
                    placeholder="Deneyiminizi ve neden yükseltilmek istediğinizi açıklayın..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {createMutation.isPending ? 'Gönderiliyor...' : 'Talep Gönder'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Talep Geçmişi</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !requests || requests.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground text-sm">Henüz talep bulunmuyor.</p>
          ) : (
            <div className="divide-y">
              {requests.map((req) => (
                <div key={req.id} className="px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {req.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {req.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                      {req.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                      <span className="text-sm font-medium">
                        {ROLE_LABELS[req.from_role] ?? req.from_role} → {ROLE_LABELS[req.to_role] ?? req.to_role}
                      </span>
                    </div>
                    <Badge className={`border text-xs ${STATUS_STYLES[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(req.created_at), 'd MMM yyyy', { locale: tr })}
                    {req.reviewer && ` • İnceleyen: ${req.reviewer.first_name} ${req.reviewer.last_name}`}
                  </p>
                  {req.review_note && (
                    <p className="text-xs text-muted-foreground mt-1 italic">Not: {req.review_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
