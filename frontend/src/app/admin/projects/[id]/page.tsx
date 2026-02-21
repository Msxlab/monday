'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Calendar,
  User,
  RefreshCw,
  FileText,
  History,
  DollarSign,
  MessageSquare,
  Send,
  Trash2,
  Paperclip,
  Upload,
  Download,
  File,
  Copy,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ProjectTags from '@/components/shared/ProjectTags';
import ProjectSubtasks from '@/components/shared/ProjectSubtasks';
import ProjectActivityFeed from '@/components/shared/ProjectActivityFeed';
import { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StatusHistory {
  id: number;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by?: { first_name: string; last_name: string };
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['designing', 'cancelled'],
  designing: ['revision', 'review', 'blocked', 'cancelled'],
  revision: ['designing', 'blocked', 'cancelled'],
  review: ['approved', 'revision', 'cancelled'],
  approved: ['in_production', 'cancelled'],
  in_production: ['done', 'cancelled'],
  done: [],
  cancelled: ['new'],
  blocked: ['designing', 'revision', 'cancelled'],
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneNjNumber, setCloneNjNumber] = useState('');
  const [deadlineExtOpen, setDeadlineExtOpen] = useState(false);
  const [deadlineExtDate, setDeadlineExtDate] = useState('');
  const [deadlineExtReason, setDeadlineExtReason] = useState('');

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/projects/${id}/clone`, { new_nj_number: cloneNjNumber });
      return data.data;
    },
    onSuccess: (cloned: { id: number }) => {
      toast.success('Proje klonlandı');
      setCloneDialogOpen(false);
      setCloneNjNumber('');
      router.push(`/admin/projects/${cloned.id}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Klonlama başarısız');
    },
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const deadlineExtMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/projects/${id}/deadline-extension`, {
        requested_date: new Date(deadlineExtDate).toISOString(),
        reason: deadlineExtReason,
      });
    },
    onSuccess: () => {
      toast.success('Deadline uzatma talebi gönderildi');
      setDeadlineExtOpen(false);
      setDeadlineExtDate('');
      setDeadlineExtReason('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Talep gönderilemedi');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/projects/${id}/status`, {
        status: newStatus,
        reason: statusReason || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Durum guncellendi');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusReason('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Durum guncellenemedi');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center text-muted-foreground">Proje bulunamadi.</div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[project.status] || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{project.nj_number}</h1>
              <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white`}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
              <Badge variant="outline" className={PRIORITY_COLORS[project.priority]}>
                {PRIORITY_LABELS[project.priority]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{project.title}</p>
          </div>
        </div>

        {/* Status Change */}
        {allowedTransitions.length > 0 && (
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <RefreshCw className="mr-2 h-4 w-4" />
                Durum Degistir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Proje Durumu Degistir</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Mevcut Durum</Label>
                  <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Yeni Durum</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue placeholder="Durum secin..." /></SelectTrigger>
                    <SelectContent>
                      {allowedTransitions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PROJECT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sebep (opsiyonel)</Label>
                  <Input
                    placeholder="Degisiklik sebebi..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Iptal</Button>
                  <Button
                    onClick={() => statusMutation.mutate()}
                    disabled={!newStatus || statusMutation.isPending}
                  >
                    {statusMutation.isPending ? 'Guncelleniyor...' : 'Onayla'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tags */}
      <ProjectTags projectId={Number(id)} editable />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sol: Proje Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Temel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Proje Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="NJ Numarasi" value={project.nj_number} />
                <InfoRow label="Proje Adi" value={project.title} />
                <InfoRow label="Proje Tipi" value={project.project_type?.replace('_', ' ')} />
                <InfoRow label="Ulke" value={project.country_target} />
                <InfoRow
                  label="Tasarimci"
                  value={
                    project.assigned_designer
                      ? `${project.assigned_designer.first_name} ${project.assigned_designer.last_name}`
                      : 'Atanmamis'
                  }
                />
                <InfoRow
                  label="Olusturan"
                  value={
                    project.created_by
                      ? `${project.created_by.first_name} ${project.created_by.last_name}`
                      : '-'
                  }
                />
              </div>
              {project.notes && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Proje Notu</p>
                  <p className="text-sm">{project.notes}</p>
                </div>
              )}
              {project.admin_notes && (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <p className="text-xs font-medium text-yellow-600 mb-1">Admin Ic Notu</p>
                  <p className="text-sm">{project.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarihler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Tarihler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="Başlangıç" value={project.start_date ? new Date(project.start_date).toLocaleDateString('tr-TR') : '-'} />
                <div>
                  <div className="flex items-center justify-between">
                    <InfoRow label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString('tr-TR') : '-'} />
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setDeadlineExtOpen(true)}>
                      <Clock className="h-3 w-3" />Uzatma Talebi
                    </Button>
                  </div>
                </div>
                <InfoRow label="Tahmini Bitiş" value={project.estimated_finish_date ? new Date(project.estimated_finish_date).toLocaleDateString('tr-TR') : '-'} />
                <InfoRow label="Gerçek Bitiş" value={project.actual_finish_date ? new Date(project.actual_finish_date).toLocaleDateString('tr-TR') : '-'} />
              </div>

              <Dialog open={deadlineExtOpen} onOpenChange={setDeadlineExtOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Deadline Uzatma Talebi</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Talep Edilen Tarih</Label>
                      <Input type="date" value={deadlineExtDate} onChange={(e) => setDeadlineExtDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Sebep *</Label>
                      <Textarea
                        placeholder="Neden deadline uzatma talep ediyorsunuz?"
                        value={deadlineExtReason}
                        onChange={(e) => setDeadlineExtReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDeadlineExtOpen(false)}>İptal</Button>
                      <Button
                        disabled={!deadlineExtDate || !deadlineExtReason || deadlineExtMutation.isPending}
                        onClick={() => deadlineExtMutation.mutate()}
                      >
                        {deadlineExtMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Revizyon Gecmisi */}
          {project.revisions && project.revisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5" />
                  Revizyon Gecmisi ({project.revisions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.revisions.map((rev: { id: number; revision_number: number; revision_type: string; description?: string; created_at: string }) => (
                    <div key={rev.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Badge variant="outline">#{rev.revision_number}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{rev.revision_type.replace('_', ' ')}</p>
                        {rev.description && <p className="text-sm text-muted-foreground mt-1">{rev.description}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Feed */}
          <ProjectActivityFeed
            statusHistory={project.status_history}
            comments={project.comments}
            attachments={project.attachments}
          />
        </div>

        {/* Sag: Sidebar */}
        <div className="space-y-6">
          {/* Alt Görevler */}
          <ProjectSubtasks projectId={Number(id)} editable />

          {/* Durum Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Durum Gecmisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.status_history && project.status_history.length > 0 ? (
                <div className="space-y-3">
                  {project.status_history.map((h: StatusHistory) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {h.from_status && (
                            <>
                              <Badge variant="outline" className="text-xs">
                                {PROJECT_STATUS_LABELS[h.from_status]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge className={`${PROJECT_STATUS_COLORS[h.to_status]} text-white text-xs`}>
                            {PROJECT_STATUS_LABELS[h.to_status]}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {h.changed_by && (
                            <span>{h.changed_by.first_name} {h.changed_by.last_name}</span>
                          )}
                          <span>{new Date(h.changed_at).toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Gecmis yok.</p>
              )}
            </CardContent>
          </Card>

          {/* Finansal (sadece admin gorunumu) */}
          {project.financials && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Finansal Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <InfoRow label="Musteri Butcesi" value={project.financials.client_budget ? `$${project.financials.client_budget}` : '-'} />
                  <InfoRow label="Proje Fiyati" value={project.financials.project_price ? `$${project.financials.project_price}` : '-'} />
                  <InfoRow label="Maliyet" value={project.financials.cost_price ? `$${project.financials.cost_price}` : '-'} />
                  <InfoRow label="Kar Marji" value={project.financials.profit_margin ? `%${project.financials.profit_margin}` : '-'} />
                  <InfoRow label="Odeme Durumu" value={project.financials.payment_status} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Musteri Bilgileri */}
          {project.client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Musteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <InfoRow label="Musteri Adi" value={project.client.client_name || '-'} />
                  <InfoRow label="Sirket" value={project.client.company_name || '-'} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hizli Islemler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hizli Islemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/projects/${id}/edit`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Projeyi Duzenle
                </Button>
              </Link>
              <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Copy className="mr-2 h-4 w-4" />
                    Projeyi Klonla
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Projeyi Klonla</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>{project.nj_number}</strong> projesinin kopyası oluşturulacak. Yeni NJ numarasını girin.
                    </p>
                    <div className="space-y-2">
                      <Label>Yeni NJ Numarası</Label>
                      <Input
                        placeholder="örn: NJ-2024-002"
                        value={cloneNjNumber}
                        onChange={(e) => setCloneNjNumber(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && cloneNjNumber && cloneMutation.mutate()}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>İptal</Button>
                      <Button
                        onClick={() => cloneMutation.mutate()}
                        disabled={!cloneNjNumber.trim() || cloneMutation.isPending}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {cloneMutation.isPending ? 'Klonlanıyor...' : 'Klonla'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attachments Section */}
      <AttachmentsSection projectId={Number(id)} />

      {/* Comments Section */}
      <CommentsSection projectId={Number(id)} />
    </div>
  );
}

