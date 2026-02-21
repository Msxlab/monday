'use client';

import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { User, Lock, Camera, Shield, Bell, Palette, Type, BellRing } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import Link from 'next/link';
import { useThemeStore, ACCENT_COLORS } from '@/lib/theme-store';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { isSubscribed, isSupported, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { accent, fontSize, setAccent, setFontSize } = useThemeStore();
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  const { data: fetchedPrefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/preferences');
      return data.data as Record<string, boolean>;
    },
  });

  useEffect(() => {
    if (fetchedPrefs) setNotifPrefs(fetchedPrefs);
  }, [fetchedPrefs]);

  const prefMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      await api.put('/notifications/preferences', prefs);
    },
    onSuccess: () => toast.success('Bildirim tercihleri kaydedildi'),
    onError: () => toast.error('Tercihler kaydedilemedi'),
  });

  const togglePref = (key: string) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    prefMutation.mutate(updated);
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const avatarSrc = user.avatar_url
    ? user.avatar_url.startsWith('http')
      ? user.avatar_url
      : `${API_BASE}${user.avatar_url}`
    : undefined;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'ı geçemez');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...user, avatar_url: data.data.avatar_url });
      toast.success('Profil fotoğrafı güncellendi');
    } catch {
      toast.error('Fotoğraf yüklenemedi');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler uyuşmuyor');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Şifre en az 8 karakter olmalı');
      return;
    }
    setChanging(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Şifre başarıyla değiştirildi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Şifre değiştirilemedi. Mevcut şifreyi kontrol edin.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          Profil
        </h1>
        <p className="text-muted-foreground">Hesap bilgileriniz ve şifre değiştirme</p>
      </div>

      {/* Profil Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hesap Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                {avatarSrc && <AvatarImage src={avatarSrc} alt={user.first_name} />}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold">{user.first_name} {user.last_name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className="text-xs">{ROLE_LABELS[user.role] || user.role}</Badge>
              {uploadingAvatar && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: 'Ad', value: user.first_name },
              { label: 'Soyad', value: user.last_name },
              { label: 'Email', value: user.email },
              { label: 'Rol', value: ROLE_LABELS[user.role] },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Güvenlik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href={user.role === 'super_admin' || user.role === 'admin' ? '/admin/settings/security' : '/profile/security'}>
            <Button variant="outline" className="w-full justify-start">
              Aktif Oturumlarımı Gör
            </Button>
          </Link>
          <Link href={user.role === 'super_admin' || user.role === 'admin' ? '/admin/settings/security' : '/profile/security'}>
            <Button variant="outline" className="w-full justify-start">
              Giriş Geçmişim
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Push Bildirimler */}
      {isSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Push Bildirimler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tarayici Bildirimleri</p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed
                    ? 'Bildirimler aktif — proje güncellemeleri ve hatirlaticilar alacaksiniz'
                    : 'Bildirimleri etkinlestirerek proje güncellemelerini aninda alin'}
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                disabled={pushLoading}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    const ok = await subscribe();
                    if (ok) toast.success('Push bildirimler etkinlestirildi');
                    else toast.error('Bildirim izni reddedildi veya VAPID yapilandirilmamis');
                  } else {
                    const ok = await unsubscribe();
                    if (ok) toast.success('Push bildirimler devre disi birakildi');
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bildirim Tercihleri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="h-5 w-5 text-primary" />
            Bildirim Tercihleri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'project_assigned', label: 'Proje Ataması', desc: 'Size yeni bir proje atandığında' },
            { key: 'project_status_changed', label: 'Durum Değişikliği', desc: 'Projelerinizin durumu değiştiğinde' },
            { key: 'project_comment', label: 'Yeni Yorum', desc: 'Projelerinize yorum eklendiğinde' },
            { key: 'deadline_warning', label: 'Deadline Uyarısı', desc: 'Proje teslim tarihi yaklaştığında' },
            { key: 'leave_status', label: 'İzin Durumu', desc: 'İzin talebiniz onaylandığında/reddedildiğinde' },
            { key: 'production_update', label: 'Üretim Güncellemesi', desc: 'Üretim siparişi güncellendiğinde' },
            { key: 'system_alert', label: 'Sistem Uyarıları', desc: 'Önemli sistem bildirimleri' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifPrefs[item.key] ?? true}
                onCheckedChange={() => togglePref(item.key)}
              />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">E-posta Bildirimleri</p>
              <p className="text-xs text-muted-foreground">Bildirimleri e-posta olarak da al</p>
            </div>
            <Switch
              checked={notifPrefs.email_enabled ?? false}
              onCheckedChange={() => togglePref('email_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Görünüm Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Görünüm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Tema Rengi</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((color) => {
                const isActive = accent === color.value;
                return (
                  <button
                    key={color.value}
                    onClick={() => setAccent(color.value)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      color.class,
                      isActive ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : 'hover:scale-105'
                    )}
                    title={color.label}
                  />
                );
              })}
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Type className="h-4 w-4" />
              Yazı Boyutu
            </p>
            <div className="flex gap-2">
              {([['sm', 'Küçük'], ['base', 'Normal'], ['lg', 'Büyük']] as const).map(([size, label]) => (
                <Button
                  key={size}
                  variant={fontSize === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize(size)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Şifre Değiştirme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Şifre Değiştir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Mevcut Şifre</Label>
              <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Yeni Şifre</Label>
              <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
              <p className="text-xs text-muted-foreground">En az 8 karakter</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Yeni Şifre (Tekrar)</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changing}>
                {changing ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
