'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Factory, Clock, Package, CheckCircle2, Search, Download, AlertTriangle, ChevronRight, Edit2, Plus, Trash2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Onay Bekliyor',
  approved: 'Onaylandı',
  ordered: 'Sipariş Verildi',
  shipped: 'Kargoda',
  in_customs: 'Gümrükte',
  delivered: 'Teslim Alındı',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_approval: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  approved: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
  ordered: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  shipped: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
  in_customs: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
};

const COUNTRY_LABELS: Record<string, string> = {
  china: 'Çin',
  india: 'Hindistan',
  both: 'Her İkisi',
};

interface Order {
  id: number;
  country: string;
  order_status: string;
  order_date: string | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  tracking_info: string | null;
  notes: string | null;
  project: { id: number; nj_number: string; title: string; project_type: string };
  initiated_by: { id: number; first_name: string; last_name: string } | null;
  approved_by: { id: number; first_name: string; last_name: string } | null;
}

const STATUS_FLOW: Record<string, string> = {
  pending_approval: 'approved',
  approved: 'ordered',
  ordered: 'shipped',
  shipped: 'in_customs',
  in_customs: 'delivered',
};

const STATUS_STEPS = ['pending_approval', 'approved', 'ordered', 'shipped', 'in_customs', 'delivered'];

interface ApprovedProject {
  id: number;
  nj_number: string;
  title: string;
  project_type: string;
  country_target: string | null;
}

