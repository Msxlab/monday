import { ApiStatusCard } from '@/components/layout/api-status-card';

export default async function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ApiStatusCard title="/api/settings" path="/api/settings" />
    </div>
  );
}
