'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function TagsPage() {
  return (
    <ModuleListPage
      title="Etiketler"
      description="Proje etiketlerini kullanıma göre listeler."
      queryKey="module-tags"
      endpoint="/projects?limit=200"
      actionLabel="Etiketleri Yenile"
      extractList={(payload) => {
        const rows = (payload as { data?: Array<{ tags?: string[] }> })?.data ?? [];
        const tagMap = new Map<string, number>();

        rows.forEach((row) => {
          (row.tags ?? []).forEach((tag) => {
            if (!tag) return;
            tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
          });
        });

        return Array.from(tagMap.entries()).map(([tag, usage_count]) => ({ tag, usage_count }));
      }}
      columns={[
        { key: 'tag', label: 'Etiket' },
        { key: 'usage_count', label: 'Kullanım' },
      ]}
    />
  );
}
