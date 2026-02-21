'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants';
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, Users } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  assigned_designer: { first_name: string; last_name: string } | null;
}

interface LeaveEvent {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  user: { id: number; first_name: string; last_name: string };
}

const WEEKDAYS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showLeaves, setShowLeaves] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['projects-calendar'],
    queryFn: async () => {
      const { data } = await api.get('/projects?limit=500');
      return data.data as Project[];
    },
  });

  const { data: leaveData } = useQuery({
    queryKey: ['team-calendar', currentMonth.getMonth(), currentMonth.getFullYear()],
    queryFn: async () => {
      const { data } = await api.get(`/leaves/team-calendar?month=${currentMonth.getMonth()}&year=${currentMonth.getFullYear()}`);
      return data.data as LeaveEvent[];
    },
  });

  const leaves = leaveData ?? [];

  const projects = data ?? [];

  const projectsByDate = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      if (p.deadline) {
        const key = format(new Date(p.deadline), 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    }
    return map;
  }, [projects]);

  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveEvent[]>();
    for (const l of leaves) {
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      const cur = new Date(start);
      while (cur <= end) {
        const key = format(cur, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(l);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [leaves]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Takvim
            </h1>
            <p className="text-muted-foreground text-sm">Proje deadline&apos;lari</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="show-leaves" checked={showLeaves} onCheckedChange={setShowLeaves} />
            <Label htmlFor="show-leaves" className="text-sm flex items-center gap-1 cursor-pointer">
              <Users className="h-3.5 w-3.5" />İzinler
            </Label>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-32 text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Bugün
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayProjects = projectsByDate.get(dateKey) ?? [];
              const dayLeaves = showLeaves ? (leavesByDate.get(dateKey) ?? []) : [];
              const inMonth = isSameMonth(day, currentMonth);

              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[100px] border-r border-b last:border-r-0 p-1.5',
                    !inMonth && 'bg-muted/30',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1',
                    !inMonth && 'text-muted-foreground/50',
                    isToday(day) && 'text-primary font-bold'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeaves.slice(0, 2).map((l) => (
                      <div key={`l-${l.id}`} className="text-[10px] px-1 py-0.5 rounded truncate bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        {l.user.first_name[0]}. {l.user.last_name}
                      </div>
                    ))}
                    {dayProjects.slice(0, 2).map((p) => (
                      <Link key={p.id} href={`/admin/projects/${p.id}`}>
                        <div className={cn(
                          'text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity',
                          PROJECT_STATUS_COLORS[p.status] ? `${PROJECT_STATUS_COLORS[p.status]} text-white` : 'bg-muted'
                        )}>
                          {p.nj_number}
                        </div>
                      </Link>
                    ))}
                    {(dayProjects.length + dayLeaves.length) > 4 && (
                      <div className="text-[9px] text-muted-foreground text-center">
                        +{dayProjects.length + dayLeaves.length - 4} daha
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bu Aydaki Deadline&apos;lar</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const monthProjects = projects
              .filter((p) => {
                if (!p.deadline) return false;
                const d = new Date(p.deadline);
                return isSameMonth(d, currentMonth);
              })
              .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

            if (monthProjects.length === 0) {
              return <p className="text-sm text-muted-foreground">Bu ayda deadline bulunmuyor.</p>;
            }

            return (
              <div className="divide-y">
                {monthProjects.map((p) => (
                  <Link key={p.id} href={`/admin/projects/${p.id}`}>
                    <div className="flex items-center justify-between py-2 hover:bg-muted/30 px-2 rounded transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[p.priority])} />
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{p.nj_number}</span>
                          <span className="text-sm font-medium ml-2">{p.title}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {PROJECT_STATUS_LABELS[p.status]}
                        </Badge>
                        <span className={cn(
                          'text-xs font-medium',
                          new Date(p.deadline!) < new Date() && p.status !== 'done' && p.status !== 'cancelled' ? 'text-red-500' : 'text-muted-foreground'
                        )}>
                          {format(new Date(p.deadline!), 'd MMM', { locale: tr })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
