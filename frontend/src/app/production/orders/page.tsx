'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Factory, Package, Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ProductionOrder {
  id: number;
  project_id: number;
  country: string;
  order_status: string;
  order_date: string | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  tracking_info: string | null;
  notes: string | null;
  created_at: string;
  project: { id: number; nj_number: string; title: string };
}

const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Onay Bekliyor',
  approved: 'Onaylandi',
  ordered: 'Siparis Verildi',
  shipped: 'Kargoda',
  in_customs: 'Gumrukte',
  delivered: 'Teslim Edildi',
  rejected: 'Reddedildi',
  rework: 'Yeniden Uretim',
};

const STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-yellow-500/15 text-yellow-600',
  approved: 'bg-emerald-500/15 text-emerald-600',
  ordered: 'bg-blue-500/15 text-blue-600',
  shipped: 'bg-purple-500/15 text-purple-600',
  in_customs: 'bg-orange-500/15 text-orange-600',
  delivered: 'bg-green-700/15 text-green-700',
  rejected: 'bg-red-500/15 text-red-600',
  rework: 'bg-pink-500/15 text-pink-600',
};

export default function ProductionOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['production-orders', statusFilter, countryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (countryFilter !== 'all') params.set('country', countryFilter);
      const { data } = await api.get(`/production-orders?${params.toString()}`);
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, order_status }: { id: number; order_status: string }) => {
      await api.patch(`/production-orders/${id}`, { order_status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Siparis durumu guncellendi');
    },
    onError: () => {
      toast.error('Durum guncellenemedi');
    },
  });

  const orders: ProductionOrder[] = data?.data ?? [];

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.order_status === 'pending_approval').length,
    shipped: orders.filter((o) => o.order_status === 'shipped').length,
    delivered: orders.filter((o) => o.order_status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Factory className="h-6 w-6 text-primary" />
          Uretim Siparisleri
        </h1>
        <p className="text-muted-foreground">Tum uretim siparislerini yonetin</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-indigo-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Siparis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Factory className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Onay Bekliyor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.shipped}</p>
                <p className="text-xs text-muted-foreground">Kargoda</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Teslim Edildi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Durumlar</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Ulke filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Ulkeler</SelectItem>
            <SelectItem value="china">Cin</SelectItem>
            <SelectItem value="india">Hindistan</SelectItem>
            <SelectItem value="both">Her Ikisi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">Siparis bulunamadi.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {order.project.nj_number}
                      </span>
                      <span className="font-medium">{order.project.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Ulke: {order.country === 'china' ? 'Cin' : order.country === 'india' ? 'Hindistan' : 'Her Ikisi'}</span>
                      {order.tracking_info && <span>Takip: {order.tracking_info}</span>}
                      {order.estimated_arrival && (
                        <span>Tahmini Varis: {format(new Date(order.estimated_arrival), 'd MMM yyyy', { locale: tr })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[order.order_status] ?? 'bg-muted'}>
                      {STATUS_LABELS[order.order_status] ?? order.order_status}
                    </Badge>
                    {order.order_status === 'pending_approval' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: order.id, order_status: 'approved' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Onayla
                      </Button>
                    )}
                    {order.order_status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: order.id, order_status: 'ordered' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Siparis Verildi
                      </Button>
                    )}
                    {order.order_status === 'ordered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: order.id, order_status: 'shipped' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Kargoya Verildi
                      </Button>
                    )}
                    {order.order_status === 'shipped' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: order.id, order_status: 'delivered' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Teslim Edildi
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
