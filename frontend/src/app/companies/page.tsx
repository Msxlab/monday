'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function CompaniesPage() {
  return (
    <ModuleListPage
      title="Şirketler"
      description="Projelerde geçen şirket verilerini listeler."
      queryKey="module-companies"
      endpoint="/projects?limit=200"
      actionLabel="Şirketleri Yenile"
      extractList={(payload) => {
        const rows = (payload as { data?: Array<{ client_company?: string }> })?.data ?? [];
        const grouped = rows.reduce<Record<string, number>>((acc, row) => {
          const key = row.client_company?.trim() || 'Belirtilmemiş';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});

        return Object.entries(grouped).map(([company, project_count]) => ({ company, project_count }));
      }}
      columns={[
        { key: 'company', label: 'Şirket' },
        { key: 'project_count', label: 'Proje Sayısı' },
      ]}
    />
  );
}
