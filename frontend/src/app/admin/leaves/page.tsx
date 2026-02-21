'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
// import { Separator } from '@/components/ui/separator';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, UserCheck, ChevronLeft,
  ChevronRight, Download, CheckSquare, Plus, Ban,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Yıllık İzin',
  sick: 'Hastalık İzni',
  excuse: 'Mazeret İzni',
  remote: 'Uzaktan Çalışma',
};

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
  cancelled: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal',
};

interface Leave {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_period: string | null;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  user: { id: number; first_name: string; last_name: string; role: string };
  approved_by: { id: number; first_name: string; last_name: string } | null;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual: 'bg-emerald-500',
  sick: 'bg-red-500',
  excuse: 'bg-yellow-500',
  remote: 'bg-purple-500',
};

export default function AdminLeavesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; leaveId: number | null }>({ open: false, leaveId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [calDate, setCalDate] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({ user_id: '', leave_type: 'annual', start_date: '', end_date: '', notes: '' });

  const { data: teamCalendar, isLoading: calLoading } = useQuery({
    queryKey: ['team-calendar', calDate.getMonth(), calDate.getFullYear()],
    queryFn: async () => {
      const { data } = await api.get(`/leaves/team-calendar?month=${calDate.getMonth()}&year=${calDate.getFullYear()}`);
      return data.data as { id: number; leave_type: string; start_date: string; end_date: string; user: { id: number; first_name: string; last_name: string } }[];
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['leave-stats'],
    queryFn: async () => {
      const { data } = await api.get('/leaves/stats');
      return data.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-for-leaves'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=100');
      return data.data as { id: number; first_name: string; last_name: string }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get(`/leaves?${params}`);
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => { await api.patch(`/leaves/${id}/approve`); },
    onSuccess: () => {
      toast.success('İzin onaylandı');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-stats'] });
    },
    onError: () => toast.error('Onaylama başarısız'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => { await api.patch(`/leaves/${id}/reject`, { reason }); },
    onSuccess: () => {
      toast.success('İzin reddedildi');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-stats'] });
      setRejectDialog({ open: false, leaveId: null });
      setRejectReason('');
    },
    onError: () => toast.error('Reddetme başarısız'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.patch(`/leaves/${id}/approve`)));
    },
    onSuccess: () => {
      toast.success('İzinler onaylandı');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-stats'] });
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Toplu onay başarısız'),
  });

  const adminCreateMutation = useMutation({
    mutationFn: async () => {
      await api.post('/leaves/admin-create', {
        user_id: parseInt(newLeave.user_id),
        leave_type: newLeave.leave_type,
        start_date: new Date(newLeave.start_date).toISOString(),
        end_date: new Date(newLeave.end_date).toISOString(),
        notes: newLeave.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('İzin oluşturuldu (otomatik onaylı)');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-stats'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
      setCreateOpen(false);
      setNewLeave({ user_id: '', leave_type: 'annual', start_date: '', end_date: '', notes: '' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'İzin oluşturulamadı'),
  });

  const adminCancelMutation = useMutation({
    mutationFn: async (id: number) => { await api.patch(`/leaves/${id}/admin-cancel`); },
    onSuccess: () => {
      toast.success('İzin iptal edildi');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-stats'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
    },
    onError: () => toast.error('İptal başarısız'),
  });

  const allLeaves: Leave[] = data?.data ?? [];
  const filteredLeaves = useMemo(() => {
    let result = allLeaves;
    if (typeFilter !== 'all') result = result.filter((l) => l.leave_type === typeFilter);
    if (employeeFilter !== 'all') result = result.filter((l) => String(l.user.id) === employeeFilter);
    if (dateFrom) result = result.filter((l) => l.start_date >= dateFrom);
    if (dateTo) result = result.filter((l) => l.end_date <= dateTo);
    return result;
  }, [allLeaves, typeFilter, employeeFilter, dateFrom, dateTo]);
  const pendingLeaves = filteredLeaves.filter((l) => l.status === 'pending');

  const exportCsv = () => {
    const rows = [['Çalışan', 'İzin Tipi', 'Başlangıç', 'Bitiş', 'Durum']];
    filteredLeaves.forEach((l) => rows.push([`${l.user.first_name} ${l.user.last_name}`, LEAVE_TYPE_LABELS[l.leave_type] || l.leave_type, format(new Date(l.start_date), 'dd.MM.yyyy'), format(new Date(l.end_date), 'dd.MM.yyyy'), LEAVE_STATUS_LABELS[l.status] || l.status]));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `leaves-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success('CSV indirildi');
  };

  const calDays = eachDayOfInterval({ start: startOfMonth(calDate), end: endOfMonth(calDate) });
  const firstDayOfWeek = (startOfMonth(calDate).getDay() + 6) % 7;
  const getLeavesForDay = (day: Date) => (teamCalendar ?? []).filter((l) => { const s = parseISO(l.start_date); const e = parseISO(l.end_date); return day >= s && day <= e; });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            İzin Yönetimi
          </h1>
          <p className="text-muted-foreground">İzin taleplerini yönetin ve onaylayın</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />İzin Oluştur</Button>
            <DialogContent>
              <DialogHeader><DialogTitle>İzin Oluştur (Admin)</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">Bu izin otomatik olarak onaylanacaktır.</p>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Personel *</Label>
                  <Select value={newLeave.user_id} onValueChange={(v) => setNewLeave((f) => ({ ...f, user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                    <SelectContent>
                      {(usersData ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>İzin Tipi</Label>
                  <Select value={newLeave.leave_type} onValueChange={(v) => setNewLeave((f) => ({ ...f, leave_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Başlangıç *</Label>
                    <Input type="date" value={newLeave.start_date} onChange={(e) => setNewLeave((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bitiş *</Label>
                    <Input type="date" value={newLeave.end_date} onChange={(e) => setNewLeave((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Not (opsiyonel)</Label>
                  <Textarea placeholder="Açıklama..." value={newLeave.notes} onChange={(e) => setNewLeave((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                  <Button disabled={adminCreateMutation.isPending || !newLeave.user_id || !newLeave.start_date || !newLeave.end_date}
                    onClick={() => adminCreateMutation.mutate()}>
                    {adminCreateMutation.isPending ? 'Oluşturuluyor...' : 'İzin Oluştur'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Onay Bekleyen', value: stats?.pending ?? '-', icon: <Clock className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { title: 'Bu Ay Onaylanan', value: stats?.approvedThisMonth ?? '-', icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { title: 'Bugün İzinli', value: stats?.onLeaveToday ?? '-', icon: <UserCheck className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        ].map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <div className={`rounded-lg p-2 ${s.bg}`}><span className={s.color}>{s.icon}</span></div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Talepler</TabsTrigger>
          <TabsTrigger value="calendar">Takım Takvimi</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{format(calDate, 'MMMM yyyy', { locale: tr })}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalDate(subMonths(calDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setCalDate(new Date())}>Bugün</Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalDate(addMonths(calDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {calLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div>
                  <div className="grid grid-cols-7 mb-2">
                    {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="min-h-[64px]" />)}
                    {calDays.map((day) => {
                      const dayLeaves = getLeavesForDay(day);
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div key={day.toISOString()} className={`min-h-[64px] rounded border p-1 ${isToday ? 'border-primary bg-primary/5' : 'border-border/40'}`}>
                          <p className={`text-[10px] text-right mb-0.5 font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{format(day, 'd')}</p>
                          <div className="space-y-0.5">
                            {dayLeaves.slice(0, 2).map((l) => (
                              <div key={l.id} className={`text-[8px] px-1 rounded truncate text-white ${LEAVE_TYPE_COLORS[l.leave_type] ?? 'bg-muted'}`}>
                                {l.user.first_name}
                              </div>
                            ))}
                            {dayLeaves.length > 2 && <div className="text-[8px] text-muted-foreground">+{dayLeaves.length-2}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
                    {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={`h-2.5 w-2.5 rounded-sm ${LEAVE_TYPE_COLORS[key]}`} />{label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Durum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="approved">Onaylandı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="İzin Tipi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Personel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Personel</SelectItem>
                  {(usersData ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9 text-sm" />
                <span className="text-xs text-muted-foreground">—</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9 text-sm" />
              </div>
              {pendingLeaves.length > 0 && (
                <Button size="sm" variant="outline" className="ml-auto border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => bulkApproveMutation.mutate(pendingLeaves.map((l) => l.id))} disabled={bulkApproveMutation.isPending}>
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />Tümünü Onayla ({pendingLeaves.length})
                </Button>
              )}
            </div>

            {/* Leave List */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-2 p-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : filteredLeaves.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">İzin talebi bulunamadı.</div>
                ) : (
                  <div className="divide-y">
                    {filteredLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedIds.has(leave.id)} onCheckedChange={() => setSelectedIds((prev) => { const s = new Set(prev); if (s.has(leave.id)) { s.delete(leave.id); } else { s.add(leave.id); } return s; })} />
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {leave.user.first_name[0]}{leave.user.last_name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{leave.user.first_name} {leave.user.last_name}</span>
                              <Badge variant="outline" className="text-xs">{LEAVE_TYPE_LABELS[leave.leave_type]}</Badge>
                              {leave.is_half_day && <Badge variant="secondary" className="text-xs">Yarım Gün</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(leave.start_date), 'd MMM yyyy', { locale: tr })}
                              {leave.start_date !== leave.end_date && ` — ${format(new Date(leave.end_date), 'd MMM yyyy', { locale: tr })}`}
                            </p>
                            {leave.status === 'rejected' && leave.rejection_reason && (
                              <p className="text-xs text-red-500 italic">Red: {leave.rejection_reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`border text-xs ${LEAVE_STATUS_COLORS[leave.status]}`}>{LEAVE_STATUS_LABELS[leave.status]}</Badge>
                          {leave.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => approveMutation.mutate(leave.id)} disabled={approveMutation.isPending}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />Onayla
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/50 text-red-500 hover:bg-red-500/10"
                                onClick={() => setRejectDialog({ open: true, leaveId: leave.id })}>
                                <XCircle className="h-3 w-3 mr-1" />Reddet
                              </Button>
                            </div>
                          )}
                          {(leave.status === 'approved' || leave.status === 'pending') && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500 hover:text-red-500"
                              onClick={() => adminCancelMutation.mutate(leave.id)} disabled={adminCancelMutation.isPending}>
                              <Ban className="h-3 w-3 mr-1" />İptal
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reject Dialog */}
            <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, leaveId: null })}>
              <DialogContent>
                <DialogHeader><DialogTitle>İzni Reddet</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Red Sebebi (opsiyonel)</Label>
                    <Textarea placeholder="Sebebi açıklayın..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRejectDialog({ open: false, leaveId: null })}>İptal</Button>
                    <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectDialog.leaveId!, reason: rejectReason })} disabled={rejectMutation.isPending}>
                      {rejectMutation.isPending ? 'Reddediliyor...' : 'Reddet'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
