import { ApiStatusCard } from '@/components/layout/api-status-card';

export default async function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Temel backend endpoint durumlari burada goruntulenir.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ApiStatusCard title="Projects API" path="/api/projects" />
        <ApiStatusCard title="Users API" path="/api/users" />
        <ApiStatusCard title="Settings API" path="/api/settings" />
      </div>
    </div>
  );
}
