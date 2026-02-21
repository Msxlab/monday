'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import Link from 'next/link';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import { ArrowLeft, GripVertical, Calendar, ChevronLeft, AlertTriangle, Eye, EyeOff, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  assigned_designer: { id: number; first_name: string; last_name: string } | null;
  _count?: { revisions: number };
}

const KANBAN_COLUMNS_ACTIVE = [
  'new',
  'designing',
  'revision',
  'review',
  'approved',
  'in_production',
  'blocked',
];

const KANBAN_COLUMNS_DONE = ['done', 'cancelled'];

const WIP_LIMITS: Record<string, number> = {
  designing: 8,
  revision: 4,
  review: 5,
  in_production: 6,
};

const VALID_DROPS: Record<string, string[]> = {
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

function KanbanColumn({
  status,
  projects,
  isOver,
  collapsed,
  onToggleCollapse,
}: {
  status: string;
  projects: Project[];
  isOver: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  const wip = WIP_LIMITS[status];
  const overLimit = wip !== undefined && projects.length > wip;

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className="flex flex-col items-center rounded-lg border bg-muted/30 min-w-[42px] max-w-[42px] cursor-pointer hover:bg-muted/60 transition-colors"
        onClick={onToggleCollapse}
        title={`${PROJECT_STATUS_LABELS[status] ?? status} (${projects.length})`}
      >
        <div className="py-3 flex flex-col items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', PROJECT_STATUS_COLORS[status])} />
          <span className="text-xs font-medium [writing-mode:vertical-rl] rotate-180 text-muted-foreground select-none" style={{ fontSize: '10px' }}>
            {PROJECT_STATUS_LABELS[status] ?? status}
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 w-5 p-0 justify-center">{projects.length}</Badge>
          <ChevronLeft className="h-3 w-3 text-muted-foreground rotate-180" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border bg-muted/30 min-w-[280px] max-w-[280px]',
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
        overLimit && 'border-orange-500/50'
      )}
    >
      <div className="px-3 py-2.5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full', PROJECT_STATUS_COLORS[status])} />
            <span className="text-sm font-medium">{PROJECT_STATUS_LABELS[status] ?? status}</span>
          </div>
          <div className="flex items-center gap-1">
            {overLimit && (
              <span title="WIP limiti aşıldı">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              </span>
            )}
            <Badge
              variant="secondary"
              className={cn('text-xs h-5 min-w-5 justify-center', overLimit && 'bg-orange-500/20 text-orange-500')}
            >
              {projects.length}{wip ? `/${wip}` : ''}
            </Badge>
            <button
              onClick={onToggleCollapse}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Daralt"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {wip && (
          <Progress
            value={Math.min(Math.round((projects.length / wip) * 100), 100)}
            className={cn('h-1 mt-2', overLimit ? '[&>div]:bg-orange-500' : '[&>div]:bg-primary/60')}
          />
        )}
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {projects.map((project) => (
          <DraggableProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Proje yok
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group rounded-md border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow',
        isDragging && 'opacity-30'
      )}
    >
      <ProjectCardContent project={project} onNavigate={() => router.push(`/admin/projects/${project.id}`)} />
    </div>
  );
}

function ProjectCard({ project, isDragging }: { project: Project; isDragging?: boolean }) {
  const router = useRouter();
  return (
    <div
      className={cn(
        'group rounded-md border bg-card p-3 shadow-sm',
        isDragging && 'shadow-lg ring-2 ring-primary/30'
      )}
    >
      <ProjectCardContent project={project} onNavigate={() => router.push(`/admin/projects/${project.id}`)} />
    </div>
  );
}

