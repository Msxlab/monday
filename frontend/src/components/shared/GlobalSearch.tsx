'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants';
import { Search, FolderKanban, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

interface SearchResult {
  id: number;
  type: 'project' | 'user';
  title: string;
  subtitle: string;
  status?: string;
  href: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);
  const basePath = isAdmin ? '/admin' : user?.role === 'production' ? '/production' : '/designer';

  const { data: projectResults } = useQuery({
    queryKey: ['search-projects', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data } = await api.get(`/projects?search=${encodeURIComponent(query)}&limit=5`);
      return (data.data ?? []).map((p: { id: number; nj_number: string; title: string; status: string }) => ({
        id: p.id,
        type: 'project' as const,
        title: `${p.nj_number} — ${p.title}`,
        subtitle: PROJECT_STATUS_LABELS[p.status] ?? p.status,
        status: p.status,
        href: `${basePath}/projects/${p.id}`,
      }));
    },
    enabled: query.length >= 2,
  });

  const { data: userResults } = useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query || query.length < 2 || !isAdmin) return [];
      const { data } = await api.get(`/users?search=${encodeURIComponent(query)}&limit=5`);
      return (data.data ?? []).map((u: { id: number; first_name: string; last_name: string; email: string; role: string }) => ({
        id: u.id,
        type: 'user' as const,
        title: `${u.first_name} ${u.last_name}`,
        subtitle: u.email,
        href: `/admin/users`,
      }));
    },
    enabled: query.length >= 2 && !!isAdmin,
  });

  const results: SearchResult[] = [...(projectResults ?? []), ...(userResults ?? [])];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Ara...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
          Ctrl+K
        </kbd>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 w-[400px] rounded-lg border bg-card shadow-lg z-50">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Proje veya kullanici ara..."
              className="border-0 bg-transparent p-0 h-8 shadow-none focus-visible:ring-0"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {query.length >= 2 && (
            <div className="max-h-72 overflow-y-auto py-1">
              {results.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sonuc bulunamadi
                </div>
              ) : (
                results.map((r) => (
                  <div
                    key={`${r.type}-${r.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(r)}
                  >
                    {r.type === 'project' ? (
                      <FolderKanban className="h-4 w-4 text-indigo-500 shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                    {r.status && (
                      <div className={cn('h-2 w-2 rounded-full shrink-0', PROJECT_STATUS_COLORS[r.status])} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {query.length < 2 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              En az 2 karakter yazin
            </div>
          )}
        </div>
      )}
    </div>
  );
}
