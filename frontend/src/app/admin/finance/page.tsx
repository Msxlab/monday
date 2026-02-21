'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  partial: 'Kısmi',
  paid: 'Ödendi',
  overdue: 'Gecikmiş',
};

interface FinanceSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
  pendingPayments: number;
  overduePayments: number;
}

interface FinanceItem {
  id: number;
  project_id: number;
  client_budget: number | null;
  project_price: number | null;
  cost_price: number | null;
  profit_margin: number | null;
  payment_status: string;
  invoice_details: string | null;
  project: {
    id: number;
    nj_number: string;
    title: string;
    status: string;
  };
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
}

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const { data } = await api.get('/finance/summary');
      return data.data as FinanceSummary;
    },
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['finance-list', page],
    queryFn: async () => {
      const { data } = await api.get(`/finance/list?page=${page}&limit=20`);
      return data as { data: FinanceItem[]; meta: { page: number; limit: number; total: number; totalPages: number } };
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      await api.patch(`/finance/project/${projectId}/payment-status`, { payment_status: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-list'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Ödeme durumu güncellendi');
    },
    onError: () => toast.error('Güncelleme başarısız'),
  });

  const metricCards = [
    { title: 'Toplam Gelir', value: summary ? formatCurrency(summary.totalRevenue) : '-', icon: <TrendingUp className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Toplam Maliyet', value: summary ? formatCurrency(summary.totalCost) : '-', icon: <TrendingDown className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Toplam Kâr', value: summary ? formatCurrency(summary.totalProfit) : '-', icon: <DollarSign className="h-5 w-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Ort. Marj', value: summary ? `%${summary.avgMargin.toFixed(1)}` : '-', icon: <ArrowUpDown className="h-5 w-5" />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Bekleyen Ödeme', value: summary?.pendingPayments ?? '-', icon: <CreditCard className="h-5 w-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: 'Gecikmiş Ödeme', value: summary?.overduePayments ?? '-', icon: <CreditCard className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Finans Yönetimi
        </h1>
        <p className="text-muted-foreground">Proje gelirleri, maliyetler ve ödeme takibi</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <div className={`rounded-lg p-2 ${m.bg}`}>
                <span className={m.color}>{m.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? <Skeleton className="h-9 w-20" /> : (
                <div className="text-2xl font-bold">{m.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finance List */}
      <Card>
        <CardHeader>
          <CardTitle>Proje Finansları</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listLoading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proje</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bütçe</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fiyat</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Maliyet</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Kâr</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ödeme Durumu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listData?.data && listData.data.length > 0 ? (
                      listData.data.map((item) => {
                        const profit = (item.project_price ?? 0) - (item.cost_price ?? 0);
                        return (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/admin/projects/${item.project.id}`} className="hover:underline">
                                <span className="font-mono text-xs text-muted-foreground">{item.project.nj_number}</span>
                                <span className="ml-2 font-medium">{item.project.title}</span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.client_budget)}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.project_price)}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.cost_price)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(profit)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Select
                                value={item.payment_status}
                                onValueChange={(val) => statusMutation.mutate({ projectId: item.project_id, status: val })}
                              >
                                <SelectTrigger className="h-7 w-28 mx-auto text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          Henüz finansal kayıt yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {listData?.meta && listData.meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Toplam {listData.meta.total} kayıt
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Önceki
                    </Button>
                    <span className="text-sm flex items-center px-2">{page} / {listData.meta.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= listData.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
