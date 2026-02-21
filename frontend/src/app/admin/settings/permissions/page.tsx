'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/constants';

interface PermissionOverride {
  id: number;
  role: string;
  field_name: string;
  resource_type: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ROLES = ['super_admin', 'admin', 'senior_designer', 'designer', 'production'] as const;

interface MatrixSection {
  title: string;
  rows: { label: string; resource_type: string; field_name: string }[];
}

const MATRIX_SECTIONS: MatrixSection[] = [
  {
    title: 'Proje Yönetimi',
    rows: [
      { label: 'Proje Oluştur', resource_type: 'project', field_name: 'create' },
      { label: 'Proje Düzenle', resource_type: 'project', field_name: 'edit' },
      { label: 'Proje Sil', resource_type: 'project', field_name: 'delete' },
      { label: 'Proje Görüntüle', resource_type: 'project', field_name: 'view' },
      { label: 'CSV Export', resource_type: 'project', field_name: 'export_csv' },
      { label: 'Excel Export', resource_type: 'project', field_name: 'export_excel' },
    ],
  },
  {
    title: 'Finans & Müşteri',
    rows: [
      { label: 'Finans Görüntüle', resource_type: 'project_financial', field_name: 'view' },
      { label: 'Finans Düzenle', resource_type: 'project_financial', field_name: 'edit' },
      { label: 'Müşteri Bilgisi Görüntüle', resource_type: 'project_client', field_name: 'view' },
      { label: 'Müşteri Bilgisi Düzenle', resource_type: 'project_client', field_name: 'edit' },
    ],
  },
  {
    title: 'İzin Yönetimi',
    rows: [
      { label: 'İzin Oluştur', resource_type: 'leave', field_name: 'create' },
      { label: 'İzin Onayla/Reddet', resource_type: 'leave', field_name: 'approve' },
      { label: 'İzin Listele (Tümü)', resource_type: 'leave', field_name: 'view_all' },
    ],
  },
  {
    title: 'Üretim',
    rows: [
      { label: 'Sipariş Oluştur', resource_type: 'production', field_name: 'create' },
      { label: 'Sipariş Onayla', resource_type: 'production', field_name: 'approve' },
      { label: 'Sipariş Görüntüle', resource_type: 'production', field_name: 'view' },
    ],
  },
  {
    title: 'Analitik & Raporlama',
    rows: [
      { label: 'Analitik Görüntüle', resource_type: 'analytics', field_name: 'view' },
      { label: 'Günlük Log Görüntüle (Tümü)', resource_type: 'daily_log', field_name: 'view_all' },
    ],
  },
  {
    title: 'Sistem Yönetimi',
    rows: [
      { label: 'Kullanıcı Yönet', resource_type: 'user', field_name: 'manage' },
      { label: 'Kullanıcı Deaktif Et', resource_type: 'user', field_name: 'deactivate' },
      { label: 'Audit Log Görüntüle', resource_type: 'audit_log', field_name: 'view' },
      { label: 'Bildirim Kuralı Yönet', resource_type: 'notification', field_name: 'manage' },
      { label: 'Monday Sync Yönet', resource_type: 'monday', field_name: 'manage' },
    ],
  },
];

type MatrixKey = `${string}|${string}|${string}`;

function makeKey(role: string, resource_type: string, field_name: string): MatrixKey {
  return `${role}|${resource_type}|${field_name}`;
}

export default function PermissionsPage() {
  const queryClient = useQueryClient();

  const [matrix, setMatrix] = useState<Record<MatrixKey, { can_view: boolean; can_edit: boolean; can_delete: boolean }>>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<PermissionOverride[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get('/settings/permissions');
      return data.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    // Default permissions for roles (super_admin & admin get everything by default)
    const defaults: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }> = {};
    MATRIX_SECTIONS.forEach((section) => {
      section.rows.forEach((row) => {
        ['super_admin', 'admin'].forEach((role) => {
          defaults[makeKey(role, row.resource_type, row.field_name)] = { can_view: true, can_edit: true, can_delete: true };
        });
      });
    });
    const m: Record<MatrixKey, { can_view: boolean; can_edit: boolean; can_delete: boolean }> = { ...defaults };
    data.forEach((p) => {
      const key = makeKey(p.role, p.resource_type, p.field_name);
      m[key] = { can_view: p.can_view, can_edit: p.can_edit, can_delete: p.can_delete };
    });
    setMatrix(m);
    setDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissions = Object.entries(matrix).map(([key, val]) => {
        const [role, resource_type, field_name] = key.split('|');
        return { role, resource_type, field_name, can_view: val.can_view, can_edit: val.can_edit, can_delete: val.can_delete };
      });
      await api.put('/settings/permissions/bulk', { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast.success('Yetki matrisi kaydedildi');
      setDirty(false);
    },
    onError: () => toast.error('Kaydetme başarısız'),
  });

