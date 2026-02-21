'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type RecordItem = Record<string, unknown>;

type Column = {
  key: string;
  label: string;
  render?: (row: RecordItem) => string;
};

interface ModuleListPageProps {
  title: string;
  description: string;
  queryKey: string;
  endpoint: string;
  columns: Column[];
  actionLabel: string;
  extractList?: (data: unknown) => RecordItem[];
}

const defaultExtractList = (data: unknown): RecordItem[] => {
  if (Array.isArray(data)) return data as RecordItem[];
  const response = data as { data?: unknown };
  if (Array.isArray(response?.data)) return response.data as RecordItem[];
  return [];
};

const toSearchText = (row: RecordItem) =>
  Object.values(row)
    .map((value) => String(value ?? ''))
    .join(' ')
    .toLowerCase();

export default function ModuleListPage({
  title,
  description,
  queryKey,
  endpoint,
  columns,
  actionLabel,
  extractList = defaultExtractList,
}: ModuleListPageProps) {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const response = await api.get(endpoint);
      return extractList(response.data);
    },
  });

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    if (!search.trim()) return rows;
    return rows.filter((row) => toSearchText(row).includes(search.toLowerCase()));
  }, [data, search]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching}>
          {actionLabel}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrele / Ara</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Liste içinde ara..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kayıtlar ({filteredRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {columns.map((column) => (
                      <th key={column.key} className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b last:border-0">
                        {columns.map((column) => (
                          <td key={column.key} className="px-4 py-3">
                            {column.render ? column.render(row) : String(row[column.key] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
