'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardList, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';

interface DailyLog {
  id: number;
  project_id: number | null;
  log_date: string;
  log_type: string;
  content: string | null;
  created_at: string;
  project?: { id: number; nj_number: string; title: string };
}

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
}

const LOG_TYPE_LABELS: Record<string, string> = {
  checkin: 'Giriş',
  checkout: 'Çıkış',
  note: 'Not',
  update: 'Güncelleme',
};

const LOG_TYPE_COLORS: Record<string, string> = {
  checkin: 'bg-emerald-500/15 text-emerald-600',
  checkout: 'bg-red-500/15 text-red-600',
  note: 'bg-blue-500/15 text-blue-600',
  update: 'bg-yellow-500/15 text-yellow-600',
};

const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function DailyLogsPage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    project_id: '',
    log_type: 'note',
    content: '',
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['daily-logs', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await api.get(
        `/daily-logs?startDate=${format(weekStart, 'yyyy-MM-dd')}&endDate=${format(weekEnd, 'yyyy-MM-dd')}`
      );
      return data.data as DailyLog[];
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['my-projects-for-log'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data as Project[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/daily-logs', {
        project_id: form.project_id ? parseInt(form.project_id) : null,
        log_date: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString(),
        log_type: form.log_type,
        content: form.content || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Günlük log eklendi');
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      setCreateOpen(false);
      setForm({ project_id: '', log_type: 'note', content: '' });
    },
    onError: () => toast.error('Log eklenemedi'),
  });

  const logs: DailyLog[] = logsData ?? [];
  const projects: Project[] = projectsData ?? [];

  const logsByDay = useMemo(() => {
    const map = new Map<string, DailyLog[]>();
    for (const log of logs) {
      const key = format(new Date(log.log_date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  const totalLogs = logs.length;

  const openCreate = (date: Date) => {
    setSelectedDate(date);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Günlük Loglar
          </h1>
          <p className="text-muted-foreground text-sm">Haftalık çalışma takibi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-52 text-center">
            {format(weekStart, 'd MMM', { locale: tr })} — {format(weekEnd, 'd MMM yyyy', { locale: tr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>Bu Hafta</Button>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['checkin', 'checkout', 'note', 'update'] as const).map((type) => (
          <Card key={type}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{LOG_TYPE_LABELS[type]}</p>
              <p className="text-2xl font-bold">{logs.filter((l) => l.log_type === type).length}</p>
              <p className="text-xs text-muted-foreground mt-1">adet</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Bu haftaki toplam {totalLogs} log kaydı</p>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayLogs = logsByDay.get(dateKey) ?? [];
          const isWeekend = i >= 5;

          return (
            <Card
              key={dateKey}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                isToday(day) ? 'ring-2 ring-primary/50' : ''
              } ${isWeekend ? 'opacity-60' : ''}`}
              onClick={() => !isWeekend && openCreate(day)}
            >
              <CardHeader className="px-3 py-2 pb-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{WEEKDAY_SHORT[i]}</p>
                    <p className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  {dayLogs.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {dayLogs.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-3 py-2 pt-0">
                {isLoading ? (
                  <div className="h-4 bg-muted animate-pulse rounded" />
                ) : dayLogs.length === 0 ? (
                  !isWeekend && (
                    <p className="text-[10px] text-muted-foreground/50 text-center py-2">
                      <Plus className="h-3 w-3 mx-auto" />
                    </p>
                  )
                ) : (
                  <div className="space-y-1">
                    {dayLogs.map((log) => (
                      <div key={log.id} className={`rounded px-1.5 py-1 text-[10px] ${LOG_TYPE_COLORS[log.log_type] || 'bg-muted'}`}>
                        <div className="font-medium">{LOG_TYPE_LABELS[log.log_type] || log.log_type}</div>
                        {log.content && <div className="truncate opacity-75">{log.content}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Log List */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bu Haftanın Logları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {logs
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-12">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.log_date), 'EEE', { locale: tr })}
                        </p>
                        <p className="text-sm font-bold">
                          {format(new Date(log.log_date), 'd MMM', { locale: tr })}
                        </p>
                      </div>
                      <div>
                        {log.project && (
                          <p className="text-sm font-medium">
                            <span className="font-mono text-xs text-muted-foreground">{log.project.nj_number}</span>
                            {' '}{log.project.title}
                          </p>
                        )}
                        {log.content && <p className="text-xs text-muted-foreground mt-0.5">{log.content}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={`text-xs ${LOG_TYPE_COLORS[log.log_type]}`}>
                        {LOG_TYPE_LABELS[log.log_type] || log.log_type}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Log Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Log Ekle — {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: tr }) : ''}
            </DialogTitle>
          </DialogHeader>
            <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Log Türü</Label>
              <Select value={form.log_type} onValueChange={(v) => setForm((f) => ({ ...f, log_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkin">Giriş</SelectItem>
                  <SelectItem value="checkout">Çıkış</SelectItem>
                  <SelectItem value="note">Not</SelectItem>
                  <SelectItem value="update">Güncelleme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proje (opsiyonel)</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm((f) => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Proje seçin..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Genel Çalışma</SelectItem>
                  {projects.filter((p) => !['done', 'cancelled'].includes(p.status)).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nj_number} — {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>İçerik / Not</Label>
              <Textarea
                placeholder="Ne yaptınız? Ne gözlemlediniz?"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
              <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
