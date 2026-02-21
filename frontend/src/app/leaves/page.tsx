'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function LeavesPage() {
  return (
    <ModuleListPage
      title="İzinler"
      description="İzin kayıtları ve durumları."
      queryKey="module-leaves"
      endpoint="/leaves?limit=100"
      actionLabel="İzinleri Yenile"
      columns={[
        { key: 'leave_type', label: 'İzin Türü' },
        { key: 'status', label: 'Durum' },
        { key: 'start_date', label: 'Başlangıç' },
        { key: 'end_date', label: 'Bitiş' },
      ]}
    />
  );
}
