'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function FinancePage() {
  return (
    <ModuleListPage
      title="Finans"
      description="Proje finans kayıtları."
      queryKey="module-finance"
      endpoint="/finance/list?page=1&limit=50"
      actionLabel="Finansı Yenile"
      extractList={(payload) => (payload as { data?: unknown[] })?.data ?? []}
      columns={[
        { key: 'project_id', label: 'Proje ID' },
        { key: 'payment_status', label: 'Ödeme Durumu' },
        { key: 'project_price', label: 'Proje Fiyatı' },
        { key: 'cost_price', label: 'Maliyet' },
      ]}
    />
  );
}