function ProjectCardContent({ project, onNavigate }: { project: Project; onNavigate?: () => void }) {
  const rev = project._count?.revisions ?? 0;
  const isOverdue = project.deadline && new Date(project.deadline) < new Date();
  const initials = project.assigned_designer
    ? `${project.assigned_designer.first_name[0]}${project.assigned_designer.last_name[0]}`
    : null;
  const revBadgeClass = rev === 0 ? '' : rev >= 3 ? 'bg-red-500/20 text-red-500 border-red-500/30' : rev >= 2 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 'bg-secondary text-secondary-foreground';

  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="font-mono text-[10px] text-muted-foreground">{project.nj_number}</span>
          </div>
          <button
            type="button"
            className="text-sm font-medium hover:text-primary transition-colors line-clamp-2 mt-0.5 text-left w-full"
            onClick={(e) => { e.stopPropagation(); onNavigate?.(); }}
          >
            {project.title}
          </button>
        </div>
        <Badge className={cn('text-[9px] h-4 px-1 shrink-0', PRIORITY_COLORS[project.priority])}>
          {PRIORITY_LABELS[project.priority]?.substring(0, 3) ?? ''}
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {project.assigned_designer && initials && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] font-bold bg-primary/15 text-primary">{initials}</AvatarFallback>
            </Avatar>
          )}
          {project.deadline && (
            <span className={cn('flex items-center gap-0.5 text-[10px]', isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground')}>
              {isOverdue && <AlertTriangle className="h-2.5 w-2.5" />}
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(project.deadline), 'd MMM', { locale: tr })}
            </span>
          )}
        </div>
        {rev > 0 && (
          <Badge className={cn('text-[9px] h-4 px-1 border', revBadgeClass)}>
            R{rev}
          </Badge>
        )}
      </div>
    </>
  );
}

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [showDone, setShowDone] = useState(false);
  const [designerFilter, setDesignerFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: designersData } = useQuery({
    queryKey: ['designers-kanban'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as { id: number; first_name: string; last_name: string }[];
    },
  });

  const toggleCollapse = (status: string) => {
    setCollapsedCols((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data, isLoading } = useQuery({
    queryKey: ['projects-kanban'],
    queryFn: async () => {
      const { data } = await api.get('/projects?limit=200');
      return data.data as Project[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await api.patch(`/projects/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-stats'] });
      toast.success('Durum guncellendi');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Durum guncellenemedi');
      queryClient.invalidateQueries({ queryKey: ['projects-kanban'] });
    },
  });

  const allProjects = data ?? [];
  const projects = useMemo(() => {
    let result = allProjects;
    if (designerFilter !== 'all') result = result.filter((p) => p.assigned_designer?.id === parseInt(designerFilter));
    if (priorityFilter !== 'all') result = result.filter((p) => p.priority === priorityFilter);
    if (search) result = result.filter((p) => p.nj_number.toLowerCase().includes(search.toLowerCase()) || p.title.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [allProjects, designerFilter, priorityFilter, search]);

  const KANBAN_COLUMNS = showDone
    ? [...KANBAN_COLUMNS_ACTIVE, ...KANBAN_COLUMNS_DONE]
    : KANBAN_COLUMNS_ACTIVE;

  const columnMap: Record<string, Project[]> = {};
  for (const col of KANBAN_COLUMNS) {
    columnMap[col] = [];
  }
  for (const p of projects) {
    if (columnMap[p.status]) {
      columnMap[p.status].push(p);
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = event.active.id as number;
    const project = projects.find((p) => p.id === projectId);
    setActiveProject(project ?? null);
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    if (event.over) {
      setOverColumn(String(event.over.id));
    } else {
      setOverColumn(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    setOverColumn(null);

    if (!over) return;

    const projectId = active.id as number;
    const newStatus = String(over.id);
    const project = projects.find((p) => p.id === projectId);

    if (!project || project.status === newStatus) return;

    const allowed = VALID_DROPS[project.status] ?? [];
    if (!allowed.includes(newStatus)) {
      toast.error(`${PROJECT_STATUS_LABELS[project.status]} → ${PROJECT_STATUS_LABELS[newStatus]} gecisi yapilamaz`);
      return;
    }

    statusMutation.mutate({ id: projectId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Kanban Board</h1>
            <p className="text-muted-foreground text-sm">Projeleri sürükleyerek durum değiştirin</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Proje ara..." className="pl-8 h-8 text-xs w-44" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {designersData && designersData.length > 0 && (
            <Select value={designerFilter} onValueChange={setDesignerFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Tasarımcı" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tasarımcılar</SelectItem>
                {designersData.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.first_name} {d.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Öncelik" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öncelik</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowDone((v) => !v)} className="h-8 text-xs">
            {showDone ? <><EyeOff className="h-3.5 w-3.5 mr-1" />Gizle</> : <><Eye className="h-3.5 w-3.5 mr-1" />Tamamlananlar</>}
          </Button>
          <span className="text-xs text-muted-foreground">{projects.length} proje</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              projects={columnMap[status]}
              isOver={overColumn === status}
              collapsed={!!collapsedCols[status]}
              onToggleCollapse={() => toggleCollapse(status)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProject && <ProjectCard project={activeProject} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
