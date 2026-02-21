'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, Clock, Factory, Users, FolderKanban, CalendarDays,
  CheckCircle2, ArrowRight, TrendingUp, Plus, Zap, UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { PROJECT_STATUS_LABELS } from '@/lib/constants';

interface Project {
  id: number; nj_number: string; title: string; status: string;
  priority: string; deadline: string | null;
  assigned_designer: { first_name: string; last_name: string } | null;
}

interface Leave {
  id: number; leave_type: string; start_date: string; end_date: string;
  user: { first_name: string; last_name: string };
}

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const { data } = await api.get('/projects/stats');
      return data.data;
    },
  });

  const { data: designers, isLoading: designersLoading } = useQuery({
    queryKey: ['designers'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as { id: number; first_name: string; last_name: string; max_capacity: number; _count: { assigned_projects: number } }[];
    },
  });

  const { data: overdueProjects, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects?status=overdue&limit=5');
      return data.data as Project[];
    },
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: async () => {
      const { data } = await api.get('/leaves?status=pending&limit=5');
      return data.data as Leave[];
    },
  });

  const { data: reviewProjects } = useQuery({
    queryKey: ['review-projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects?status=review&limit=5');
      return data.data as Project[];
    },
  });

  const statCards = [
    { title: 'Aktif Projeler', value: stats?.totalActive, icon: <FolderKanban className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10', href: '/admin/projects' },
    { title: 'Geciken Proje', value: stats?.totalOverdue, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10', href: '/admin/projects?status=overdue' },
    { title: 'Onay Bekleyen', value: stats?.totalReview, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', href: '/admin/projects?status=review' },
    { title: 'Üretimde', value: stats?.totalProduction, icon: <Factory className="h-5 w-5" />, color: 'text-purple-500', bg: 'bg-purple-500/10', href: '/admin/production' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hoşgeldin, {user?.first_name}!</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
        </div>
        <Link href="/admin/projects">
          <Button variant="outline" size="sm">
            Tüm Projeler <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Hızlı İşlemler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/projects?create=true">
              <Button size="sm" className="h-8 text-xs"><Plus className="mr-1.5 h-3 w-3" />Yeni Proje</Button>
            </Link>
            <Link href="/admin/designers">
              <Button size="sm" variant="outline" className="h-8 text-xs"><Users className="mr-1.5 h-3 w-3" />Tasarımcı Ekle</Button>
            </Link>
            <Link href="/admin/leaves">
              <Button size="sm" variant="outline" className="h-8 text-xs"><CalendarDays className="mr-1.5 h-3 w-3" />İzin Oluştur</Button>
            </Link>
            <Link href="/admin/production">
              <Button size="sm" variant="outline" className="h-8 text-xs"><Factory className="mr-1.5 h-3 w-3" />Sipariş Oluştur</Button>
            </Link>
            <Link href="/admin/projects/kanban">
              <Button size="sm" variant="outline" className="h-8 text-xs"><FolderKanban className="mr-1.5 h-3 w-3" />Kanban</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Today Summary */}
      {designers && designers.length > 0 && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="rounded-lg p-2 bg-emerald-500/10"><UserCheck className="h-4 w-4 text-emerald-500" /></div>
            <div><p className="text-lg font-bold">{designers.length}</p><p className="text-xs text-muted-foreground">Toplam Tasarımcı</p></div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="rounded-lg p-2 bg-yellow-500/10"><AlertTriangle className="h-4 w-4 text-yellow-500" /></div>
            <div><p className="text-lg font-bold">{designers.filter((d) => (d._count.assigned_projects / Math.max(d.max_capacity || 5, 1)) >= 0.9).length}</p><p className="text-xs text-muted-foreground">Kapasitesi Dolu</p></div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="rounded-lg p-2 bg-purple-500/10"><CalendarDays className="h-4 w-4 text-purple-500" /></div>
            <div><p className="text-lg font-bold">{pendingLeaves?.length ?? 0}</p><p className="text-xs text-muted-foreground">Bekleyen İzin</p></div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="rounded-lg p-2 bg-red-500/10"><Clock className="h-4 w-4 text-red-500" /></div>
            <div><p className="text-lg font-bold">{overdueProjects?.length ?? 0}</p><p className="text-xs text-muted-foreground">Geciken Proje</p></div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <span className={card.color}>{card.icon}</span>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className={`text-3xl font-bold ${card.title === 'Geciken Proje' && (card.value ?? 0) > 0 ? 'text-red-500' : ''}`}>
                    {card.value ?? '-'}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Alert Panel */}
        <Card className="border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Geciken Projeler
            </CardTitle>
            <Link href="/admin/projects?status=overdue">
              <Button variant="ghost" size="sm" className="h-7 text-xs">Tümü</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {overdueLoading ? (
              <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !overdueProjects || overdueProjects.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Geciken proje yok
              </div>
            ) : (
              <div className="divide-y">
                {overdueProjects.map((p) => (
                  <Link key={p.id} href={`/admin/projects/${p.id}`}>
                    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{p.nj_number}</span>
                          <span className="text-sm font-medium truncate max-w-36">{p.title}</span>
                        </div>
                        {p.assigned_designer && (
                          <span className="text-xs text-muted-foreground">{p.assigned_designer.first_name} {p.assigned_designer.last_name}</span>
                        )}
                      </div>
                      {p.deadline && (
                        <span className="text-xs text-red-500 font-medium">
                          {format(new Date(p.deadline), 'd MMM', { locale: tr })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-yellow-500" />
              İnceleme Bekleyen
            </CardTitle>
            <Link href="/admin/projects?status=review">
              <Button variant="ghost" size="sm" className="h-7 text-xs">Tümü</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!reviewProjects || reviewProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">İnceleme bekleyen proje yok</div>
            ) : (
              <div className="divide-y">
                {reviewProjects.map((p) => (
                  <Link key={p.id} href={`/admin/projects/${p.id}`}>
                    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{p.nj_number}</span>
                          <span className="text-sm font-medium truncate max-w-40">{p.title}</span>
                        </div>
                        {p.assigned_designer && (
                          <span className="text-xs text-muted-foreground">{p.assigned_designer.first_name} {p.assigned_designer.last_name}</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">İnceleme</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Designer Capacity + Pending Leaves */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Designer Capacity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Tasarımcı Kapasitesi
            </CardTitle>
            <Link href="/admin/designers">
              <Button variant="ghost" size="sm" className="h-7 text-xs">Tümü</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {designersLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : designers && designers.length > 0 ? (
              <div className="space-y-3">
                {designers.map((d) => {
                  const pct = Math.min(Math.round((d._count.assigned_projects / (d.max_capacity || 5)) * 100), 100);
                  return (
                    <div key={d.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Link href={`/admin/designers/${d.id}`} className="font-medium hover:text-primary transition-colors">
                          {d.first_name} {d.last_name}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {d._count.assigned_projects}/{d.max_capacity || 5} ({pct}%)
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-2 ${pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz tasarımcı eklenmemiş.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Onay Bekleyen İzinler
            </CardTitle>
            <Link href="/admin/leaves">
              <Button variant="ghost" size="sm" className="h-7 text-xs">Tümü</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!pendingLeaves || pendingLeaves.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Bekleyen izin yok
              </div>
            ) : (
              <div className="divide-y">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium">{leave.user.first_name} {leave.user.last_name}</span>
                      <p className="text-xs text-muted-foreground capitalize">{leave.leave_type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">
                        {format(new Date(leave.start_date), 'd MMM', { locale: tr })}
                        {' — '}
                        {format(new Date(leave.end_date), 'd MMM', { locale: tr })}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-0.5">Bekliyor</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      {stats?.statusCounts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Durum Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.statusCounts as Record<string, number>).map(([status, count]) => (
                <Link key={status} href={`/admin/projects?status=${status}`}>
                  <Badge variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                    {PROJECT_STATUS_LABELS[status] ?? status}
                    <span className="ml-2 font-bold text-primary">{count}</span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
