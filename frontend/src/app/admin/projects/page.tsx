'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, FolderKanban, Download, Trash2, CheckSquare, Bookmark, BookmarkCheck,
  MoreHorizontal, Eye, GitBranch, AlertTriangle, CheckCircle2, RefreshCw, UserCheck,
  Copy, CalendarClock, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import Pagination from '@/components/shared/Pagination';

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  start_date: string | null;
  assigned_designer?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  _count?: {
    revisions: number;
  };
}

interface SavedFilter { name: string; status: string; priority: string; search: string; }

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [designerFilter, setDesignerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [cloneDialog, setCloneDialog] = useState<{ open: boolean; projectId: number | null; njNumber: string }>({ open: false, projectId: null, njNumber: '' });
  const [deadlineDialog, setDeadlineDialog] = useState<{ open: boolean; projectId: number | null; newDeadline: string; reason: string }>({ open: false, projectId: null, newDeadline: '', reason: '' });
  const [commentDialog, setCommentDialog] = useState<{ open: boolean; projectId: number | null; content: string }>({ open: false, projectId: null, content: '' });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('project-saved-filters');
      if (stored) setSavedFilters(JSON.parse(stored));
    } catch { /* ignore parse errors */ }
  }, []);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview-mini'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/overview');
      return data.data as { totalActive: number; totalOverdue: number; completedThisMonth: number; totalReview: number };
    },
  });

  const { data: designersData } = useQuery({
    queryKey: ['designers-for-filter'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as { id: number; first_name: string; last_name: string }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, search, statusFilter, priorityFilter, designerFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (designerFilter === 'unassigned') params.set('unassigned', 'true');
      else if (designerFilter !== 'all') params.set('assigned_designer_id', designerFilter);
      if (dateFrom) params.set('deadlineFrom', dateFrom);
      if (dateTo) params.set('deadlineTo', dateTo);
      const { data } = await api.get(`/projects?${params.toString()}`);
      return data;
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await api.patch(`/projects/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Durum güncellendi');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview-mini'] });
    },
    onError: () => toast.error('Durum değiştirilemedi'),
  });

  const quickAssignMutation = useMutation({
    mutationFn: async ({ id, designer_id }: { id: number; designer_id: number | null }) => {
      await api.patch(`/projects/${id}`, { assigned_designer_id: designer_id });
    },
    onSuccess: () => {
      toast.success('Tasarımcı atandı');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Atama başarısız'),
  });

  const projects: Project[] = data?.data ?? [];
  const meta = data?.meta;

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      await api.patch('/projects/bulk/status', { ids, status });
    },
    onSuccess: () => {
      toast.success('Projeler güncellendi');
      setSelectedIds(new Set());
      setBulkStatus('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const cloneMutation = useMutation({
    mutationFn: async ({ id, nj }: { id: number; nj: string }) => {
      await api.post(`/projects/${id}/clone`, { new_nj_number: nj });
    },
    onSuccess: () => {
      toast.success('Proje klonlandı');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCloneDialog({ open: false, projectId: null, njNumber: '' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Klonlama başarısız'),
  });

  const deadlineExtMutation = useMutation({
    mutationFn: async ({ id, deadline, reason }: { id: number; deadline: string; reason: string }) => {
      await api.post(`/projects/${id}/deadline-extension`, { new_deadline: new Date(deadline).toISOString(), reason });
    },
    onSuccess: () => {
      toast.success('Deadline uzatma talebi gönderildi');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeadlineDialog({ open: false, projectId: null, newDeadline: '', reason: '' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Talep başarısız'),
  });

  const commentMutation = useMutation({
    mutationFn: async ({ projectId, content }: { projectId: number; content: string }) => {
      await api.post('/comments', { project_id: projectId, content });
    },
    onSuccess: () => {
      toast.success('Yorum eklendi');
      setCommentDialog({ open: false, projectId: null, content: '' });
    },
    onError: () => toast.error('Yorum eklenemedi'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await api.patch('/projects/bulk/cancel', { ids });
    },
    onSuccess: () => {
      toast.success('Projeler iptal edildi');
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === projects.length) { setSelectedIds(new Set()); }
    else { setSelectedIds(new Set(projects.map((p) => p.id))); }
  };

  const saveFilter = () => {
    const name = prompt('Filtre adı:');
    if (!name) return;
    const newFilter: SavedFilter = { name, status: statusFilter, priority: priorityFilter, search };
    const updated = [...savedFilters.filter((f) => f.name !== name), newFilter];
    setSavedFilters(updated);
    localStorage.setItem('project-saved-filters', JSON.stringify(updated));
    toast.success('Filtre kaydedildi');
  };

  const loadFilter = (f: SavedFilter) => {
    setSearch(f.search); setStatusFilter(f.status); setPriorityFilter(f.priority); setPage(1);
  };

  const deleteFilter = (name: string) => {
    const updated = savedFilters.filter((f) => f.name !== name);
    setSavedFilters(updated);
    localStorage.setItem('project-saved-filters', JSON.stringify(updated));
  };

  const statCards = [
    { title: 'Toplam Aktif', value: overview?.totalActive, icon: <FolderKanban className="h-5 w-5" />, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Geciken', value: overview?.totalOverdue, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10', alert: (overview?.totalOverdue ?? 0) > 0 },
    { title: 'İncelemede', value: overview?.totalReview, icon: <RefreshCw className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: 'Bu Ay Tamamlanan', value: overview?.completedThisMonth, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            Projeler
          </h1>
          <p className="text-muted-foreground">Tüm projeleri yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await api.get('/projects/export/csv', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success('CSV indirildi');
              } catch {
                toast.error('CSV indirilemedi');
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await api.get('/projects/export/excel', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `projects-${new Date().toISOString().split('T')[0]}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success('Excel indirildi');
              } catch {
                toast.error('Excel indirilemedi');
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Link href="/admin/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Proje
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <span className={s.color}>{s.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className={`text-3xl font-bold ${s.alert ? 'text-red-500' : ''}`}>{s.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved Filters Strip */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><BookmarkCheck className="h-3 w-3" />Kayıtlı:</span>
          {savedFilters.map((f) => (
            <div key={f.name} className="flex items-center gap-0">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-r-none" onClick={() => loadFilter(f)}>
                {f.name}
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-1.5 rounded-l-none border-l-0 text-muted-foreground hover:text-destructive" onClick={() => deleteFilter(f.name)}>
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="NJ numarası veya proje adı ara..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="overdue">⚠ Geciken</SelectItem>
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Öncelik" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={designerFilter} onValueChange={(v) => { setDesignerFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tasarımcı" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tasarımcılar</SelectItem>
                <SelectItem value="unassigned">Atanmamış</SelectItem>
                {(designersData ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.first_name} {d.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 h-9 text-sm" placeholder="Başlangıç" />
              <span className="text-muted-foreground text-xs">—</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 h-9 text-sm" placeholder="Bitiş" />
            </div>
            {(dateFrom || dateTo || designerFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setDesignerFilter('all'); }}>Temizle</Button>
            )}
            <Button variant="outline" size="sm" onClick={saveFilter}>
              <Bookmark className="h-3.5 w-3.5 mr-1" />Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} proje seçildi</span>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-44 h-8">
                <SelectValue placeholder="Durum değiştir" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm" variant="outline"
              disabled={!bulkStatus || bulkStatusMutation.isPending}
              onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: bulkStatus })}
            >
              Uygula
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Toplu İptal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>İptal</Button>
          </div>
        </div>
      )}

      {/* Project Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Proje bulunamadi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 w-10">
                      <Checkbox checked={selectedIds.size === projects.length && projects.length > 0} onCheckedChange={selectAll} />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">NJ No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Proje</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tasarımcı</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Öncelik</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Deadline</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rev.</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const isOverdue = project.deadline && new Date(project.deadline) < new Date() && !['done','cancelled'].includes(project.status);
                    const revCount = project._count?.revisions ?? 0;
                    return (
                      <tr
                        key={project.id}
                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                        className={`border-b transition-colors cursor-pointer group ${
                          selectedIds.has(project.id) ? 'bg-primary/5' :
                          isOverdue ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(project.id)} onCheckedChange={() => toggleSelect(project.id)} />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/projects/${project.id}`} className="font-mono text-sm font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {project.nj_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium max-w-[240px] truncate">{project.title}</td>
                        <td className="px-4 py-3 text-sm">
                          {project.assigned_designer ? (
                            <span className="flex items-center gap-1.5">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                {project.assigned_designer.first_name[0]}{project.assigned_designer.last_name[0]}
                              </div>
                              {project.assigned_designer.first_name} {project.assigned_designer.last_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Atanmamış</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white text-xs`}>
                            {PROJECT_STATUS_LABELS[project.status] || project.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[project.priority]}`}>
                            {PRIORITY_LABELS[project.priority] || project.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {project.deadline ? (
                            <span className={isOverdue ? 'text-red-500 font-semibold flex items-center gap-1' : ''}>
                              {isOverdue && <AlertTriangle className="h-3 w-3" />}
                              {new Date(project.deadline).toLocaleDateString('tr-TR')}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={revCount >= 5 ? 'destructive' : revCount >= 3 ? 'secondary' : 'outline'}
                            className={`text-xs ${revCount >= 5 ? '' : revCount >= 3 ? 'border-orange-500/50 text-orange-500 bg-orange-500/10' : 'text-muted-foreground'}`}
                          >
                            {revCount}
                          </Badge>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => router.push(`/admin/projects/${project.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />Detay
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <GitBranch className="mr-2 h-4 w-4" />Durum Değiştir
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                                    <DropdownMenuItem
                                      key={key}
                                      onClick={() => quickStatusMutation.mutate({ id: project.id, status: key })}
                                      className={project.status === key ? 'font-semibold text-primary' : ''}
                                    >
                                      {label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <UserCheck className="mr-2 h-4 w-4" />Tasarımcı Ata
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => quickAssignMutation.mutate({ id: project.id, designer_id: null })}>
                                    <span className="text-muted-foreground">Atamasız</span>
                                  </DropdownMenuItem>
                                  {(designersData ?? []).map((d) => (
                                    <DropdownMenuItem
                                      key={d.id}
                                      onClick={() => quickAssignMutation.mutate({ id: project.id, designer_id: d.id })}
                                      className={project.assigned_designer?.id === d.id ? 'font-semibold text-primary' : ''}
                                    >
                                      {d.first_name} {d.last_name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setCloneDialog({ open: true, projectId: project.id, njNumber: '' })}>
                                <Copy className="mr-2 h-4 w-4" />Klonla
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeadlineDialog({ open: true, projectId: project.id, newDeadline: '', reason: '' })}>
                                <CalendarClock className="mr-2 h-4 w-4" />Deadline Uzat
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCommentDialog({ open: true, projectId: project.id, content: '' })}>
                                <MessageSquare className="mr-2 h-4 w-4" />Hızlı Yorum
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      )}
      {/* Clone Dialog */}
      <Dialog open={cloneDialog.open} onOpenChange={(open) => { if (!open) setCloneDialog({ open: false, projectId: null, njNumber: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Projeyi Klonla</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Yeni NJ Numarası *</Label>
              <Input placeholder="NJ-XXXX" value={cloneDialog.njNumber} onChange={(e) => setCloneDialog((d) => ({ ...d, njNumber: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloneDialog({ open: false, projectId: null, njNumber: '' })}>İptal</Button>
              <Button disabled={cloneMutation.isPending || !cloneDialog.njNumber.trim()}
                onClick={() => cloneDialog.projectId && cloneMutation.mutate({ id: cloneDialog.projectId, nj: cloneDialog.njNumber.trim() })}>
                {cloneMutation.isPending ? 'Klonlanıyor...' : 'Klonla'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deadline Extension Dialog */}
      <Dialog open={deadlineDialog.open} onOpenChange={(open) => { if (!open) setDeadlineDialog({ open: false, projectId: null, newDeadline: '', reason: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deadline Uzat</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Yeni Deadline *</Label>
              <Input type="date" value={deadlineDialog.newDeadline} onChange={(e) => setDeadlineDialog((d) => ({ ...d, newDeadline: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Sebep</Label>
              <Textarea placeholder="Uzatma sebebi..." value={deadlineDialog.reason} onChange={(e) => setDeadlineDialog((d) => ({ ...d, reason: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeadlineDialog({ open: false, projectId: null, newDeadline: '', reason: '' })}>İptal</Button>
              <Button disabled={deadlineExtMutation.isPending || !deadlineDialog.newDeadline}
                onClick={() => deadlineDialog.projectId && deadlineExtMutation.mutate({ id: deadlineDialog.projectId, deadline: deadlineDialog.newDeadline, reason: deadlineDialog.reason })}>
                {deadlineExtMutation.isPending ? 'Gönderiliyor...' : 'Uzat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Comment Dialog */}
      <Dialog open={commentDialog.open} onOpenChange={(open) => { if (!open) setCommentDialog({ open: false, projectId: null, content: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hızlı Yorum</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Yorum *</Label>
              <Textarea placeholder="Yorumunuzu yazın..." value={commentDialog.content} onChange={(e) => setCommentDialog((d) => ({ ...d, content: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCommentDialog({ open: false, projectId: null, content: '' })}>İptal</Button>
              <Button disabled={commentMutation.isPending || !commentDialog.content.trim()}
                onClick={() => commentDialog.projectId && commentMutation.mutate({ projectId: commentDialog.projectId, content: commentDialog.content.trim() })}>
                {commentMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu İptal</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} proje &quot;iptal&quot; durumuna alınacak. Bu işlemi geri alamazsınız.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
            >
              Onayla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
