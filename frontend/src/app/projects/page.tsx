'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function ProjectsPage() {
  return (
    <ModuleListPage
      title="Projeler"
      description="Proje listesini görüntüleyip yenileyebilirsiniz."
      queryKey="module-projects"
      endpoint="/projects?limit=50"
      actionLabel="Projeleri Yenile"
      columns={[
        { key: 'nj_number', label: 'NJ No' },
        { key: 'title', label: 'Başlık' },
        { key: 'status', label: 'Durum' },
        { key: 'priority', label: 'Öncelik' },
      ]}
    />
  );
}