export default function AdminProductionPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editTracking, setEditTracking] = useState('');
  const [editingTracking, setEditingTracking] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ project_id: '', country: 'china', estimated_arrival: '', notes: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; orderId: number | null }>({ open: false, orderId: null });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['production-stats'],
    queryFn: async () => {
      const { data } = await api.get('/production-orders/stats');
      return data.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['production-orders', statusFilter, countryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (countryFilter !== 'all') params.set('country', countryFilter);
      const { data } = await api.get(`/production-orders?${params}`);
      return data;
    },
  });

  const { data: approvedProjects } = useQuery({
    queryKey: ['approved-projects'],
    queryFn: async () => {
      const { data } = await api.get('/production-orders/approved-projects');
      return data.data as ApprovedProject[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: { id: number; order_status?: string; tracking_info?: string; notes?: string; estimated_arrival?: string; order_date?: string }) => {
      await api.patch(`/production-orders/${id}`, patch);
    },
    onSuccess: () => {
      toast.success('Sipariş güncellendi');
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-stats'] });
      if (selectedOrder) {
        setSelectedOrder((prev) => prev ? { ...prev, ...updateMutation.variables } : null);
      }
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      await api.post('/production-orders', {
        project_id: parseInt(newOrder.project_id),
        country: newOrder.country,
        estimated_arrival: newOrder.estimated_arrival ? new Date(newOrder.estimated_arrival).toISOString() : undefined,
        notes: newOrder.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Sipariş oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-stats'] });
      queryClient.invalidateQueries({ queryKey: ['approved-projects'] });
      setCreateOpen(false);
      setNewOrder({ project_id: '', country: 'china', estimated_arrival: '', notes: '' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Sipariş oluşturulamadı'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/production-orders/${id}`); },
    onSuccess: () => {
      toast.success('Sipariş silindi');
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-stats'] });
      setDeleteDialog({ open: false, orderId: null });
      setSelectedOrder(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Silme başarısız'),
  });

  const bulkAdvanceMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const orderMap = new Map(allOrders.map((o) => [o.id, o]));
      await Promise.all(ids.map((id) => {
        const order = orderMap.get(id);
        if (order && STATUS_FLOW[order.order_status]) {
          return api.patch(`/production-orders/${id}`, { order_status: STATUS_FLOW[order.order_status] });
        }
        return Promise.resolve();
      }));
    },
    onSuccess: () => {
      toast.success('Siparişler güncellendi');
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-stats'] });
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Toplu güncelleme başarısız'),
  });

  const allOrders: Order[] = data?.data ?? [];
  const orders = search
    ? allOrders.filter((o) => o.project.nj_number.toLowerCase().includes(search.toLowerCase()) || o.project.title.toLowerCase().includes(search.toLowerCase()))
    : allOrders;

  const lateCount = useMemo(() => allOrders.filter((o) => o.estimated_arrival && new Date(o.estimated_arrival) < new Date() && o.order_status !== 'delivered').length, [allOrders]);
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { china: 0, india: 0 };
    allOrders.filter((o) => o.order_status !== 'delivered').forEach((o) => { if (counts[o.country] !== undefined) counts[o.country]++; });
    return counts;
  }, [allOrders]);

  const exportCsv = () => {
    const rows = [['NJ No', 'Proje', 'Ülke', 'Durum', 'Sipariş Tarihi', 'Tahmini Varış', 'Takip No']];
    orders.forEach((o) => rows.push([o.project.nj_number, o.project.title, COUNTRY_LABELS[o.country] || o.country, ORDER_STATUS_LABELS[o.order_status] || o.order_status, o.order_date ? format(new Date(o.order_date), 'dd.MM.yyyy') : '', o.estimated_arrival ? format(new Date(o.estimated_arrival), 'dd.MM.yyyy') : '', o.tracking_info || '']));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `production-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV indirildi');
  };

  const statCards = [
    { title: 'Onay Bekleyen', value: stats?.pendingApproval ?? '-', icon: <Clock className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: 'Aktif Sipariş', value: stats?.active ?? '-', icon: <Package className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Geciken', value: lateCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10', alert: lateCount > 0 },
    { title: 'Bu Ay Teslim', value: stats?.deliveredThisMonth ?? '-', icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            Üretim Yönetimi
          </h1>
          <p className="text-muted-foreground">Üretim siparişleri ve takibi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Yeni Sipariş</Button>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Üretim Siparişi</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Proje *</Label>
                  <Select value={newOrder.project_id} onValueChange={(v) => setNewOrder((f) => ({ ...f, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Onaylı proje seçin" /></SelectTrigger>
                    <SelectContent>
                      {(approvedProjects ?? []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nj_number} — {p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ülke *</Label>
                    <Select value={newOrder.country} onValueChange={(v) => setNewOrder((f) => ({ ...f, country: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="china">Çin</SelectItem>
                        <SelectItem value="india">Hindistan</SelectItem>
                        <SelectItem value="both">Her İkisi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tahmini Varış</Label>
                    <Input type="date" value={newOrder.estimated_arrival} onChange={(e) => setNewOrder((f) => ({ ...f, estimated_arrival: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Not (opsiyonel)</Label>
                  <Textarea placeholder="Sipariş notu..." value={newOrder.notes} onChange={(e) => setNewOrder((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                  <Button disabled={createOrderMutation.isPending || !newOrder.project_id}
                    onClick={() => createOrderMutation.mutate()}>
                    {createOrderMutation.isPending ? 'Oluşturuluyor...' : 'Sipariş Oluştur'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Country Summary */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Aktif Sipariş Dağılımı:</span>
        <Badge variant="outline" className="text-xs">Çin: {countryCounts.china}</Badge>
        <Badge variant="outline" className="text-xs">Hindistan: {countryCounts.india}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <div className={`rounded-lg p-2 ${s.bg}`}><span className={s.color}>{s.icon}</span></div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-9 w-16" /> : <div className={`text-3xl font-bold ${'alert' in s && s.alert ? 'text-red-500' : ''}`}>{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} sipariş seçildi</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => bulkAdvanceMutation.mutate(Array.from(selectedIds))} disabled={bulkAdvanceMutation.isPending}>
              <ChevronRight className="h-3.5 w-3.5 mr-1" />Sonraki Aşama
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>İptal</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="NJ no veya proje adı ara..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ülke" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ülkeler</SelectItem>
            <SelectItem value="china">Çin</SelectItem>
            <SelectItem value="india">Hindistan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Sipariş bulunamadı.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 w-10">
                      <Checkbox checked={selectedIds.size === orders.length && orders.length > 0}
                        onCheckedChange={(checked) => setSelectedIds(checked ? new Set(orders.map((o) => o.id)) : new Set())} />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">NJ No / Proje</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ülke</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Sipariş Tarihi</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tahmini Varış</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Takip No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isLate = order.estimated_arrival && new Date(order.estimated_arrival) < new Date() && order.order_status !== 'delivered';
                    return (
                      <tr
                        key={order.id}
                        className={`border-b transition-colors cursor-pointer group ${selectedIds.has(order.id) ? 'bg-primary/5' : isLate ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-muted/40'}`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(order.id)}
                            onCheckedChange={() => setSelectedIds((prev) => { const s = new Set(prev); if (s.has(order.id)) { s.delete(order.id); } else { s.add(order.id); } return s; })} />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-mono text-sm font-semibold text-primary">{order.project.nj_number}</span>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{order.project.title}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{COUNTRY_LABELS[order.country]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`border text-xs ${ORDER_STATUS_COLORS[order.order_status]}`}>
                            {ORDER_STATUS_LABELS[order.order_status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {order.order_date ? format(new Date(order.order_date), 'd MMM yyyy', { locale: tr }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {order.estimated_arrival ? (
                            <span className={isLate ? 'text-red-500 font-semibold flex items-center gap-1' : 'text-muted-foreground'}>
                              {isLate && <AlertTriangle className="h-3 w-3" />}
                              {format(new Date(order.estimated_arrival), 'd MMM yyyy', { locale: tr })}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {order.tracking_info || '—'}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {STATUS_FLOW[order.order_status] && (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => updateMutation.mutate({ id: order.id, order_status: STATUS_FLOW[order.order_status] })}
                                disabled={updateMutation.isPending}>
                                <ChevronRight className="h-3 w-3 mr-1" />{ORDER_STATUS_LABELS[STATUS_FLOW[order.order_status]]?.split(' ')[0]}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              onClick={() => setDeleteDialog({ open: true, orderId: order.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setEditingTracking(false); } }}>
        <SheetContent className="w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sipariş Detayı</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="mt-6 space-y-5">
              <div>
                <p className="font-mono text-lg font-bold text-primary">{selectedOrder.project.nj_number}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.project.title}</p>
              </div>

              {/* Status Timeline */}
              <div>
                <p className="text-xs text-muted-foreground mb-3 font-medium">DURUM</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {STATUS_STEPS.map((step, i) => {
                    const stepIdx = STATUS_STEPS.indexOf(selectedOrder.order_status);
                    const isPast = i <= stepIdx;
                    const isCurrent = i === stepIdx;
                    return (
                      <div key={step} className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${isCurrent ? 'bg-primary ring-4 ring-primary/20' : isPast ? 'bg-primary/50' : 'bg-muted-foreground/20'}`} />
                        <span className={`text-[10px] ${isCurrent ? 'text-primary font-semibold' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                          {ORDER_STATUS_LABELS[step]?.split(' ')[0]}
                        </span>
                        {i < STATUS_STEPS.length - 1 && <div className={`h-px w-3 ${isPast ? 'bg-primary/50' : 'bg-muted-foreground/20'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Ülke</p><p className="mt-1 font-medium">{COUNTRY_LABELS[selectedOrder.country]}</p></div>
                <div><p className="text-muted-foreground text-xs">Proje Tipi</p><p className="mt-1 font-medium capitalize">{selectedOrder.project.project_type}</p></div>
                <div><p className="text-muted-foreground text-xs">Sipariş Tarihi</p><p className="mt-1">{selectedOrder.order_date ? format(new Date(selectedOrder.order_date), 'd MMMM yyyy', { locale: tr }) : '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">Tahmini Varış</p><p className={`mt-1 ${selectedOrder.estimated_arrival && new Date(selectedOrder.estimated_arrival) < new Date() && selectedOrder.order_status !== 'delivered' ? 'text-red-500 font-semibold' : ''}`}>{selectedOrder.estimated_arrival ? format(new Date(selectedOrder.estimated_arrival), 'd MMMM yyyy', { locale: tr }) : '—'}</p></div>
                {selectedOrder.actual_arrival && <div className="col-span-2"><p className="text-muted-foreground text-xs">Gerçek Varış</p><p className="mt-1 text-emerald-500">{format(new Date(selectedOrder.actual_arrival), 'd MMMM yyyy', { locale: tr })}</p></div>}
              </div>

              {/* Tracking */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium">TAKİP NUMARASI</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditTracking(selectedOrder.tracking_info || ''); setEditingTracking(true); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
                {editingTracking ? (
                  <div className="flex gap-2">
                    <Input value={editTracking} onChange={(e) => setEditTracking(e.target.value)} className="h-8 text-sm font-mono" placeholder="Takip no girin..." />
                    <Button size="sm" className="h-8" onClick={() => { updateMutation.mutate({ id: selectedOrder.id, tracking_info: editTracking }); setEditingTracking(false); setSelectedOrder((prev) => prev ? { ...prev, tracking_info: editTracking } : null); }}>Kaydet</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingTracking(false)}>İptal</Button>
                  </div>
                ) : (
                  <p className="font-mono text-sm">{selectedOrder.tracking_info || <span className="text-muted-foreground">—</span>}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium">NOT</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditNotes(selectedOrder.notes || ''); setEditingNotes(true); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7" onClick={() => { updateMutation.mutate({ id: selectedOrder.id, notes: editNotes }); setEditingNotes(false); setSelectedOrder((prev) => prev ? { ...prev, notes: editNotes } : null); }}>Kaydet</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingNotes(false)}>İptal</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{selectedOrder.notes || <span className="text-muted-foreground">—</span>}</p>
                )}
              </div>

              {selectedOrder.initiated_by && (
                <div><p className="text-xs text-muted-foreground mb-1">OLUŞTURAN</p><p className="text-sm">{selectedOrder.initiated_by.first_name} {selectedOrder.initiated_by.last_name}</p></div>
              )}

              <Separator />
              <div className="flex gap-2">
                {STATUS_FLOW[selectedOrder.order_status] && (
                  <Button className="flex-1" onClick={() => { updateMutation.mutate({ id: selectedOrder.id, order_status: STATUS_FLOW[selectedOrder.order_status] }); setSelectedOrder((prev) => prev ? { ...prev, order_status: STATUS_FLOW[prev.order_status] } : null); }} disabled={updateMutation.isPending}>
                    <ChevronRight className="h-4 w-4 mr-2" />{ORDER_STATUS_LABELS[STATUS_FLOW[selectedOrder.order_status]]}
                  </Button>
                )}
                <Button variant="destructive" size="icon" className="shrink-0" onClick={() => setDeleteDialog({ open: true, orderId: selectedOrder.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, orderId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Siparişi Sil</AlertDialogTitle>
            <AlertDialogDescription>Bu sipariş kalıcı olarak silinecek. Bu işlemi geri alamazsınız.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDialog.orderId && deleteMutation.mutate(deleteDialog.orderId)}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
