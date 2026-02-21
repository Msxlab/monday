import { ApiStatusCard } from '@/components/layout/api-status-card';

export default async function UsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <ApiStatusCard title="/api/users" path="/api/users" />
    </div>
  );
}