  function toggle(role: string, resource_type: string, field_name: string, field: 'can_view' | 'can_edit' | 'can_delete') {
    const key = makeKey(role, resource_type, field_name);
    const current = matrix[key] ?? { can_view: false, can_edit: false, can_delete: false };
    const updated = { ...current };

    if (field === 'can_delete') {
      updated.can_delete = !current.can_delete;
      if (updated.can_delete) { updated.can_view = true; updated.can_edit = true; }
    } else if (field === 'can_edit') {
      updated.can_edit = !current.can_edit;
      if (updated.can_edit) updated.can_view = true;
      if (!updated.can_edit) updated.can_delete = false;
    } else {
      updated.can_view = !current.can_view;
      if (!updated.can_view) { updated.can_edit = false; updated.can_delete = false; }
    }

    setMatrix((prev) => ({ ...prev, [key]: updated }));
    setDirty(true);
  }

  function getVal(role: string, resource_type: string, field_name: string) {
    return matrix[makeKey(role, resource_type, field_name)] ?? { can_view: false, can_edit: false, can_delete: false };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Permission Matrix
          </h1>
          <p className="text-muted-foreground">Modül × Rol × İzin matrisi — değişiklikler kaydet butonuyla uygulanır</p>
        </div>
        {dirty && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500/30 border border-emerald-500/50" /> Görüntüle
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded bg-blue-500/30 border border-blue-500/50" /> Düzenle
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded bg-red-500/30 border border-red-500/50" /> Sil
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-56">Modül / İzin</th>
                  {ROLES.map((role) => (
                    <th key={role} className="px-3 py-3 text-center font-medium text-xs" style={{ minWidth: 100 }}>
                      <div className="text-foreground">{ROLE_LABELS[role] ?? role}</div>
                      <div className="flex justify-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>Gör</span>
                        <span>Düz</span>
                        <span>Sil</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_SECTIONS.map((section) => (
                  <>
                    <tr key={`section-${section.title}`} className="bg-muted/40">
                      <td colSpan={ROLES.length + 1} className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row, idx) => (
                      <tr key={`${section.title}-${idx}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-medium pl-6">{row.label}</td>
                        {ROLES.map((role) => {
                          const val = getVal(role, row.resource_type, row.field_name);
                          return (
                            <td key={role} className="px-3 py-2.5">
                              <div className="flex justify-center items-center gap-2">
                                <Switch
                                  checked={val.can_view}
                                  onCheckedChange={() => toggle(role, row.resource_type, row.field_name, 'can_view')}
                                  className="data-[state=checked]:bg-emerald-500 scale-[0.65]"
                                />
                                <Switch
                                  checked={val.can_edit}
                                  onCheckedChange={() => toggle(role, row.resource_type, row.field_name, 'can_edit')}
                                  className="data-[state=checked]:bg-blue-500 scale-[0.65]"
                                />
                                <Switch
                                  checked={val.can_delete}
                                  onCheckedChange={() => toggle(role, row.resource_type, row.field_name, 'can_delete')}
                                  className="data-[state=checked]:bg-red-500 scale-[0.65]"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
