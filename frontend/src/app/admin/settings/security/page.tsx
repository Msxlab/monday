'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ShieldCheck,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  LogOut,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Session {
  id: number;
  device_info: string | null;
  ip_address: string | null;
  last_used_at: string | null;
  created_at: string;
  expires_at: string;
}

interface LoginLog {
  id: number;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: { id: number; first_name: string; last_name: string; email: string } | null;
}

function DeviceIcon({ deviceInfo }: { deviceInfo: string | null }) {
  const d = deviceInfo ?? '';
  if (/mobile|iphone|android/i.test(d)) return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  return <Monitor className="h-4 w-4 text-muted-foreground" />;
}

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Güvenlik Ayarları
        </h1>
        <p className="text-muted-foreground">Aktif oturumlar ve giriş geçmişi</p>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Aktif Oturumlar</TabsTrigger>
          <TabsTrigger value="history">Giriş Geçmişi</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <LoginHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SessionsTab() {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['auth-sessions'],
    queryFn: async () => {
      const { data } = await api.get('/auth/sessions');
      return data.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await api.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast.success('Oturum sonlandırıldı');
    },
    onError: () => toast.error('Oturum sonlandırılamadı'),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/sessions/revoke-others');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast.success('Diğer tüm oturumlar sonlandırıldı');
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => {
      toast.success('Tüm oturumlar sonlandırıldı');
      setTimeout(() => window.location.href = '/', 1000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  const sessionList = sessions ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Aktif Oturumlar ({sessionList.length})</span>
            {sessionList.length > 1 && (
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <LogOut className="mr-2 h-3 w-3" />
                      Diğerlerini Sonlandır
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Diğer Oturumları Sonlandır</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mevcut oturum dışındaki tüm oturumlar kapatılacak. Devam etmek istiyor musunuz?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revokeOthersMutation.mutate()}>
                        Sonlandır
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <LogOut className="mr-2 h-3 w-3" />
                      Tümünü Sonlandır
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tüm Oturumları Sonlandır</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bu işlem tüm oturumları kapatır ve çıkış yapmanızı sağlar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => logoutAllMutation.mutate()}
                      >
                        Tümünü Sonlandır
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aktif oturum bulunamadı.</p>
          ) : (
            <div className="divide-y">
              {sessionList.map((session, idx) => (
                <div key={session.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <DeviceIcon deviceInfo={session.device_info} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{session.device_info ?? 'Bilinmeyen Cihaz'}</p>
                        {idx === 0 && (
                          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40">
                            Mevcut
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {session.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.ip_address}
                          </span>
                        )}
                        {session.last_used_at && (
                          <span>Son: {formatDistanceToNow(new Date(session.last_used_at), { addSuffix: true, locale: tr })}</span>
                        )}
                        <span>Oluşturuldu: {format(new Date(session.created_at), 'd MMM yyyy', { locale: tr })}</span>
                      </div>
                    </div>
                  </div>
                  {idx !== 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => revokeMutation.mutate(session.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoginHistoryTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['login-history', page],
    queryFn: async () => {
      const { data } = await api.get(`/auth/login-history?page=${page}&limit=20`);
      return data;
    },
  });

  const logs: LoginLog[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Giriş Geçmişi</span>
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
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Giriş geçmişi bulunamadı.</p>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-6 py-3">
                {log.action === 'login_success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      log.action === 'login_success'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-destructive/15 text-destructive'
                    }`}>
                      {log.action === 'login_success' ? 'Başarılı Giriş' : 'Başarısız Giriş'}
                    </span>
                    {log.ip_address && (
                      <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>
                    )}
                  </div>
                  {log.user_agent && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                      {log.user_agent}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'd MMM yyyy', { locale: tr })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'HH:mm:ss')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <span className="text-sm text-muted-foreground">Sayfa {meta.page} / {meta.totalPages}</span>
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
  );
}
