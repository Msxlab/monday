'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderKanban, Search, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface Project {
  id: number;
  nj_number: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  _count?: { revisions: number };
}

export default function DesignerProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-projects', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get(`/projects?${params.toString()}`);
      return data;
    },
  });

  const projects: Project[] = data?.data ?? [];
  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderKanban className="h-6 w-6" />
          Projelerim
        </h1>
        <p className="text-muted-foreground">Sana atanan tum projeler</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Proje ara..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Durumlar</SelectItem>
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Proje bulunamadi.</div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const isOverdue = project.deadline && new Date(project.deadline) < today && !['done', 'cancelled'].includes(project.status);
            return (
              <Card key={project.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold">{project.nj_number}</span>
                        <Badge className={`${PROJECT_STATUS_COLORS[project.status]} text-white text-xs`}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                        {project.priority !== 'normal' && (
                          <Badge variant="outline" className="text-xs">
                            {PRIORITY_LABELS[project.priority]}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />Gecikti
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{project.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                    {project.deadline && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(project.deadline).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    {(project._count?.revisions ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {project._count?.revisions} rev
                      </Badge>
                    )}
                    <Link href={`/designer/projects/${project.id}`}>
                      <Button variant="outline" size="sm">Detay</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
