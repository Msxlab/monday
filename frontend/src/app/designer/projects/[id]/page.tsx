'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Calendar, FileText, History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DESIGNER_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['designing'],
  designing: ['review', 'revision'],
  revision: ['designing'],
  review: [],
  approved: [],
  in_production: [],
  done: [],
  cancelled: [],
};

export default function DesignerProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/projects/${id}/status`, { status: newStatus, reason: statusReason || undefined });
    },
    onSuccess: () => {
      toast.success('Durum guncellendi');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusReason('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Durum guncellenemedi');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return <div className="py-20 text-center text-muted-foreground">Proje bulunamadi.</div>;
  }

  const allowedTransitions = DESIGNER_STATUS_TRANSITIONS[project.status] || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{project.nj_number}</h1>
              <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white`}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
              <Badge variant="outline" className={PRIORITY_COLORS[project.priority]}>
                {PRIORITY_LABELS[project.priority]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{project.title}</p>
          </div>
        </div>

        {allowedTransitions.length > 0 && (
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button><RefreshCw className="mr-2 h-4 w-4" />Durum Guncelle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Durum Guncelle</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Mevcut</Label>
                  <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Yeni Durum</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue placeholder="Sec..." /></SelectTrigger>
                    <SelectContent>
                      {allowedTransitions.map((s) => (
                        <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Not (opsiyonel)</Label>
                  <Input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Not..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Iptal</Button>
                  <Button onClick={() => statusMutation.mutate()} disabled={!newStatus || statusMutation.isPending}>
                    {statusMutation.isPending ? 'Guncelleniyor...' : 'Onayla'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Proje Bilgileri */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" />Proje Bilgileri</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="NJ Numarasi" value={project.nj_number} />
                <InfoRow label="Proje Adi" value={project.title} />
                <InfoRow label="Proje Tipi" value={project.project_type?.replace('_', ' ')} />
                <InfoRow label="Ulke" value={project.country_target} />
              </div>
              {project.notes && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Proje Notu</p>
                  <p className="text-sm">{project.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarihler */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5" />Tarihler</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="Baslangic" value={project.start_date ? new Date(project.start_date).toLocaleDateString('tr-TR') : '-'} />
                <InfoRow label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString('tr-TR') : '-'} />
              </div>
            </CardContent>
          </Card>

          {/* Revizyonlar */}
          {project.revisions && project.revisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5" />Revizyonlar ({project.revisions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.revisions.map((rev: { id: number; revision_number: number; revision_type: string; description?: string; created_at: string }) => (
                    <div key={rev.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Badge variant="outline">#{rev.revision_number}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{rev.revision_type.replace('_', ' ')}</p>
                        {rev.description && <p className="text-sm text-muted-foreground mt-1">{rev.description}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(rev.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Durum Gecmisi */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5" />Durum Gecmisi</CardTitle></CardHeader>
            <CardContent>
              {project.status_history && project.status_history.length > 0 ? (
                <div className="space-y-3">
                  {project.status_history.map((h: { id: number; from_status: string | null; to_status: string; changed_at: string; changed_by?: { first_name: string; last_name: string } }) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {h.from_status && (
                            <>
                              <Badge variant="outline" className="text-xs">{PROJECT_STATUS_LABELS[h.from_status]}</Badge>
                              <span className="text-xs text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge className={`${PROJECT_STATUS_COLORS[h.to_status]} text-white text-xs`}>
                            {PROJECT_STATUS_LABELS[h.to_status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(h.changed_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Gecmis yok.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '-'}</p>
    </div>
  );
}
