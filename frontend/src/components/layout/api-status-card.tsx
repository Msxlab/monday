import { Card } from '@/components/ui/card';

async function readEndpoint(path: string) {
  try {
    const response = await fetch(`http://localhost:5000${path}`, {
      cache: 'no-store',
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      preview: text.slice(0, 400),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      preview: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function ApiStatusCard({ title, path }: { title: string; path: string }) {
  const result = await readEndpoint(path);

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className={result.ok ? 'text-green-600' : 'text-amber-600'}>
          {result.ok ? 'OK' : 'Beklemede'} ({result.status || 'N/A'})
        </span>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Kaynak: {path}</p>
      <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{result.preview || 'Bos yanit'}</pre>
    </Card>
  );
}
