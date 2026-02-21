'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Users, FolderKanban, AlertTriangle, TrendingUp, CheckCircle2, RefreshCw, Clock, GitBranch, Download, ChevronUp, ChevronDown, ChevronsUpDown, FolderPlus } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni', designing: 'Tasarım', revision: 'Revizyon',
  review: 'İnceleme', approved: 'Onaylandı', in_production: 'Üretimde',
  done: 'Tamamlandı', cancelled: 'İptal',
};

const PIE_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#a78bfa', '#fb923c', '#e879f9',
];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

type DesignerSortField = 'name' | 'active' | 'completed' | 'overdue' | 'revision' | 'capacity';
type SortDir = 'asc' | 'desc';

function SortBtn({ field, current, dir, onSort }: { field: DesignerSortField; current: DesignerSortField; dir: SortDir; onSort: (f: DesignerSortField) => void }) {
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
      {field !== current ? <ChevronsUpDown className="h-3 w-3 opacity-50" /> : dir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />}
    </button>
  );
}

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (preset === 'this_month') {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  } else if (preset === 'last_month') {
    const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const t = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(f), to: fmt(t) };
  } else if (preset === 'last_3m') {
    const f = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from: fmt(f), to: fmt(now) };
  } else if (preset === 'this_year') {
    return { from: `${now.getFullYear()}-01-01`, to: fmt(now) };
  }
  return { from: '', to: '' };
}

