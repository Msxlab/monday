'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nj_number: '',
    title: '',
    project_type: 'single_unit',
    assigned_designer_id: '',
    priority: 'normal',
    deadline: '',
    estimated_finish_date: '',
    country_target: 'china',
    notes: '',
    admin_notes: '',
  });

  const { data: designers } = useQuery({
    queryKey: ['designers'],
    queryFn: async () => {
      const { data } = await api.get('/users/designers');
      return data.data as Designer[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        nj_number: form.nj_number,
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
      if (form.notes) payload.notes = form.notes;
      if (form.admin_notes) payload.admin_notes = form.admin_notes;

      const { data } = await api.post('/projects', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-stats'] });
      toast.success('Proje basariyla olusturuldu');
      router.push('/admin/projects');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Proje olusturulamadi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nj_number || !form.title) {
      toast.error('NJ numarasi ve proje adi zorunludur');
      return;
    }
    createMutation.mutate();
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedDesigner = designers?.find(
    (d) => d.id === parseInt(form.assigned_designer_id, 10)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Proje Olustur</h1>
          <p className="text-muted-foreground">Proje bilgilerini girin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nj_number">NJ Numarasi *</Label>
                <Input
                  id="nj_number"
                  placeholder="NJ349"
                  value={form.nj_number}
                  onChange={(e) => updateField('nj_number', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Proje Adi *</Label>
                <Input
                  id="title"
                  placeholder="Proje adi"
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

        {/* Atama */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasarimci Atama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tasarimci Sec</Label>
              <Select
                value={form.assigned_designer_id}
                onValueChange={(v) => updateField('assigned_designer_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Tasarimci secin..." /></SelectTrigger>
                <SelectContent>
                  {designers?.map((d) => {
                    const active = d._count.assigned_projects;
                    const max = d.max_capacity || 5;
                    const pct = Math.round((active / max) * 100);
                    return (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.first_name} {d.last_name} — {active}/{max} proje ({pct}%)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedDesigner && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedDesigner.first_name} {selectedDesigner.last_name}
                  </span>
                  {(() => {
                    const pct = Math.round(
                      (selectedDesigner._count.assigned_projects / (selectedDesigner.max_capacity || 5)) * 100
                    );
                    return (
                      <Badge variant={pct >= 90 ? 'destructive' : pct >= 70 ? 'secondary' : 'default'}>
                        {pct}% kapasite
                      </Badge>
                    );
                  })()}
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${
                      (selectedDesigner._count.assigned_projects / (selectedDesigner.max_capacity || 5)) >= 0.9
                        ? 'bg-red-500'
                        : (selectedDesigner._count.assigned_projects / (selectedDesigner.max_capacity || 5)) >= 0.7
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        (selectedDesigner._count.assigned_projects / (selectedDesigner.max_capacity || 5)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarihler */}
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

        {/* Notlar */}
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
                placeholder="Genel notlar..."
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_notes">Admin Ic Notu</Label>
              <textarea
                id="admin_notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Sadece adminler gorur..."
                value={form.admin_notes}
                onChange={(e) => updateField('admin_notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/projects">
            <Button variant="outline">Iptal</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? 'Olusturuluyor...' : 'Proje Olustur'}
          </Button>
        </div>
      </form>
    </div>
  );
}
