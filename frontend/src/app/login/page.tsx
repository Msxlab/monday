'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    window.localStorage.setItem('designer_tracker_token', 'demo-token');
    router.push('/admin');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-2 text-2xl font-bold">Giris</h1>
        <p className="mb-6 text-sm text-muted-foreground">Demo oturum acarak yonetim paneline gecebilirsiniz.</p>
        <Button className="w-full" onClick={handleLogin}>
          Demo giris yap
        </Button>
      </Card>
    </div>
  );
}
