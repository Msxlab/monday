'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import {
  Factory,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Onay Bekliyor',
  approved: 'Onaylandı',
  ordered: 'Sipariş Verildi',
  shipped: 'Kargoda',
  in_customs: 'Gümrükte',
  delivered: 'Teslim Edildi',
  rejected: 'Reddedildi',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  approved: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  ordered: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  shipped: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  in_customs: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
};

interface Order {
  id: number;
  order_status: string;
  country: string;
  tracking_info: string | null;
  estimated_arrival: string | null;
  created_at: string;
  project: { id: number; nj_number: string; title: string };
  initiated_by: { first_name: string; last_name: string } | null;
}

interface ApprovedProject {
  id: number;
  nj_number: string;
  title: string;
  project_type: string | null;
  country_target: string | null;
  assigned_designer: { first_name: string; last_name: string } | null;
}

export default function ProductionDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['production-stats'],
    queryFn: async () => {
      const { data } = await api.get('/production/stats');
      return data.data as { pendingApproval: number; active: number; deliveredThisMonth: number };
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['production-recent'],
    queryFn: async () => {
      const { data } = await api.get('/production?limit=5');
      return data.data as Order[];
    },
  });

  const { data: approvedProjects, isLoading: approvedLoading } = useQuery({
    queryKey: ['production-approved-projects'],
    queryFn: async () => {
      const { data } = await api.get('/production/approved-projects');
      return data.data as ApprovedProject[];
    },
  });

  const statCards = [
    { title: 'Onay Bekleyen', value: stats?.pendingApproval, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', alert: (stats?.pendingApproval ?? 0) > 0 },
    { title: 'Aktif Sipariş', value: stats?.active, icon: <Truck className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Bu Ay Teslim', value: stats?.deliveredThisMonth, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            Üretim Paneli
          </h1>
          <p className="text-muted-foreground">Sipariş ve üretim takibi</p>
        </div>
        <Link href="/production/orders">
          <Button>
            <Package className="mr-2 h-4 w-4" />
            Tüm Siparişler
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <span className={s.color}>{s.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className={`text-3xl font-bold ${s.alert ? 'text-yellow-500' : ''}`}>
                  {s.value ?? 0}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Son Siparişler</CardTitle>
            <Link href="/production/orders">
              <Button variant="ghost" size="sm" className="text-xs">
                Tümü <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !recentOrders || recentOrders.length === 0 ? (
              <EmptyState
                icon={<Package className="h-8 w-8 text-muted-foreground" />}
                title="Henüz sipariş yok"
                description="Onaylanan projeler için sipariş oluşturabilirsiniz."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {order.project.nj_number}
                        </span>
                        <Badge className={`text-xs border ${ORDER_STATUS_COLORS[order.order_status]}`}>
                          {ORDER_STATUS_LABELS[order.order_status] || order.order_status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate mt-0.5">{order.project.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {order.estimated_arrival && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(order.estimated_arrival), 'd MMM yyyy', { locale: tr })}
                          </span>
                        )}
                        {order.tracking_info && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {order.tracking_info}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Projects (Ready for Production) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Üretime Hazır Projeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !approvedProjects || approvedProjects.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
                title="Üretime hazır proje yok"
                description="Onaylanan projeler burada görünecek."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {approvedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {project.nj_number}
                        </span>
                        {project.country_target && (
                          <Badge variant="outline" className="text-xs">
                            {project.country_target === 'china' ? '🇨🇳 Çin' :
                             project.country_target === 'india' ? '🇮🇳 Hindistan' : '🌐 Her İkisi'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate mt-0.5">{project.title}</p>
                      {project.assigned_designer && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tasarımcı: {project.assigned_designer.first_name} {project.assigned_designer.last_name}
                        </p>
                      )}
                    </div>
                    <Link href="/production/orders">
                      <Button variant="outline" size="sm" className="shrink-0">
                        Sipariş Oluştur
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
