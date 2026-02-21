'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, ChevronLeft, ChevronRight, Search, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const ACTION_COLORS: Record<string, string> = {
  project_created: 'bg-indigo-500/15 text-indigo-400',
  project_updated: 'bg-blue-500/15 text-blue-400',
  status_changed: 'bg-purple-500/15 text-purple-400',
  leave_approved: 'bg-emerald-500/15 text-emerald-400',
  leave_rejected: 'bg-red-500/15 text-red-400',
  leave_requested: 'bg-yellow-500/15 text-yellow-400',
  production_order_created: 'bg-orange-500/15 text-orange-400',
  production_order_updated: 'bg-orange-500/15 text-orange-400',
  finance_viewed: 'bg-amber-500/15 text-amber-400',
  login_success: 'bg-emerald-500/15 text-emerald-400',
  login_failed: 'bg-red-500/15 text-red-400',
  session_revoked: 'bg-orange-500/15 text-orange-400',
};

interface AuditLog {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user: { id: number; first_name: string; last_name: string; email: string; role: string } | null;
}

const RESOURCE_OPTIONS = ['project', 'project_financial', 'leave', 'production_order', 'user', 'auth'];

function DiffView({ oldVal, newVal }: { oldVal: Record<string, unknown> | null; newVal: Record<string, unknown> | null }) {
  if (!oldVal && !newVal) return null;
  const keys = Array.from(new Set([...Object.keys(oldVal ?? {}), ...Object.keys(newVal ?? {})]));
  const changed = keys.filter((k) => JSON.stringify((oldVal ?? {})[k]) !== JSON.stringify((newVal ?? {})[k]));
  if (changed.length === 0 && newVal) {
    return (
      <div className="mt-2 font-mono text-xs text-muted-foreground bg-muted/40 rounded p-2">
        {JSON.stringify(newVal)}
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1">
      {changed.map((k) => (
        <div key={k} className="flex items-center gap-2 text-xs font-mono">
          <span className="text-muted-foreground min-w-[100px] truncate">{k}:</span>
          {(oldVal ?? {})[k] !== undefined && (
            <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded line-through">
              {String((oldVal ?? {})[k])}
            </span>
          )}
          {(newVal ?? {})[k] !== undefined && (
            <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
              {String((newVal ?? {})[k])}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function buildParams(extra?: Record<string, string>) {
    const params = new URLSearchParams();
    if (actionFilter) params.set('action', actionFilter);
    if (resourceFilter !== 'all') params.set('resource', resourceFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, resourceFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = buildParams({ page: page.toString(), limit: '30' });
      const { data } = await api.get(`/audit-logs?${params}`);
      return data;
    },
  });

  const logs: AuditLog[] = data?.data ?? [];
  const meta = data?.meta;

  function handleExportCsv() {
    const params = buildParams();
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/audit-logs/export/csv?${params}`;
    window.open(url, '_blank');
  }

  function resetFilters() {
    setActionFilter('');
    setResourceFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">Sistem işlem geçmişi</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="mr-2 h-4 w-4" />
          CSV İndir
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="İşlem ara..."
            className="pl-10"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1); }}>
          <SelectTrigger>
            <SelectValue placeholder="Kaynak filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kaynaklar</SelectItem>
            {RESOURCE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder="Başlangıç tarihi"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            placeholder="Bitiş tarihi"
          />
          {(actionFilter || resourceFilter !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="shrink-0">
              Temizle
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>İşlem Geçmişi</span>
            {meta && (
              <span className="text-sm font-normal text-muted-foreground">
                Toplam {meta.total} kayıt
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Log kaydı bulunamadı.</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasDiff = log.old_value || log.new_value;
                return (
                  <div
                    key={log.id}
                    className="px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">{log.resource_type}</Badge>
                          {log.resource_id && (
                            <span className="text-xs text-muted-foreground">#{log.resource_id}</span>
                          )}
                        </div>
                        {log.user && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">{log.user.first_name} {log.user.last_name}</span>
                            <span className="text-muted-foreground"> — {log.user.email}</span>
                          </p>
                        )}
                        {isExpanded && hasDiff && (
                          <DiffView oldVal={log.old_value} newVal={log.new_value} />
                        )}
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end gap-1">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'd MMM yyyy', { locale: tr })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground font-mono">{log.ip_address}</p>
                        )}
                        {hasDiff && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 mt-1"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <span className="text-sm text-muted-foreground">
                Sayfa {meta.page} / {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