function renderWithMentions(content: string) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-primary font-medium">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CommentsSection({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: usersData } = useQuery({
    queryKey: ['users-mention'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=100');
      return data.data as { id: number; first_name: string; last_name: string }[];
    },
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/comments/project/${projectId}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/comments', {
        project_id: projectId,
        content: newComment,
        is_internal: isInternal,
      });
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
    },
    onError: () => {
      toast.error('Yorum eklenemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
    },
  });

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    const pos = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, pos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(pos - atMatch[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (user: { first_name: string; last_name: string }) => {
    const mention = `@${user.first_name}${user.last_name} `;
    const before = newComment.slice(0, mentionStart);
    const after = newComment.slice(mentionStart + (mentionQuery?.length ?? 0) + 1);
    setNewComment(before + mention + after);
    setMentionQuery(null);
  };

  const filteredUsers = (usersData ?? []).filter((u) =>
    !mentionQuery || `${u.first_name}${u.last_name}`.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  const comments = commentsData?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Yorumlar ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Yorum yazın... (@isim ile mention yapabilirsiniz)"
              value={newComment}
              onChange={handleCommentChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMentionQuery(null);
              }}
            />
            {mentionQuery !== null && filteredUsers.length > 0 && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-card border rounded-md shadow-lg w-52">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                  >
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {u.first_name[0]}{u.last_name[0]}
                    </span>
                    {u.first_name} {u.last_name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                İç Not (sadece adminler görür)
              </label>
              <Button
                size="sm"
                disabled={!newComment.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                <Send className="mr-2 h-3 w-3" />
                Gönder
              </Button>
            </div>
          </div>
        </div>

        {comments.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            {comments.map((c: { id: number; content: string; is_internal: boolean; created_at: string; user: { id: number; first_name: string; last_name: string; avatar_url?: string } }) => (
              <div key={c.id} className={`rounded-lg border p-3 ${c.is_internal ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {c.user.first_name[0]}{c.user.last_name[0]}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{c.user.first_name} {c.user.last_name}</span>
                      {c.is_internal && <Badge variant="outline" className="ml-2 text-[10px] text-yellow-600">İç Not</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(c.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{renderWithMentions(c.content)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttachmentsSection({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isImage = (mime: string) => mime.startsWith('image/');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const { data: attachmentsData } = useQuery({
    queryKey: ['attachments', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/uploads/project/${projectId}`);
      return data.data as { id: number; original_name: string; file_name: string; file_size: number; mime_type: string; created_at: string; uploaded_by: { first_name: string; last_name: string } }[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/uploads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', projectId] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/uploads/project/${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['attachments', projectId] });
      toast.success('Dosya yuklendi');
    } catch {
      toast.error('Dosya yuklenemedi');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const attachments = attachmentsData ?? [];
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileUrl = (fileName: string) => `${API_BASE}/uploads/projects/${fileName}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Ekler ({attachments.length})
          </span>
          <label>
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-2 h-3 w-3" />
                {uploading ? 'Yukleniyor...' : 'Dosya Yukle'}
              </span>
            </Button>
          </label>
        </CardTitle>
      </CardHeader>
      {attachments.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isImage(a.mime_type) ? (
                    <button onClick={() => setPreviewUrl(getFileUrl(a.file_name))} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getFileUrl(a.file_name)} alt={a.original_name} className="h-10 w-10 rounded object-cover border hover:opacity-80 transition-opacity" />
                    </button>
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.original_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(a.file_size)} — {a.uploaded_by.first_name} {a.uploaded_by.last_name} — {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: tr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isImage(a.mime_type) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewUrl(getFileUrl(a.file_name))}>
                      <File className="h-3 w-3" />
                    </Button>
                  )}
                  <a href={getFileUrl(a.file_name)} target="_blank" rel="noopener noreferrer" download={a.original_name}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3 w-3" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(a.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      {/* Image Preview Dialog */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Dosya Önizleme</DialogTitle></DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg max-h-[70vh] object-contain" />
            <div className="flex justify-end gap-2">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" download>
                <Button variant="outline" size="sm"><Download className="mr-2 h-3 w-3" />İndir</Button>
              </a>
              <Button size="sm" onClick={() => setPreviewUrl(null)}>İptal</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '-'}</p>
    </div>
  );
}
