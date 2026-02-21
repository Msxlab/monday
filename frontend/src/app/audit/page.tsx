'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function AuditPage() {
  return (
    <ModuleListPage
      title="Denetim"
      description="Sistem hareket kayıtları."
      queryKey="module-audit"
      endpoint="/audit-logs?limit=50"
      actionLabel="Kayıtları Yenile"
      columns={[
        { key: 'action', label: 'Aksiyon' },
        { key: 'entity_type', label: 'Varlık' },
        { key: 'created_at', label: 'Tarih' },
      ]}
    />
  );
}
