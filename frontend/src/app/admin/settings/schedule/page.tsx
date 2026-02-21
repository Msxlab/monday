'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Calendar, ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const DAYS = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' },
];

interface Holiday {
  id: number;
  country_code: string;
  holiday_name: string;
  holiday_date: string;
  is_recurring: boolean;
}

interface WorkSchedule {
  monday: boolean; tuesday: boolean; wednesday: boolean;
  thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean;
  work_start_time: string; work_end_time: string;
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [newHoliday, setNewHoliday] = useState({ country_code: 'TR', holiday_name: '', holiday_date: '' });
  const [schedule, setSchedule] = useState<WorkSchedule>({
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
    saturday: false, sunday: false, work_start_time: '09:00', work_end_time: '18:00',
  });

  const { data: holidays, isLoading: holidaysLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data } = await api.get('/settings/holidays');
      return data.data as Holiday[];
    },
  });

  const { isLoading: scheduleLoading } = useQuery({
    queryKey: ['work-schedule'],
    queryFn: async () => {
      const { data } = await api.get('/settings/work-schedule');
      if (data.data) setSchedule(data.data);
      return data.data as WorkSchedule | null;
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      await api.put('/settings/work-schedule', schedule);
    },
    onSuccess: () => toast.success('Çalışma takvimi kaydedildi'),
    onError: () => toast.error('Kaydetme başarısız'),
  });

  const addHolidayMutation = useMutation({
    mutationFn: async () => {
      await api.post('/settings/holidays', {
        ...newHoliday,
        holiday_date: new Date(newHoliday.holiday_date).toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Tatil eklendi');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setNewHoliday({ country_code: 'TR', holiday_name: '', holiday_date: '' });
    },
    onError: () => toast.error('Tatil eklenemedi'),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/settings/holidays/${id}`);
    },
    onSuccess: () => {
      toast.success('Tatil silindi');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Geri</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Çalışma Takvimi
          </h1>
          <p className="text-muted-foreground">Çalışma günleri ve tatil yönetimi</p>
        </div>
      </div>

      {/* Work Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Çalışma Günleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {scheduleLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {DAYS.map((d) => (
                  <div key={d.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <span className="text-sm font-medium">{d.label}</span>
                    <Switch
                      checked={schedule[d.key as keyof WorkSchedule] as boolean}
                      onCheckedChange={(v: boolean) => setSchedule({ ...schedule, [d.key]: v })}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="space-y-2">
                  <Label>Mesai Başlangıcı</Label>
                  <Input
                    type="time"
                    value={schedule.work_start_time}
                    onChange={(e) => setSchedule({ ...schedule, work_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mesai Bitişi</Label>
                  <Input
                    type="time"
                    value={schedule.work_end_time}
                    onChange={(e) => setSchedule({ ...schedule, work_end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveScheduleMutation.mutate()} disabled={saveScheduleMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <CardTitle>Resmi Tatiller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Holiday Form */}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-2">
              <Label>Ülke Kodu</Label>
              <Input className="w-24" value={newHoliday.country_code} onChange={(e) => setNewHoliday({ ...newHoliday, country_code: e.target.value.toUpperCase() })} placeholder="TR" />
            </div>
            <div className="space-y-2 flex-1 min-w-40">
              <Label>Tatil Adı</Label>
              <Input value={newHoliday.holiday_name} onChange={(e) => setNewHoliday({ ...newHoliday, holiday_name: e.target.value })} placeholder="Cumhuriyet Bayramı..." />
            </div>
            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })} />
            </div>
            <Button
              onClick={() => addHolidayMutation.mutate()}
              disabled={addHolidayMutation.isPending || !newHoliday.holiday_name || !newHoliday.holiday_date}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ekle
            </Button>
          </div>

          {/* Holiday List */}
          {holidaysLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !holidays || holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Tatil eklenmemiş.</p>
          ) : (
            <div className="divide-y rounded-lg border overflow-hidden">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">{h.country_code}</span>
                      <span className="text-sm font-medium">{h.holiday_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.holiday_date), 'd MMMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteHolidayMutation.mutate(h.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
