export const PROJECT_STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  designing: 'Tasarımda',
  revision: 'Revizyon',
  review: 'İnceleme',
  approved: 'Onaylı',
  in_production: 'Üretimde',
  done: 'Tamamlandı',
  cancelled: 'İptal',
  blocked: 'Beklemede',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-400',
  designing: 'bg-indigo-500',
  revision: 'bg-yellow-500',
  review: 'bg-blue-500',
  approved: 'bg-emerald-500',
  in_production: 'bg-purple-500',
  done: 'bg-green-700',
  cancelled: 'bg-red-500',
  blocked: 'bg-orange-500',
};

export const PRIORITY_LABELS: Record<string, string> = {
  normal: 'Normal',
  urgent: 'Acil',
  critical: 'Kritik',
};

export const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-slate-500/15 text-slate-600 border-slate-300',
  urgent: 'bg-yellow-500/15 text-yellow-700 border-yellow-400',
  critical: 'bg-red-500/15 text-red-600 border-red-400',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  senior_designer: 'Kıdemli Tasarımcı',
  designer: 'Tasarımcı',
  production: 'Üretim',
};
