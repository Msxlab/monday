'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BarChart3, RefreshCw, Target, TrendingUp, AlertTriangle, FolderOpen } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DesignerPerformancePage() {
  const { user } = useAuthStore();

  const { data: myData, isLoading: meLoading } = useQuery({
    queryKey: ['my-performance', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/designers?designerId=${user?.id}`);
      return (data.data as unknown[])[0] as {
        activeProjects: number;
        maxCapacity: number;
        capacityPct: number;
        completedThisMonth: number;
        completedLast90Days: number;
        overdueProjects: number;
        revisionCount: number;
      } | undefined;
    },
    enabled: !!user,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/monthly-trend');
      return data.data as { month: string; completed: number; started: number }[];
    },
  });

  const metrics = [
    {
      label: 'Tamamlanan (Bu Ay)',
      value: myData?.completedThisMonth ?? '-',
      icon: <Target className="h-5 w-5" />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Tamamlanan (90 Gün)',
      value: myData?.completedLast90Days ?? '-',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'Geciken Proje',
      value: myData?.overdueProjects ?? '-',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Revizyon (90 Gün)',
      value: myData?.revisionCount ?? '-',
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Performansım
        </h1>
        <p className="text-muted-foreground">Son 90 günlük performans özeti</p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <div className={`rounded-lg p-2 ${m.bg}`}>
                <span className={m.color}>{m.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              {meLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <div className="text-3xl font-bold">{m.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Kapasite Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : myData ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktif Projeler</span>
                <span className="font-semibold">
                  {myData.activeProjects} / {myData.maxCapacity} proje ({myData.capacityPct}%)
                </span>
              </div>
              <Progress
                value={myData.capacityPct}
                className="h-3"
              />
              <p className="text-xs text-muted-foreground">
                {myData.capacityPct >= 90
                  ? 'Kapasite dolmak üzere'
                  : myData.capacityPct >= 70
                  ? 'Orta yüklü'
                  : 'Kapasite müsait'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Veri yok</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Proje Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="completed" name="Tamamlanan" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="started" name="Başlanan" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Yeterli veri yok
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
