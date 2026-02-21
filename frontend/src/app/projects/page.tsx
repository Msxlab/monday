import { ApiStatusCard } from '@/components/layout/api-status-card';

export default async function ProjectsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Projects</h1>
      <ApiStatusCard title="/api/projects" path="/api/projects" />
    </div>
  );
}
