'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft, BarChart3, FolderKanban, AlertTriangle, RefreshCw,
  CheckCircle2, Target, CalendarDays, Edit, UserX, UserCheck,
} from 'lucide-react';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Designer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  max_capacity: number;
  is_active: boolean;
  avatar_url: string | null;
  country_code: string | null;
  skills: string | null;
  _count: { assigned_projects: number };
}

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  created_at: string;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export default function DesignerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const designerId = parseInt(id);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', max_capacity: 5, skills: '' });

  const { data: designer, isLoading: designerLoading } = useQuery({
    queryKey: ['designer', designerId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${designerId}`);
      return data.data as Designer;
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['designer-projects', designerId],
    queryFn: async () => {
      const { data } = await api.get(`/projects?designer_id=${designerId}&limit=50`);
      return data.data as Project[];
    },
  });

  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['designer-performance', designerId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/designers?designerId=${designerId}`);
      return (data.data as unknown[])[0] as {
        activeProjects: number; maxCapacity: number; capacityPct: number;
        completedThisMonth: number; completedLast90Days: number;
        overdueProjects: number; revisionCount: number;
      } | undefined;
    },
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['monthly-trend', designerId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/monthly-trend?designerId=${designerId}`);
      return data.data as { month: string; completed: number; started: number }[];
    },
  });

  const { data: leaves } = useQuery({
    queryKey: ['designer-leaves', designerId],
    queryFn: async () => {
      const { data } = await api.get(`/leaves?userId=${designerId}&limit=10`);
      return data.data as { id: number; leave_type: string; start_date: string; end_date: string; status: string }[];
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/users/${designerId}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        max_capacity: editForm.max_capacity,
        skills: editForm.skills || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designer', designerId] });
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      toast.success('Tasarımcı bilgileri güncellendi');
      setEditOpen(false);
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (is_active: boolean) => {
      await api.patch(`/users/${designerId}`, { is_active });
    },
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ['designer', designerId] });
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      toast.success(is_active ? 'Hesap aktifleştirildi' : 'Hesap deaktive edildi');
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  if (designerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!designer) return <div className="text-muted-foreground">Tasarımcı bulunamadı.</div>;

  const initials = `${designer.first_name[0]}${designer.last_name[0]}`.toUpperCase();
  const capacityPct = performance?.capacityPct ?? 0;

  const activeProjects = projects?.filter((p) => !['done', 'cancelled'].includes(p.status)) ?? [];
  const completedProjects = projects?.filter((p) => p.status === 'done') ?? [];

  const perfCards = [
    { label: 'Bu Ay Tamamlanan', value: performance?.completedThisMonth, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: '90 Günde Tamamlanan', value: performance?.completedLast90Days, icon: <Target className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Geciken', value: performance?.overdueProjects, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Revizyon (90 Gün)', value: performance?.revisionCount, icon: <RefreshCw className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/designers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleActiveMutation.mutate(!designer.is_active)}
            disabled={toggleActiveMutation.isPending}
            className={designer.is_active ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' : 'border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10'}
          >
            {designer.is_active ? <><UserX className="h-4 w-4 mr-1" />Deaktive Et</> : <><UserCheck className="h-4 w-4 mr-1" />Aktifleştir</>}
          </Button>
          <Dialog open={editOpen} onOpenChange={(o) => {
            if (o) setEditForm({ first_name: designer.first_name, last_name: designer.last_name, max_capacity: designer.max_capacity, skills: '' });
            setEditOpen(o);
          }}>
            <DialogTrigger asChild>
              <Button size="sm"><Edit className="h-4 w-4 mr-1" />Düzenle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tasarımcı Düzenle</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ad</Label>
                    <Input value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Soyad</Label>
                    <Input value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Maksimum Kapasite (Proje)</Label>
                  <Input type="number" min={1} max={20} value={editForm.max_capacity} onChange={(e) => setEditForm((p) => ({ ...p, max_capacity: parseInt(e.target.value) || 5 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Uzmanlık Alanları (virgülle ayırın)</Label>
                  <Input placeholder="UI, Grafik, 3D, Logo..." value={editForm.skills} onChange={(e) => setEditForm((p) => ({ ...p, skills: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={editMutation.isPending} onClick={() => editMutation.mutate()}>
                  {editMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Designer Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{designer.first_name} {designer.last_name}</h1>
                {!designer.is_active && <Badge variant="destructive" className="text-xs">Pasif</Badge>}
              </div>
              <p className="text-muted-foreground">{designer.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{designer.role.replace('_', ' ')}</Badge>
                {designer.country_code && <Badge variant="secondary">{designer.country_code}</Badge>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Kapasite</p>
              <div className="text-2xl font-bold">{performance?.activeProjects ?? designer._count.assigned_projects}/{designer.max_capacity}</div>
              <Progress value={capacityPct} className="h-2 w-32 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {perfCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <div className={`rounded-lg p-2 ${c.bg}`}>
                <span className={c.color}>{c.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              {perfLoading ? <Skeleton className="h-9 w-12" /> : (
                <div className="text-3xl font-bold">{c.value ?? '-'}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Projects Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aylık Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="completed" name="Tamamlanan" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-52 items-center justify-center text-muted-foreground text-sm">Veri yok</div>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Aktif Projeler ({activeProjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projectsLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activeProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aktif proje yok</div>
            ) : (
              <div className="divide-y max-h-56 overflow-y-auto">
                {activeProjects.map((p) => (
                  <Link key={p.id} href={`/admin/projects/${p.id}`}>
                    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{p.nj_number}</span>
                        <p className="text-sm font-medium truncate max-w-48">{p.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${PROJECT_STATUS_COLORS[p.status]}`}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </span>
                        {p.deadline && new Date(p.deadline) < new Date() && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leave History */}
      {leaves && leaves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Son İzinler
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaves.slice(0, 5).map((leave) => (
                <div key={leave.id} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm capitalize">{leave.leave_type.replace('_', ' ')}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(leave.start_date), 'd MMM', { locale: tr })}
                    {' — '}
                    {format(new Date(leave.end_date), 'd MMM yyyy', { locale: tr })}
                  </span>
                  <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                    {leave.status === 'approved' ? 'Onaylandı' : leave.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tamamlanan Projeler ({completedProjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {completedProjects.slice(0, 10).map((p) => (
                <Link key={p.id} href={`/admin/projects/${p.id}`}>
                  <div className="flex items-center justify-between px-6 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{p.nj_number}</span>
                      <span className="text-sm">{p.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), 'd MMM yyyy', { locale: tr })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
