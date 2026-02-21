'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Designer {
  id: number;
  first_name: string;
  last_name: string;
  max_capacity: number;
  _count: { assigned_projects: number };
}

export default function EditProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    project_type: '',
    assigned_designer_id: '',
    priority: '',
    deadline: '',
    estimated_finish_date: '',
    country_target: '',
    notes: '',
    admin_notes: '',
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data.data;
    },
  });

  const { data: designers } = useQuery({
    queryKey: ['designers'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as Designer[];
    },
  });

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title || '',
        project_type: project.project_type || 'single_unit',
        assigned_designer_id: project.assigned_designer_id ? String(project.assigned_designer_id) : '',
        priority: project.priority || 'normal',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        estimated_finish_date: project.estimated_finish_date ? project.estimated_finish_date.split('T')[0] : '',
        country_target: project.country_target || 'china',
        notes: project.notes || '',
        admin_notes: project.admin_notes || '',
      });
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: form.title,
        project_type: form.project_type,
        priority: form.priority,
        country_target: form.country_target,
      };
      if (form.assigned_designer_id) {
        payload.assigned_designer_id = parseInt(form.assigned_designer_id, 10);
      }
      if (form.deadline) {
        payload.deadline = new Date(form.deadline).toISOString();
      }
      if (form.estimated_finish_date) {
        payload.estimated_finish_date = new Date(form.estimated_finish_date).toISOString();
      }
      payload.notes = form.notes;
      payload.admin_notes = form.admin_notes;

      const { data } = await api.patch(`/projects/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proje guncellendi');
      router.push(`/admin/projects/${id}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Proje guncellenemedi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error('Proje adi zorunludur');
      return;
    }
    updateMutation.mutate();
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/projects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Proje Duzenle</h1>
          <p className="text-muted-foreground">
            {project?.nj_number} — {project?.title}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">{project?.status}</Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>NJ Numarasi</Label>
                <Input value={project?.nj_number || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Proje Adi *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Proje Tipi</Label>
                <Select value={form.project_type} onValueChange={(v) => updateField('project_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_unit">Tekli Urun</SelectItem>
                    <SelectItem value="multi_unit">Coklu Urun</SelectItem>
                    <SelectItem value="drawing">Cizim</SelectItem>
                    <SelectItem value="revision">Revizyon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Oncelik</Label>
                <Select value={form.priority} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Acil</SelectItem>
                    <SelectItem value="critical">Kritik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ulke</Label>
                <Select value={form.country_target} onValueChange={(v) => updateField('country_target', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="china">Cin</SelectItem>
                    <SelectItem value="india">Hindistan</SelectItem>
                    <SelectItem value="both">Her Ikisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasarimci Atama</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={form.assigned_designer_id}
              onValueChange={(v) => updateField('assigned_designer_id', v)}
            >
              <SelectTrigger><SelectValue placeholder="Tasarimci secin..." /></SelectTrigger>
              <SelectContent>
                {designers?.map((d) => {
                  const active = d._count.assigned_projects;
                  const max = d.max_capacity || 5;
                  return (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.first_name} {d.last_name} — {active}/{max} proje
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tarihler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => updateField('deadline', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_finish_date">Tahmini Bitis</Label>
                <Input
                  id="estimated_finish_date"
                  type="date"
                  value={form.estimated_finish_date}
                  onChange={(e) => updateField('estimated_finish_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Proje Notu (Genel)</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_notes">Admin Ic Notu</Label>
              <textarea
                id="admin_notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.admin_notes}
                onChange={(e) => updateField('admin_notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/admin/projects/${id}`}>
            <Button variant="outline">Iptal</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
}
