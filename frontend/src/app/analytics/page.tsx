'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function AnalyticsPage() {
  return (
    <ModuleListPage
      title="Analitik"
      description="Tasarımcı performans metrikleri."
      queryKey="module-analytics"
      endpoint="/analytics/designers"
      actionLabel="Analitiği Yenile"
      columns={[
        { key: 'designer_name', label: 'Tasarımcı' },
        { key: 'completed', label: 'Tamamlanan' },
        { key: 'on_time_rate', label: 'Zamanında Oran' },
      ]}
    />
  );
}
