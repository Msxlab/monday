'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Users, Eye, LayoutGrid, List, ArrowUpDown, Search, UserCheck, AlertTriangle,
  Plus, MoreVertical, Pencil, UserX, FolderKanban, CalendarDays, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';

interface Designer {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  avatar_url: string | null;
  max_capacity: number;
  skills: string | null;
  is_active?: boolean;
  _count: { assigned_projects: number };
}

interface UnassignedProject {
  id: number;
  nj_number: string;
  title: string;
}

type SortOption = 'name' | 'capacity_asc' | 'capacity_desc';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DesignersPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDesigner, setEditDesigner] = useState<Designer | null>(null);
  const [leaveDesigner, setLeaveDesigner] = useState<Designer | null>(null);
  const [newDesigner, setNewDesigner] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'designer', max_capacity: '5' });
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', max_capacity: '5', skills: '', role: 'designer' });
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', notes: '' });

  const { data: designers, isLoading } = useQuery({
    queryKey: ['designers'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as Designer[];
    },
  });

  const { data: onLeaveToday } = useQuery({
    queryKey: ['leaves-today'],
    queryFn: async () => {
      const { data } = await api.get('/leaves/stats');
      return data.data as { onLeaveTodayIds?: number[] };
    },
  });

  const { data: unassignedProjects } = useQuery({
    queryKey: ['unassigned-projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects?designer_id=unassigned&limit=50');
      return (data.data ?? []) as UnassignedProject[];
    },
  });

  const onLeaveTodayIds = new Set<number>(onLeaveToday?.onLeaveTodayIds ?? []);

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/users', { ...newDesigner, max_capacity: parseInt(newDesigner.max_capacity, 10) });
    },
    onSuccess: () => {
      toast.success('Tasarımcı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      setCreateOpen(false);
      setNewDesigner({ email: '', password: '', first_name: '', last_name: '', role: 'designer', max_capacity: '5' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Oluşturulamadı'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await api.patch(`/users/${id}`, data);
    },
    onSuccess: () => {
      toast.success('Tasarımcı güncellendi');
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      setEditDesigner(null);
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.patch(`/users/${id}`, { is_active });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? 'Hesap aktifleştirildi' : 'Hesap deaktive edildi');
      queryClient.invalidateQueries({ queryKey: ['designers'] });
    },
  });

  const assignProjectMutation = useMutation({
    mutationFn: async ({ projectId, designerId }: { projectId: number; designerId: number }) => {
      await api.patch(`/projects/${projectId}`, { assigned_designer_id: designerId });
    },
    onSuccess: () => {
      toast.success('Proje atandı');
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-projects'] });
    },
    onError: () => toast.error('Atama başarısız'),
  });

  const createLeaveMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: typeof leaveForm }) => {
      await api.post('/leaves/admin-create', {
        user_id: userId,
        leave_type: data.leave_type,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('İzin oluşturuldu (otomatik onaylı)');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-today'] });
      setLeaveDesigner(null);
      setLeaveForm({ leave_type: 'annual', start_date: '', end_date: '', notes: '' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'İzin oluşturulamadı'),
  });

  const openEdit = (d: Designer) => {
    setEditDesigner(d);
    let skills: string[] = [];
    try { if (d.skills) skills = JSON.parse(d.skills) as string[]; } catch { /* ignore */ }
    setEditForm({ first_name: d.first_name, last_name: d.last_name, max_capacity: String(d.max_capacity), skills: skills.join(', '), role: d.role });
  };

  const filteredAndSorted = useMemo(() => {
    if (!designers) return [];
    let result = [...designers];
    if (roleFilter !== 'all') result = result.filter((d) => d.role === roleFilter);
    if (search) result = result.filter((d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(search.toLowerCase()));
    result.sort((a, b) => {
      if (sortOption === 'name') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      const pA = Math.round((a._count.assigned_projects / Math.max(a.max_capacity, 1)) * 100);
      const pB = Math.round((b._count.assigned_projects / Math.max(b.max_capacity, 1)) * 100);
      return sortOption === 'capacity_desc' ? pB - pA : pA - pB;
    });
    return result;
  }, [designers, roleFilter, search, sortOption]);

  const stats = useMemo(() => {
    if (!designers) return { total: 0, available: 0, busy: 0, onLeave: 0, avgCapacity: 0 };
    const total = designers.length;
    const onLeave = designers.filter((d) => onLeaveTodayIds.has(d.id)).length;
    const busy = designers.filter((d) => !onLeaveTodayIds.has(d.id) && (d._count.assigned_projects / Math.max(d.max_capacity, 1)) >= 0.9).length;
    const available = total - busy - onLeave;
    const avgCapacity = total > 0 ? Math.round(designers.reduce((sum, d) => sum + (d._count.assigned_projects / Math.max(d.max_capacity, 1)) * 100, 0) / total) : 0;
    return { total, available, busy, onLeave, avgCapacity };
  }, [designers, onLeaveTodayIds]);

  const getAvailability = (d: Designer) => {
    if (onLeaveTodayIds.has(d.id)) return { label: 'İzinde', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' };
    const pct = Math.round((d._count.assigned_projects / Math.max(d.max_capacity, 1)) * 100);
    if (pct >= 90) return { label: 'Dolu', color: 'bg-red-500/15 text-red-500 border-red-500/30' };
    if (pct >= 70) return { label: 'Meşgul', color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' };
    return { label: 'Müsait', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' };
  };

  const ActionMenu = ({ d }: { d: Designer }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/admin/designers/${d.id}`}><Eye className="mr-2 h-4 w-4" />Detay</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(d)}>
          <Pencil className="mr-2 h-4 w-4" />Düzenle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><FolderKanban className="mr-2 h-4 w-4" />Proje Ata</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(unassignedProjects ?? []).length === 0 ? (
              <DropdownMenuItem disabled>Atamasız proje yok</DropdownMenuItem>
            ) : (
              (unassignedProjects ?? []).slice(0, 10).map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => assignProjectMutation.mutate({ projectId: p.id, designerId: d.id })}>
                  <span className="font-mono text-xs mr-2">{p.nj_number}</span>
                  <span className="truncate text-xs">{p.title}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => { setLeaveDesigner(d); setLeaveForm({ leave_type: 'annual', start_date: '', end_date: '', notes: '' }); }}>
          <CalendarDays className="mr-2 h-4 w-4" />İzin Ver
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info(`${d.first_name} için şifre sıfırlama e-postası gönderildi`)}>
          <KeyRound className="mr-2 h-4 w-4" />Şifre Sıfırla
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toggleActiveMutation.mutate({ id: d.id, is_active: d.is_active === false })}
          className={d.is_active !== false ? 'text-red-500 focus:text-red-500' : 'text-emerald-500 focus:text-emerald-500'}
        >
          {d.is_active !== false ? <><UserX className="mr-2 h-4 w-4" />Deaktive Et</> : <><UserCheck className="mr-2 h-4 w-4" />Aktifleştir</>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Tasarımcılar
          </h1>
          <p className="text-muted-foreground">Tasarımcı kapasitesi ve proje dağılımı</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tasarımcı Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Tasarımcı Ekle</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Ad *</Label>
                  <Input value={newDesigner.first_name} onChange={(e) => setNewDesigner({ ...newDesigner, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Soyad *</Label>
                  <Input value={newDesigner.last_name} onChange={(e) => setNewDesigner({ ...newDesigner, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={newDesigner.email} onChange={(e) => setNewDesigner({ ...newDesigner, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Şifre *</Label>
                <Input type="password" value={newDesigner.password} onChange={(e) => setNewDesigner({ ...newDesigner, password: e.target.value })} />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={newDesigner.role} onValueChange={(v) => setNewDesigner({ ...newDesigner, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="designer">Tasarımcı</SelectItem>
                      <SelectItem value="senior_designer">Kıdemli Tasarımcı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Maks Kapasite</Label>
                  <Input type="number" min="1" max="20" value={newDesigner.max_capacity} onChange={(e) => setNewDesigner({ ...newDesigner, max_capacity: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Toplam', value: stats.total, icon: <Users className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { title: 'Müsait', value: stats.available, icon: <UserCheck className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { title: 'Dolu/Meşgul', value: stats.busy, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { title: 'Ort. Kapasite', value: `${stats.avgCapacity}%`, icon: <ArrowUpDown className="h-5 w-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <div className={`rounded-lg p-2 ${s.bg}`}><span className={s.color}>{s.icon}</span></div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Tasarımcı ara..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Roller</SelectItem>
            <SelectItem value="designer">{ROLE_LABELS['designer']}</SelectItem>
            <SelectItem value="senior_designer">{ROLE_LABELS['senior_designer']}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sırala" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">İsme Göre</SelectItem>
            <SelectItem value="capacity_desc">Kapasite (Yüksek→Düşük)</SelectItem>
            <SelectItem value="capacity_asc">Kapasite (Düşük→Yüksek)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setView('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setView('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredAndSorted.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Tasarımcı bulunamadı.</CardContent></Card>
      )}

      {/* Grid View */}
      {!isLoading && view === 'grid' && filteredAndSorted.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((d) => {
            const active = d._count.assigned_projects;
            const max = d.max_capacity || 5;
            const pct = Math.min(Math.round((active / max) * 100), 100);
            const barColor = pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500';
            const initials = `${d.first_name[0]}${d.last_name[0]}`.toUpperCase();
            const avail = getAvailability(d);
            let skills: string[] = [];
            try { if (d.skills) skills = JSON.parse(d.skills); } catch { /* ignore */ }
            return (
              <Card key={d.id} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      {d.avatar_url && <AvatarImage src={d.avatar_url.startsWith('http') ? d.avatar_url : `${API_URL}${d.avatar_url}`} alt={d.first_name} />}
                      <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{d.first_name} {d.last_name}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className={`border text-[10px] px-1.5 ${avail.color}`}>{avail.label}</Badge>
                          <ActionMenu d={d} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[d.role] || d.role}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Kapasite</span>
                      <span className={pct >= 90 ? 'text-red-500 font-semibold' : pct >= 70 ? 'text-yellow-500' : 'text-emerald-500'}>{active}/{max} ({pct}%)</span>
                    </div>
                    <Progress value={pct} className={`h-2 ${barColor}`} />
                  </div>

                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {skills.slice(0, 3).map((s) => <Badge key={s} variant="secondary" className="text-[10px] px-1.5">{s}</Badge>)}
                      {skills.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5">+{skills.length - 3}</Badge>}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => openEdit(d)} title="Düzenle">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2"
                        onClick={() => { setLeaveDesigner(d); setLeaveForm({ leave_type: 'annual', start_date: '', end_date: '', notes: '' }); }} title="İzin Ver">
                        <CalendarDays className="h-3 w-3" />
                      </Button>
                    </div>
                    <Link href={`/admin/designers/${d.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Eye className="mr-1.5 h-3 w-3" />Detay
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && view === 'list' && filteredAndSorted.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Tasarımcı</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Kapasite</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Yetenekler</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                  <th className="px-4 py-3 text-left text-sm font-medium w-28">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((d) => {
                  const active = d._count.assigned_projects;
                  const max = d.max_capacity || 5;
                  const pct = Math.min(Math.round((active / max) * 100), 100);
                  const avail = getAvailability(d);
                  const initials = `${d.first_name[0]}${d.last_name[0]}`.toUpperCase();
                  let skills: string[] = [];
                  try { if (d.skills) skills = JSON.parse(d.skills); } catch { /* ignore */ }
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 shrink-0">
                            {d.avatar_url && <AvatarImage src={d.avatar_url.startsWith('http') ? d.avatar_url : `${API_URL}${d.avatar_url}`} alt={d.first_name} />}
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{d.first_name} {d.last_name}</p>
                            <p className="text-xs text-muted-foreground">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{ROLE_LABELS[d.role] || d.role}</Badge>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{active}/{max}</span>
                            <span className={pct >= 90 ? 'text-red-500 font-semibold' : pct >= 70 ? 'text-yellow-500' : 'text-emerald-500'}>{pct}%</span>
                          </div>
                          <Progress value={pct} className={`h-1.5 ${pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 2).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                          {skills.length > 2 && <Badge variant="outline" className="text-xs">+{skills.length - 2}</Badge>}
                          {skills.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border text-xs ${avail.color}`}>{avail.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/designers/${d.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <ActionMenu d={d} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit Designer Dialog */}
      <Dialog open={!!editDesigner} onOpenChange={(open) => { if (!open) setEditDesigner(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tasarımcı Düzenle — {editDesigner?.first_name} {editDesigner?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="designer">Tasarımcı</SelectItem>
                    <SelectItem value="senior_designer">Kıdemli Tasarımcı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Maks Kapasite</Label>
                <Input type="number" min="1" max="20" value={editForm.max_capacity} onChange={(e) => setEditForm((f) => ({ ...f, max_capacity: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Yetenekler (virgülle ayırın)</Label>
              <Input placeholder="UI, Grafik, 3D, Logo..." value={editForm.skills} onChange={(e) => setEditForm((f) => ({ ...f, skills: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDesigner(null)}>İptal</Button>
              <Button disabled={updateMutation.isPending} onClick={() => {
                if (!editDesigner) return;
                const skillsArr = editForm.skills.split(',').map((s) => s.trim()).filter(Boolean);
                updateMutation.mutate({
                  id: editDesigner.id,
                  data: {
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    role: editForm.role,
                    max_capacity: parseInt(editForm.max_capacity) || 5,
                    skills: JSON.stringify(skillsArr),
                  },
                });
              }}>
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={!!leaveDesigner} onOpenChange={(open) => { if (!open) setLeaveDesigner(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>İzin Oluştur — {leaveDesigner?.first_name} {leaveDesigner?.last_name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Bu izin otomatik olarak onaylanacaktır.</p>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>İzin Tipi</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm((f) => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Yıllık İzin</SelectItem>
                  <SelectItem value="sick">Hastalık İzni</SelectItem>
                  <SelectItem value="excuse">Mazeret İzni</SelectItem>
                  <SelectItem value="remote">Uzaktan Çalışma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Not (opsiyonel)</Label>
              <Input value={leaveForm.notes} onChange={(e) => setLeaveForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Açıklama..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLeaveDesigner(null)}>İptal</Button>
              <Button disabled={createLeaveMutation.isPending || !leaveForm.start_date || !leaveForm.end_date}
                onClick={() => leaveDesigner && createLeaveMutation.mutate({ userId: leaveDesigner.id, data: leaveForm })}>
                {createLeaveMutation.isPending ? 'Oluşturuluyor...' : 'İzin Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
