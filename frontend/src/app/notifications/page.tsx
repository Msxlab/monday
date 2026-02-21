'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { Bell, CheckCheck, ExternalLink, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
  project: { id: number; nj_number: string; title: string } | null;
}

const TYPE_COLORS: Record<string, string> = {
  leave_approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  leave_rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
  leave_requested: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  project_assigned: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  project_status_changed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  deadline_warning: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  revision_requested: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  comment_added: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  production_order_created: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  production_order_updated: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  system: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  default: 'bg-muted text-muted-foreground',
};

const TYPE_LABELS: Record<string, string> = {
  leave_approved: 'İzin Onay',
  leave_rejected: 'İzin Red',
  leave_requested: 'İzin Talebi',
  project_assigned: 'Proje Atama',
  project_status_changed: 'Durum Değişikliği',
  deadline_warning: 'Deadline Uyarısı',
  revision_requested: 'Revizyon',
  comment_added: 'Yorum',
  production_order_created: 'Üretim Siparişi',
  production_order_updated: 'Sipariş Güncelleme',
  system: 'Sistem',
};

function groupNotifications(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const thisMonth: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifications) {
    const date = new Date(n.created_at);
    if (isToday(date)) today.push(n);
    else if (isYesterday(date)) yesterday.push(n);
    else if (isThisWeek(date, { weekStartsOn: 1 })) thisWeek.push(n);
    else if (isThisMonth(date)) thisMonth.push(n);
    else older.push(n);
  }

  if (today.length > 0) groups.push({ label: 'Bugün', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Dün', items: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'Bu Hafta', items: thisWeek });
  if (thisMonth.length > 0) groups.push({ label: 'Bu Ay', items: thisMonth });
  if (older.length > 0) groups.push({ label: 'Daha Eski', items: older });

  return groups;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [showUnread, setShowUnread] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', showUnread],
    queryFn: async () => {
      const params = showUnread ? '?unread=true' : '';
      const { data } = await api.get(`/notifications${params}`);
      return data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const allNotifications: Notification[] = data?.data ?? [];

  const filteredNotifications = useMemo(() => {
    if (typeFilter === 'all') return allNotifications;
    return allNotifications.filter((n) => n.type === typeFilter);
  }, [allNotifications, typeFilter]);

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;
  const grouped = useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(allNotifications.map((n) => n.type));
    return Array.from(types);
  }, [allNotifications]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Bildirimler
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimleriniz'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <SelectValue placeholder="Tüm Tipler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tipler</SelectItem>
              {uniqueTypes.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showUnread ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowUnread(!showUnread)}
          >
            Okunmamış
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Tümünü Okundu
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<BellOff className="h-8 w-8 text-muted-foreground" />}
              title={showUnread ? 'Okunmamış bildirim yok' : 'Henüz bildiriminiz bulunmuyor'}
              description={showUnread ? 'Tüm bildirimleriniz okunmuş durumda.' : 'Yeni bildirimler burada görünecek.'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h3>
              <Card className="overflow-hidden">
                <div className="divide-y">
                  {group.items.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-4 px-4 lg:px-6 py-4 transition-colors cursor-pointer',
                        !n.is_read ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/30'
                      )}
                      onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                    >
                      <div className="mt-1.5 flex-shrink-0">
                        <div className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          !n.is_read ? 'bg-primary' : 'bg-transparent'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TYPE_COLORS[n.type] ?? TYPE_COLORS.default)}>
                                {TYPE_LABELS[n.type] || n.type.replace(/_/g, ' ')}
                              </span>
                              {n.project && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {n.project.nj_number}
                                </span>
                              )}
                            </div>
                            <p className={cn('text-sm mt-1', !n.is_read ? 'font-semibold' : 'font-medium')}>
                              {n.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                            </span>
                            {n.action_url && (
                              <Link href={n.action_url} onClick={(e) => e.stopPropagation()}>
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                                  <ExternalLink className="h-3 w-3" />
                                </Badge>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
