'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function DailyLogsPage() {
  return (
    <ModuleListPage
      title="Günlük Kayıt"
      description="Tasarımcı günlük log kayıtları."
      queryKey="module-daily-logs"
      endpoint="/daily-logs?limit=50"
      actionLabel="Logları Yenile"
      columns={[
        { key: 'date', label: 'Tarih' },
        { key: 'hours_spent', label: 'Saat' },
        { key: 'task_description', label: 'Görev' },
      ]}
    />
  );
}
