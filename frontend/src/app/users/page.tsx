'use client';

import ModuleListPage from '@/components/modules/module-list-page';

export default function UsersPage() {
  return (
    <ModuleListPage
      title="Kullanıcılar"
      description="Kullanıcı listesini rol bazında filtreleyebilirsiniz."
      queryKey="module-users"
      endpoint="/users?limit=100"
      actionLabel="Kullanıcıları Yenile"
      columns={[
        { key: 'first_name', label: 'Ad' },
        { key: 'last_name', label: 'Soyad' },
        { key: 'email', label: 'E-posta' },
        { key: 'role', label: 'Rol' },
      ]}
    />
  );
}
