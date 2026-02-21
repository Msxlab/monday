'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ListChecks, Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Subtask {
  id: number;
  title: string;
  is_completed: boolean;
  sort_order: number;
  assigned_to: { id: number; first_name: string; last_name: string } | null;
}

interface Props {
  projectId: number;
  editable?: boolean;
}

export default function ProjectSubtasks({ projectId, editable = false }: Props) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');

  const { data: subtasks } = useQuery<Subtask[]>({
    queryKey: ['subtasks', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/subtasks/project/${projectId}`);
      return data.data;
    },
  });

  const { data: progress } = useQuery<{ total: number; completed: number; percentage: number }>({
    queryKey: ['subtask-progress', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/subtasks/project/${projectId}/progress`);
      return data.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['subtasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['subtask-progress', projectId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/subtasks/project/${projectId}`, { title: newTitle });
    },
    onSuccess: () => {
      setNewTitle('');
      invalidate();
    },
    onError: () => toast.error('Alt görev oluşturulamadı'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      await api.patch(`/subtasks/${id}`, { is_completed: completed });
    },
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/subtasks/${id}`);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Alt görev silindi');
    },
  });

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const percentage = progress?.percentage ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            Alt Görevler
          </span>
          {total > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {completed}/{total} tamamlandı
            </span>
          )}
        </CardTitle>
        {total > 0 && (
          <Progress value={percentage} className="h-1.5" />
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {(subtasks ?? []).map((st) => (
          <div
            key={st.id}
            className={cn(
              'flex items-center gap-3 rounded-md px-2 py-1.5 group hover:bg-muted/30 transition-colors',
              st.is_completed && 'opacity-60'
            )}
          >
            {editable && (
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 cursor-grab" />
            )}
            <Checkbox
              checked={st.is_completed}
              onCheckedChange={(checked) => toggleMutation.mutate({ id: st.id, completed: !!checked })}
              disabled={!editable}
            />
            <span className={cn('text-sm flex-1', st.is_completed && 'line-through text-muted-foreground')}>
              {st.title}
            </span>
            {st.assigned_to && (
              <span className="text-[10px] text-muted-foreground">
                {st.assigned_to.first_name} {st.assigned_to.last_name[0]}.
              </span>
            )}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => deleteMutation.mutate(st.id)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}

        {editable && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTitle.trim()) createMutation.mutate();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <Input
              placeholder="Yeni alt görev ekle..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" className="h-8 shrink-0" disabled={!newTitle.trim() || createMutation.isPending}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
        )}

        {total === 0 && !editable && (
          <p className="text-xs text-muted-foreground text-center py-4">Alt görev bulunmuyor</p>
        )}
      </CardContent>
    </Card>
  );
}
