'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Settings,
  Users,
  Shield,
  Bell,
  Calendar,
  Link2,
  Lock,
  FileText,
  UserCog,
} from 'lucide-react';

const settingsCategories = [
  { href: '/admin/users', icon: <Users className="h-6 w-6" />, title: 'Kullanıcı Yönetimi', description: 'Kullanıcıları ekle, düzenle ve yönet' },
  { href: '/admin/settings/permissions', icon: <Shield className="h-6 w-6" />, title: 'Permission Matrix', description: 'Modül × Rol × İzin matrisi' },
  { href: '/admin/settings/user-permissions', icon: <UserCog className="h-6 w-6" />, title: 'Kişisel Yetki Override', description: 'Kullanıcı bazlı özel yetki + bitiş tarihi' },
  { href: '/admin/settings/notifications', icon: <Bell className="h-6 w-6" />, title: 'Bildirim Kuralları', description: 'Bildirim tetikleyicileri ve eşikleri' },
  { href: '/admin/settings/schedule', icon: <Calendar className="h-6 w-6" />, title: 'Çalışma Takvimi', description: 'Çalışma günleri ve tatil yönetimi' },
  { href: '/admin/settings/monday', icon: <Link2 className="h-6 w-6" />, title: 'Monday Entegrasyonu', description: 'Monday.com bağlantısı ve column mapping' },
  { href: '/admin/settings/security', icon: <Lock className="h-6 w-6" />, title: 'Güvenlik Ayarları', description: 'Session, şifre politikası, 2FA' },
  { href: '/admin/audit-log', icon: <FileText className="h-6 w-6" />, title: 'Audit Log', description: 'Sistem işlem geçmişi' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Sistem Ayarları
        </h1>
        <p className="text-muted-foreground">Sistem yapılandırmasını yönetin</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((cat) => (
          <Link key={cat.href} href={cat.href}>
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
