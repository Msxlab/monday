'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectTag {
  id: number;
  name: string;
  color: string;
}

interface Props {
  projectId: number;
  editable?: boolean;
}

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4',
];

export default function ProjectTags({ projectId, editable = false }: Props) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  const { data: allTags } = useQuery<ProjectTag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get('/tags');
      return data.data.map((t: ProjectTag & { projects: unknown[] }) => ({
        id: t.id, name: t.name, color: t.color,
      }));
    },
  });

  const { data: projectTags } = useQuery<ProjectTag[]>({
    queryKey: ['project-tags', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/tags/project/${projectId}`);
      return data.data;
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await api.post(`/tags/project/${projectId}/tag/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tags', projectId] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await api.delete(`/tags/project/${projectId}/tag/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tags', projectId] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/tags', { name: newTagName, color: newTagColor });
      return data.data;
    },
    onSuccess: (tag: ProjectTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTagName('');
      addTagMutation.mutate(tag.id);
      toast.success('Etiket oluşturuldu ve eklendi');
    },
    onError: () => toast.error('Etiket oluşturulamadı'),
  });

  const assignedIds = new Set((projectTags ?? []).map((t) => t.id));
  const availableTags = (allTags ?? []).filter((t) => !assignedIds.has(t.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Tag className="h-4 w-4 text-muted-foreground" />
        {(projectTags ?? []).length === 0 && (
          <span className="text-xs text-muted-foreground">Etiket yok</span>
        )}
        {(projectTags ?? []).map((tag) => (
          <Badge
            key={tag.id}
            className="text-xs gap-1"
            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
            variant="outline"
          >
            {tag.name}
            {editable && (
              <button onClick={() => removeTagMutation.mutate(tag.id)} className="ml-0.5 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {editable && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Etiket
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                {availableTags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Mevcut Etiketler</p>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTagMutation.mutate(tag.id)}
                          className="text-xs px-2 py-0.5 rounded-full border hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Yeni Etiket</p>
                  <Input
                    placeholder="Etiket adı"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTagColor(c)}
                        className="h-5 w-5 rounded-full transition-all"
                        style={{
                          backgroundColor: c,
                          outline: newTagColor === c ? '2px solid currentColor' : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => createTagMutation.mutate()}
                    disabled={!newTagName.trim() || createTagMutation.isPending}
                  >
                    Oluştur & Ekle
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
