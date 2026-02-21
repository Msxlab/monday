'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, GanttChartSquare } from 'lucide-react';
import { addDays, differenceInDays, format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  deadline: string | null;
  assigned_designer?: { first_name: string; last_name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-400',
  designing: 'bg-blue-500',
  revision: 'bg-amber-500',
  review: 'bg-purple-500',
  approved: 'bg-emerald-500',
  in_production: 'bg-cyan-500',
  done: 'bg-green-600',
  cancelled: 'bg-red-400',
  blocked: 'bg-red-600',
};

const PRIORITY_BORDER: Record<string, string> = {
  normal: 'border-l-slate-400',
  urgent: 'border-l-amber-500',
  critical: 'border-l-red-500',
};

export default function GanttPage() {
  const [weeksToShow] = useState(6);
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const viewEnd = useMemo(() => addWeeks(viewStart, weeksToShow), [viewStart, weeksToShow]);
  const totalDays = differenceInDays(viewEnd, viewStart);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i));
  }, [viewStart, totalDays]);

  const weeks = useMemo(() => {
    const result: { start: Date; end: Date; label: string; days: number }[] = [];
    let current = viewStart;
    while (current < viewEnd) {
      const wEnd = endOfWeek(current, { weekStartsOn: 1 });
      const actualEnd = wEnd > viewEnd ? viewEnd : wEnd;
      const dayCount = differenceInDays(actualEnd, current) + 1;
      result.push({
        start: current,
        end: actualEnd,
        label: format(current, 'd MMM', { locale: tr }),
        days: dayCount,
      });
      current = addDays(actualEnd, 1);
    }
    return result;
  }, [viewStart, viewEnd]);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects-gantt'],
    queryFn: async () => {
      const res = await api.get('/projects?limit=500');
      return res.data.data as Project[];
    },
  });

  const projects = useMemo(() => {
    if (!projectsData) return [];
    let filtered = projectsData.filter((p) => p.start_date || p.deadline);
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      const aStart = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bStart = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return aStart - bStart;
    });
  }, [projectsData, statusFilter]);

  function getBarStyle(project: Project) {
    const pStart = project.start_date ? startOfDay(new Date(project.start_date)) : null;
    const pEnd = project.deadline ? startOfDay(new Date(project.deadline)) : null;

    if (!pStart && !pEnd) return null;

    const barStart = pStart || pEnd!;
    const barEnd = pEnd || pStart!;

    const startOffset = Math.max(0, differenceInDays(barStart, viewStart));
    const endOffset = Math.min(totalDays, differenceInDays(barEnd, viewStart) + 1);

    if (endOffset <= 0 || startOffset >= totalDays) return null;

    const left = (Math.max(0, startOffset) / totalDays) * 100;
    const width = ((Math.min(totalDays, endOffset) - Math.max(0, startOffset)) / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  }

  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, viewStart);
  const todayPercent = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GanttChartSquare className="h-6 w-6 text-primary" />
            Gantt Zaman Cizelgesi
          </h1>
          <p className="text-muted-foreground">Proje zaman cizelgesi gorunumu</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Durumlar</SelectItem>
              <SelectItem value="new">Yeni</SelectItem>
              <SelectItem value="designing">Tasarimda</SelectItem>
              <SelectItem value="revision">Revizyon</SelectItem>
              <SelectItem value="review">Inceleme</SelectItem>
              <SelectItem value="approved">Onaylandi</SelectItem>
              <SelectItem value="in_production">Uretimde</SelectItem>
              <SelectItem value="done">Tamamlandi</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setViewStart((v) => subWeeks(v, 2))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Bugun
          </Button>
          <Button variant="outline" size="icon" onClick={() => setViewStart((v) => addWeeks(v, 2))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {format(viewStart, 'd MMMM yyyy', { locale: tr })} — {format(addDays(viewEnd, -1), 'd MMMM yyyy', { locale: tr })}
            <span className="ml-2 text-xs">({projects.length} proje)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Week Headers */}
              <div className="flex border-b bg-muted/30">
                <div className="w-64 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground border-r">
                  Proje
                </div>
                <div className="flex-1 flex">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-medium text-muted-foreground py-2 border-r"
                      style={{ width: `${(w.days / totalDays) * 100}%` }}
                    >
                      {w.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day grid header */}
              <div className="flex border-b">
                <div className="w-64 shrink-0 border-r" />
                <div className="flex-1 flex">
                  {days.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = differenceInDays(d, today) === 0;
                    return (
                      <div
                        key={i}
                        className={`text-center text-[10px] py-1 border-r ${
                          isToday ? 'bg-primary/10 font-bold text-primary' : isWeekend ? 'bg-muted/50 text-muted-foreground' : 'text-muted-foreground'
                        }`}
                        style={{ width: `${100 / totalDays}%` }}
                      >
                        {format(d, 'd')}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Rows */}
              {projects.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Gosterilecek proje yok (tarih bilgisi olan projeler gorunur)
                </div>
              ) : (
                projects.map((project) => {
                  const barStyle = getBarStyle(project);
                  return (
                    <div key={project.id} className="flex border-b hover:bg-muted/20 transition-colors group">
                      <div className={`w-64 shrink-0 px-3 py-2 border-r border-l-4 ${PRIORITY_BORDER[project.priority] || 'border-l-slate-300'}`}>
                        <Link href={`/admin/projects/${project.id}`} className="block">
                          <div className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                            {project.nj_number}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{project.title}</div>
                          {project.assigned_designer && (
                            <div className="text-[10px] text-muted-foreground">
                              {project.assigned_designer.first_name} {project.assigned_designer.last_name}
                            </div>
                          )}
                        </Link>
                      </div>
                      <div className="flex-1 relative">
                        {/* Weekend backgrounds */}
                        {days.map((d, i) => {
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          if (!isWeekend) return null;
                          return (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 bg-muted/30"
                              style={{ left: `${(i / totalDays) * 100}%`, width: `${100 / totalDays}%` }}
                            />
                          );
                        })}
                        {/* Today line */}
                        {todayPercent !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-primary/60 z-10"
                            style={{ left: `${todayPercent}%` }}
                          />
                        )}
                        {/* Bar */}
                        {barStyle && (
                          <div
                            className={`absolute top-1.5 h-6 rounded-sm ${STATUS_COLORS[project.status] || 'bg-gray-400'} opacity-85 hover:opacity-100 transition-opacity cursor-pointer`}
                            style={barStyle}
                            title={`${project.nj_number}: ${project.start_date ? format(new Date(project.start_date), 'd MMM', { locale: tr }) : '?'} → ${project.deadline ? format(new Date(project.deadline), 'd MMM', { locale: tr }) : '?'}`}
                          >
                            <span className="text-[9px] text-white font-medium px-1 truncate block leading-6">
                              {project.nj_number}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 px-4 py-3 border-t bg-muted/20">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1">
                    <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                    <span className="text-[10px] text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
                  </div>
                ))}
                <div className="ml-4 flex items-center gap-1">
                  <div className="h-2.5 w-0.5 bg-primary/60" />
                  <span className="text-[10px] text-muted-foreground">Bugun</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
