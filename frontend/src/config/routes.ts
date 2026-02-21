import type { ComponentType } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const sidebarMenu: SidebarItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Projeler', href: '/projects', icon: FolderKanban },
  { label: 'Kullanıcılar', href: '/users', icon: Users },
  { label: 'Şirketler', href: '/companies', icon: Building2 },
  { label: 'İzinler', href: '/leaves', icon: ClipboardCheck },
  { label: 'Analitik', href: '/analytics', icon: BarChart3 },
  { label: 'Üretim', href: '/production', icon: Wrench },
  { label: 'Finans', href: '/finance', icon: Wallet },
  { label: 'Etiketler', href: '/tags', icon: Tags },
  { label: 'Yetkiler', href: '/permissions', icon: Shield },
  { label: 'Denetim', href: '/audit', icon: ScrollText },
  { label: 'Bildirimler', href: '/notifications', icon: Bell },
  { label: 'Günlük Kayıt', href: '/daily-logs', icon: TrendingUp },
  { label: 'AI Asistan', href: '/ai-chat', icon: Bot },
  { label: 'Ayarlar', href: '/settings', icon: Settings },
];
