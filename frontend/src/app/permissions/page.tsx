'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function PermissionsPage() {
  return (
    <ModuleListPage
      title="Yetkiler"
      description="Yetki ayarlarının mevcut durumunu görüntüler."
      queryKey="module-permissions"
      endpoint="/settings/permissions"
      actionLabel="Yetkileri Yenile"
      columns={[
        { key: 'resource', label: 'Kaynak' },
        { key: 'action', label: 'Aksiyon' },
        { key: 'enabled', label: 'Aktif' },
      ]}
    />
  );
}
