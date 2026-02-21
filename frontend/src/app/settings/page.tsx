'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function SettingsPage() {
  return (
    <ModuleListPage
      title="Ayarlar"
      description="Bildirim kuralı ayarlarını gösterir."
      queryKey="module-settings"
      endpoint="/settings/notification-rules"
      actionLabel="Ayarları Yenile"
      columns={[
        { key: 'event_type', label: 'Olay' },
        { key: 'channel', label: 'Kanal' },
        { key: 'is_active', label: 'Aktif' },
      ]}
    />
  );
}
