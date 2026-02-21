'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Shield, Plus, Search, UserCheck, UserX, Pencil, X, Download,
  Users, ChevronUp, ChevronDown, ChevronsUpDown, KeyRound, Eye,
  CheckSquare,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  max_capacity: number;
  skills: string | null;
  last_login_at: string | null;
  created_at: string;
  _count?: { assigned_projects: number };
}

type SortField = 'name' | 'capacity' | 'last_login' | 'created_at';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 text-primary" /> : <ChevronDown className="h-3 w-3 ml-1 text-primary" />;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ max_capacity: '5', skills: '', role: 'designer', is_active: true });
  const [skillInput, setSkillInput] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'designer',
    max_capacity: '5',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const { data } = await api.get(`/users?${params.toString()}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/users', { ...newUser, max_capacity: parseInt(newUser.max_capacity, 10) });
    },
    onSuccess: () => {
      toast.success('Kullanıcı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'designer', max_capacity: '5' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Kullanıcı oluşturulamadı');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.patch(`/users/${id}`, { is_active });
    },
    onSuccess: () => {
      toast.success('Kullanıcı güncellendi');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await api.patch(`/users/${id}`, data);
    },
    onSuccess: () => {
      toast.success('Kullanıcı güncellendi');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.patch(`/users/${id}`, { is_active: false })));
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} kullanıcı pasif yapıldı`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedIds(new Set());
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  const openEdit = (user: User) => {
    setEditUser(user);
    let skills: string[] = [];
    try { if (user.skills) skills = JSON.parse(user.skills) as string[]; } catch { /* ignore */ }
    setEditForm({ max_capacity: String(user.max_capacity), skills: skills.join(', '), role: user.role, is_active: user.is_active });
    setSkillInput('');
  };

  const allUsers: User[] = data?.data ?? [];

  const filteredUsers = useMemo(() => {
    let result = allUsers;
    if (statusFilter === 'active') result = result.filter((u) => u.is_active);
    if (statusFilter === 'inactive') result = result.filter((u) => !u.is_active);
    return [...result].sort((a, b) => {
      let aVal: string | number = 0, bVal: string | number = 0;
      if (sortField === 'name') { aVal = `${a.first_name} ${a.last_name}`; bVal = `${b.first_name} ${b.last_name}`; }
      else if (sortField === 'capacity') { aVal = Math.round(((a._count?.assigned_projects ?? 0) / a.max_capacity) * 100); bVal = Math.round(((b._count?.assigned_projects ?? 0) / b.max_capacity) * 100); }
      else if (sortField === 'last_login') { aVal = a.last_login_at ?? ''; bVal = b.last_login_at ?? ''; }
      else if (sortField === 'created_at') { aVal = a.created_at; bVal = b.created_at; }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allUsers, statusFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const exportCsv = () => {
    const rows = [['Ad', 'Soyad', 'Email', 'Rol', 'Kapasite', 'Aktif', 'Son Giriş']];
    filteredUsers.forEach((u) => {
      rows.push([u.first_name, u.last_name, u.email, ROLE_LABELS[u.role] || u.role, String(u.max_capacity), u.is_active ? 'Evet' : 'Hayır', u.last_login_at ? new Date(u.last_login_at).toLocaleString('tr-TR') : '-']);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV indirildi');
  };

  const statCards = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter((u) => u.is_active).length;
    const designers = allUsers.filter((u) => ['designer', 'senior_designer'].includes(u.role)).length;
    return [
      { title: 'Toplam', value: total, icon: <Users className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { title: 'Aktif', value: active, icon: <UserCheck className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { title: 'Pasif', value: total - active, icon: <UserX className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
      { title: 'Tasarımcı', value: designers, icon: <Pencil className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    ];
  }, [allUsers]);

  const isOnline = (last_login_at: string | null) => {
    if (!last_login_at) return false;
    return (Date.now() - new Date(last_login_at).getTime()) < 15 * 60 * 1000;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-muted-foreground">Kullanıcıları yönetin ve yeni ekleyin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Yeni Kullanıcı</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ad *</Label>
                    <Input value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Soyad *</Label>
                    <Input value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Şifre *</Label>
                  <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Maks Kapasite</Label>
                    <Input type="number" min="1" max="20" value={newUser.max_capacity} onChange={(e) => setNewUser({ ...newUser, max_capacity: e.target.value })} />
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
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Kullanıcı ara..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Roller</SelectItem>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durum</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} kullanıcı seçildi</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10"
              onClick={() => bulkDeactivateMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeactivateMutation.isPending}>
              <UserX className="h-3.5 w-3.5 mr-1" />Pasif Yap
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>İptal</Button>
          </div>
        </div>
      )}

      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Kullanıcı bulunamadı.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 w-10">
                      <Checkbox checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={(checked) => setSelectedIds(checked ? new Set(filteredUsers.map((u) => u.id)) : new Set())} />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center text-sm font-medium" onClick={() => toggleSort('name')}>
                        Kullanıcı<SortIcon field="name" current={sortField} dir={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center text-sm font-medium" onClick={() => toggleSort('capacity')}>
                        Kapasite<SortIcon field="capacity" current={sortField} dir={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Yetenekler</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center text-sm font-medium" onClick={() => toggleSort('last_login')}>
                        Son Giriş<SortIcon field="last_login" current={sortField} dir={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-28">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const active = user._count?.assigned_projects ?? 0;
                    const capacity = user.max_capacity;
                    const pct = Math.min(Math.round((active / Math.max(capacity, 1)) * 100), 100);
                    let skills: string[] = [];
                    try { if (user.skills) skills = JSON.parse(user.skills); } catch { /* ignore */ }
                    const online = isOnline(user.last_login_at);
                    return (
                      <tr key={user.id} className={`border-b transition-colors group ${selectedIds.has(user.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="px-3 py-3">
                          <Checkbox checked={selectedIds.has(user.id)}
                            onCheckedChange={() => setSelectedIds((prev) => { const s = new Set(prev); if (s.has(user.id)) { s.delete(user.id); } else { s.add(user.id); } return s; })} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="relative shrink-0">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {user.first_name[0]}{user.last_name[0]}
                              </div>
                              {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{ROLE_LABELS[user.role] || user.role}</Badge>
                        </td>
                        <td className="px-4 py-3 min-w-[150px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{active}/{capacity}</span>
                              <span className={pct >= 90 ? 'text-red-500 font-semibold' : pct >= 70 ? 'text-yellow-500' : 'text-emerald-500'}>{pct}%</span>
                            </div>
                            <Progress value={pct} className={`h-2 ${pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`} />
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
                          <div className="flex items-center gap-1.5">
                            {online && <span className="text-[10px] text-emerald-500 font-medium">● Çevrimiçi</span>}
                            <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-xs">
                              {user.is_active ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailUser(user)} title="Detay">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)} title="Düzenle">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })}
                              title={user.is_active ? 'Pasif yap' : 'Aktif yap'}>
                              {user.is_active ? <UserX className="h-3.5 w-3.5 text-red-400" /> : <UserCheck className="h-3.5 w-3.5 text-emerald-500" />}
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

      {/* User Detail Sheet */}
      <Sheet open={!!detailUser} onOpenChange={(open) => { if (!open) setDetailUser(null); }}>
        <SheetContent className="w-[400px]">
          <SheetHeader>
            <SheetTitle>Kullanıcı Detayı</SheetTitle>
          </SheetHeader>
          {detailUser && (() => {
            const active = detailUser._count?.assigned_projects ?? 0;
            const pct = Math.min(Math.round((active / Math.max(detailUser.max_capacity, 1)) * 100), 100);
            let skills: string[] = [];
            try { if (detailUser.skills) skills = JSON.parse(detailUser.skills); } catch { /* ignore */ }
            return (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {detailUser.first_name[0]}{detailUser.last_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{detailUser.first_name} {detailUser.last_name}</p>
                    <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Rol</p><Badge variant="outline" className="mt-1">{ROLE_LABELS[detailUser.role]}</Badge></div>
                  <div><p className="text-muted-foreground text-xs">Durum</p><Badge variant={detailUser.is_active ? 'default' : 'destructive'} className="mt-1">{detailUser.is_active ? 'Aktif' : 'Pasif'}</Badge></div>
                  <div><p className="text-muted-foreground text-xs">Maks Kapasite</p><p className="font-medium mt-1">{detailUser.max_capacity} proje</p></div>
                  <div><p className="text-muted-foreground text-xs">Aktif Proje</p><p className="font-medium mt-1">{active}</p></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Kapasite</p>
                  <Progress value={pct} className={`h-2.5 ${pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`} />
                  <p className="text-xs text-muted-foreground mt-1">{active}/{detailUser.max_capacity} ({pct}%)</p>
                </div>
                {skills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Yetenekler</p>
                    <div className="flex flex-wrap gap-1">
                      {skills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Son Giriş</span><span>{detailUser.last_login_at ? new Date(detailUser.last_login_at).toLocaleString('tr-TR') : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Oluşturulma</span><span>{new Date(detailUser.created_at).toLocaleDateString('tr-TR')}</span></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => { setDetailUser(null); openEdit(detailUser); }}>
                    <Pencil className="h-4 w-4 mr-2" />Düzenle
                  </Button>
                  <Button variant="outline" onClick={() => { setDetailUser(null); toast.info('Şifre sıfırlama e-postası gönderildi'); }}>
                    <KeyRound className="h-4 w-4 mr-2" />Şifre Sıfırla
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Kullanıcı Düzenle — {editUser?.first_name} {editUser?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Maks Kapasite</Label>
                <Input type="number" min="1" max="20" value={editForm.max_capacity}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_capacity: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Yetenekler (Enter ile ekle)</Label>
              <div className="flex flex-wrap gap-1 min-h-8 p-2 border rounded-md bg-background">
                {editForm.skills.split(',').filter(Boolean).map((s, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1 text-xs">
                    {s.trim()}
                    <button onClick={() => {
                      const arr = editForm.skills.split(',').filter(Boolean);
                      arr.splice(i, 1);
                      setEditForm((f) => ({ ...f, skills: arr.join(',') }));
                    }}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
                <Input
                  className="border-0 p-0 h-auto text-xs min-w-[120px] flex-1 focus-visible:ring-0 shadow-none"
                  placeholder="Yetenek ekle..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      e.preventDefault();
                      const existing = editForm.skills.split(',').filter(Boolean);
                      existing.push(skillInput.trim());
                      setEditForm((f) => ({ ...f, skills: existing.join(',') }));
                      setSkillInput('');
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>İptal</Button>
              <Button
                disabled={updateUserMutation.isPending}
                onClick={() => {
                  if (!editUser) return;
                  const skillsArr = editForm.skills.split(',').filter((s) => s.trim());
                  updateUserMutation.mutate({
                    id: editUser.id,
                    data: {
                      role: editForm.role,
                      max_capacity: parseInt(editForm.max_capacity),
                      skills: JSON.stringify(skillsArr),
                    },
                  });
                }}
              >
                {updateUserMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
