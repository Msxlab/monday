'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  Users,
} from 'lucide-react';

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  assigned_designer?: { id: number; first_name: string; last_name: string };
  _count?: { revisions: number };
}

export default function DesignerDashboard() {
  const { user } = useAuthStore();
  const isSeniorDesigner = user?.role === 'senior_designer';

  const { data } = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
  });

  const { data: designersData } = useQuery({
    queryKey: ['designers-workload'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as { id: number; first_name: string; last_name: string; max_capacity: number; _count: { assigned_projects: number } }[];
    },
    enabled: isSeniorDesigner,
  });

  const projects: Project[] = data?.data ?? [];
  const myProjects = isSeniorDesigner
    ? projects.filter((p) => p.assigned_designer?.id === user?.id)
    : projects;

  const activeProjects = myProjects.filter((p) => !['done', 'cancelled'].includes(p.status));
  const today = new Date();
  const dueSoon = activeProjects.filter((p) => {
    if (!p.deadline) return false;
    const dl = new Date(p.deadline);
    const diff = (dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 2 && diff >= 0;
  });

  const reviewProjects = isSeniorDesigner
    ? projects.filter((p) => ['review', 'approved'].includes(p.status))
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Merhaba, {user?.first_name}!
          {isSeniorDesigner && <Star className="h-5 w-5 text-blue-400 fill-blue-400" />}
        </h1>
        <p className="text-muted-foreground">
          {isSeniorDesigner ? 'Kıdemli Tasarımcı' : 'Tasarımcı'} — Aktif projen: {activeProjects.length}
          {dueSoon.length > 0 && ` | Yaklaşan deadline: ${dueSoon.length}`}
        </p>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 ${isSeniorDesigner ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Projem</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yaklaşan Deadline</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{dueSoon.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tamamlanan</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {myProjects.filter((p) => p.status === 'done').length}
            </div>
          </CardContent>
        </Card>
        {isSeniorDesigner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">İnceleme Bekleyen</CardTitle>
              <Star className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{reviewProjects.length}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Senior Designer: Review Projects */}
      {isSeniorDesigner && reviewProjects.length > 0 && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <Star className="h-4 w-4" />
              İnceleme / Onay Bekleyen Projeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{project.nj_number}</span>
                    <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white text-xs`}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                    <span className="text-sm font-medium">{project.title}</span>
                    {project.assigned_designer && (
                      <span className="text-xs text-muted-foreground">— {project.assigned_designer.first_name}</span>
                    )}
                  </div>
                  <Link href={`/designer/projects/${project.id}`}>
                    <Button variant="outline" size="sm">İncele</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Senior Designer: Team Workload */}
      {isSeniorDesigner && designersData && designersData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Takım İş Yükü
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {designersData.map((d) => {
                const pct = Math.round((d._count.assigned_projects / d.max_capacity) * 100);
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{d.first_name} {d.last_name}</span>
                      <span className="text-muted-foreground">{d._count.assigned_projects}/{d.max_capacity}</span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-2 ${pct >= 100 ? '[&>div]:bg-red-500' : pct >= 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Aktif Projelerim</CardTitle>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aktif projen bulunmuyor.</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((project) => {
                const isOverdue = project.deadline && new Date(project.deadline) < today;

                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{project.nj_number}</span>
                          <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white text-xs`}>
                            {PROJECT_STATUS_LABELS[project.status]}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Gecikti
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{project.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {project.deadline && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(project.deadline).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                      <Link href={`/designer/projects/${project.id}`}>
                        <Button variant="outline" size="sm">Detay</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