interface UnassignedProject {
  id: number;
  nj_number: string;
  title: string;
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<DesignerSortField>('capacity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: DesignerSortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const applyPreset = (preset: string) => {
    const { from, to } = getPresetRange(preset);
    setDateFrom(from); setDateTo(to);
  };

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const { data } = await api.get(`/analytics/overview?${params}`);
      return data.data as {
        totalActive: number;
        totalOverdue: number;
        totalReview: number;
        totalCompleted: number;
        completedThisMonth: number;
        completedGrowth: number | null;
        avgCompletionDays: number | null;
        revisionRate: number;
        statusCounts: Record<string, number>;
        weeklyData: { week: string; completed: number }[];
      };
    },
  });

  const { data: designers, isLoading: designersLoading } = useQuery({
    queryKey: ['analytics-designers'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/designers');
      return data.data as {
        id: number; first_name: string; last_name: string;
        activeProjects: number; maxCapacity: number; capacityPct: number;
        completedThisMonth: number; overdueProjects: number; revisionCount: number;
      }[];
    },
  });

  const { data: unassignedProjects } = useQuery({
    queryKey: ['unassigned-projects-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/projects?designer_id=unassigned&limit=50');
      return (data.data ?? []) as UnassignedProject[];
    },
  });

  const assignProjectMutation = useMutation({
    mutationFn: async ({ projectId, designerId }: { projectId: number; designerId: number }) => {
      await api.patch(`/projects/${projectId}`, { assigned_designer_id: designerId });
    },
    onSuccess: () => {
      toast.success('Proje atandı');
      queryClient.invalidateQueries({ queryKey: ['analytics-designers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-projects-analytics'] });
    },
    onError: () => toast.error('Atama başarısız'),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/monthly-trend');
      return data.data as { month: string; completed: number; started: number }[];
    },
  });

  const { data: slaStats } = useQuery({
    queryKey: ['analytics-sla'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/sla');
      return data.data as {
        onTimeRate: number;
        onTime: number;
        late: number;
        totalMeasured: number;
        avgDelayDays: number;
        atRiskProjects: {
          id: number; nj_number: string; title: string; status: string;
          deadline: string; daysUntilDeadline: number;
          assigned_designer: { first_name: string; last_name: string } | null;
        }[];
      };
    },
  });

  const sortedDesigners = useMemo(() => {
    if (!designers) return [];
    return [...designers].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortField === 'name') return sortDir === 'asc' ? `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`) : `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
      if (sortField === 'active') { av = a.activeProjects; bv = b.activeProjects; }
      else if (sortField === 'completed') { av = a.completedThisMonth; bv = b.completedThisMonth; }
      else if (sortField === 'overdue') { av = a.overdueProjects; bv = b.overdueProjects; }
      else if (sortField === 'revision') { av = a.revisionCount; bv = b.revisionCount; }
      else if (sortField === 'capacity') { av = a.capacityPct; bv = b.capacityPct; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [designers, sortField, sortDir]);

  const exportCsv = () => {
    if (!sortedDesigners.length) return;
    const rows = [['Tasarimci', 'Aktif', 'Bu Ay', 'Geciken', 'Revizyon', 'Kapasite%']];
    sortedDesigners.forEach((d) => rows.push([`${d.first_name} ${d.last_name}`, String(d.activeProjects), String(d.completedThisMonth), String(d.overdueProjects), String(d.revisionCount), `${d.capacityPct}%`]));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success('CSV indirildi');
  };

  const deadlineCompliancePct = overview ? Math.max(0, Math.round(((overview.totalCompleted - overview.totalOverdue) / Math.max(overview.totalCompleted, 1)) * 100)) : null;

  const pieData = overview?.statusCounts
    ? Object.entries(overview.statusCounts).map(([key, val]) => ({
        name: STATUS_LABELS[key] ?? key,
        value: val,
      }))
    : [];

  const metricCards = [
    { title: 'Toplam Aktif', value: overview?.totalActive, icon: <FolderKanban className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Geciken', value: overview?.totalOverdue, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Bu Ay Tamamlanan', value: overview?.completedThisMonth, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Ort. Tamamlanma (gün)', value: overview?.avgCompletionDays ?? '-', icon: <Clock className="h-5 w-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Revizyon Oranı', value: overview ? `${overview.revisionRate}x` : '-', icon: <GitBranch className="h-5 w-5" />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Deadline Uyumu', value: deadlineCompliancePct !== null ? `${deadlineCompliancePct}%` : '-', icon: <TrendingUp className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analitik Dashboard
          </h1>
          <p className="text-muted-foreground">Ekip performansı ve proje analizi</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {['this_month', 'last_month', 'last_3m', 'this_year'].map((p) => (
              <Button key={p} variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyPreset(p)}>
                {p === 'this_month' ? 'Bu Ay' : p === 'last_month' ? 'Geçen Ay' : p === 'last_3m' ? '3 Ay' : 'Bu Yıl'}
              </Button>
            ))}
          </div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(''); setDateTo(''); }}>Temizle</Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <div className={`rounded-lg p-2 ${m.bg}`}>
                <span className={m.color}>{m.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              {overviewLoading ? <Skeleton className="h-9 w-16" /> : (
                <div className={`text-3xl font-bold ${m.title === 'Geciken' && typeof m.value === 'number' && m.value > 0 ? 'text-red-500' : ''}`}>
                  {m.value ?? '-'}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA Tracking */}
      {slaStats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Zamanında Teslimat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{slaStats.onTimeRate}%</div>
              <Progress value={slaStats.onTimeRate} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {slaStats.onTime} zamanında · {slaStats.late} geç ({slaStats.totalMeasured} ölçüm)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ort. Gecikme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{slaStats.avgDelayDays} <span className="text-base font-normal text-muted-foreground">gün</span></div>
              <p className="text-xs text-muted-foreground mt-1">Geç teslim edilen projeler ortalaması (son 3 ay)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Risk Altındaki Projeler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{slaStats.atRiskProjects.length}</div>
              {slaStats.atRiskProjects.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {slaStats.atRiskProjects.slice(0, 5).map((p) => (
                    <Link key={p.id} href={`/admin/projects/${p.id}`} className="flex items-center justify-between text-xs hover:bg-muted/50 rounded px-1.5 py-1">
                      <span className="font-mono font-medium">{p.nj_number}</span>
                      <Badge variant={p.daysUntilDeadline < 0 ? 'destructive' : 'outline'} className="text-[10px] h-4">
                        {p.daysUntilDeadline < 0 ? `${Math.abs(p.daysUntilDeadline)}g geçti` : `${p.daysUntilDeadline}g kaldı`}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Aylık Trend (6 Ay)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="completed" name="Tamamlanan" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="started" name="Başlayan" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Veri yok</div>
            )}
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Durum Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Veri yok</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Completions Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Haftalık Tamamlamalar (8 Hafta)</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : overview?.weeklyData && overview.weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview.weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
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

      {/* Designer Workload Bar Chart */}
      {designers && designers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tasarimci Is Yuku</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, designers.length * 40)}>
              <BarChart data={designers.map((d) => ({ name: `${d.first_name} ${d.last_name[0]}.`, active: d.activeProjects, completed: d.completedThisMonth, overdue: d.overdueProjects }))} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="active" name="Aktif" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="completed" name="Tamamlanan" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="overdue" name="Geciken" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Designer Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tasarımcı Performansı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {designersLoading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : sortedDesigners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                        Tasarımcı<SortBtn field="name" current={sortField} dir={sortDir} onSort={toggleSort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                        Aktif<SortBtn field="active" current={sortField} dir={sortDir} onSort={toggleSort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                        Kapasite<SortBtn field="capacity" current={sortField} dir={sortDir} onSort={toggleSort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                        Bu Ay<SortBtn field="completed" current={sortField} dir={sortDir} onSort={toggleSort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                        Geciken<SortBtn field="overdue" current={sortField} dir={sortDir} onSort={toggleSort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                        Revizyon<SortBtn field="revision" current={sortField} dir={sortDir} onSort={toggleSort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Doluluk</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDesigners.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold">{d.first_name} {d.last_name}</td>
                      <td className="px-4 py-3 text-sm">{d.activeProjects}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={d.capacityPct} className={`h-2 w-20 ${d.capacityPct >= 90 ? '[&>div]:bg-red-500' : d.capacityPct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`} />
                          <span className={`text-xs font-medium ${d.capacityPct >= 90 ? 'text-red-500' : d.capacityPct >= 70 ? 'text-yellow-500' : 'text-muted-foreground'}`}>{d.capacityPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-500">{d.completedThisMonth}</td>
                      <td className="px-4 py-3">
                        {d.overdueProjects > 0 ? (
                          <Badge variant="destructive" className="text-xs">{d.overdueProjects}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {d.revisionCount > 0 ? (
                          <Badge variant="secondary" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" />{d.revisionCount}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={d.capacityPct >= 90 ? 'destructive' : d.capacityPct >= 70 ? 'secondary' : 'default'} className="text-xs">
                          {d.activeProjects}/{d.maxCapacity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" title="Proje Ata">
                                <FolderPlus className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 max-h-64 overflow-y-auto">
                              {(unassignedProjects ?? []).length === 0 ? (
                                <DropdownMenuItem disabled>Atamasız proje yok</DropdownMenuItem>
                              ) : (
                                (unassignedProjects ?? []).slice(0, 15).map((p) => (
                                  <DropdownMenuItem key={p.id} onClick={() => assignProjectMutation.mutate({ projectId: p.id, designerId: d.id })}>
                                    <span className="font-mono text-xs mr-2 shrink-0">{p.nj_number}</span>
                                    <span className="truncate text-xs">{p.title}</span>
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Link href={`/admin/designers/${d.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">Detay</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Tasarımcı bulunamadı.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
