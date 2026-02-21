'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Calendar, CheckCircle2, XCircle, Loader2, Plus, Trash2, RefreshCw, ArrowUpDown } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ColumnMapping {
  monday_column_id: string;
  local_field: string;
  direction: 'push' | 'pull' | 'both';
}

interface MondayConfig {
  api_token: string;
  board_id: string;
  column_mappings: ColumnMapping[];
  conflict_resolution: 'local_wins' | 'monday_wins' | 'latest_wins';
  sync_enabled: boolean;
}

interface SyncLog {
  id: number;
  project: { id: number; nj_number: string; title: string } | null;
  monday_item_id: string | null;
  sync_direction: string;
  sync_status: string;
  error_message: string | null;
  created_at: string;
}

const LOCAL_FIELDS = [
  { value: 'title', label: 'Proje Adi' },
  { value: 'nj_number', label: 'NJ Numarasi' },
  { value: 'status', label: 'Durum' },
  { value: 'priority', label: 'Oncelik' },
  { value: 'deadline', label: 'Teslim Tarihi' },
  { value: 'start_date', label: 'Baslangic Tarihi' },
  { value: 'notes', label: 'Notlar' },
];

export default function MondaySettingsPage() {
  const [config, setConfig] = useState<MondayConfig>({
    api_token: '',
    board_id: '',
    column_mappings: [],
    conflict_resolution: 'local_wins',
    sync_enabled: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [connectionAccount, setConnectionAccount] = useState('');
  const [boardColumns, setBoardColumns] = useState<{ id: string; title: string; type: string }[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
    loadSyncLogs();
  }, []);

  async function loadConfig() {
    try {
      const res = await api.get('/api/monday/config');
      if (res.data.data) {
        setConfig(res.data.data);
        setConnectionStatus('connected');
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false);
    }
  }

  async function loadSyncLogs() {
    try {
      const res = await api.get('/api/monday/sync-logs?limit=20');
      setSyncLogs(res.data.data || []);
    } catch {
      // ignore
    }
  }

  async function testConnection() {
    if (!config.api_token) {
      toast.error('API Token gerekli');
      return;
    }
    setConnectionStatus('testing');
    try {
      const res = await api.post('/api/monday/test-connection', { api_token: config.api_token });
      if (res.data.data?.success) {
        setConnectionStatus('connected');
        setConnectionAccount(res.data.data.account || '');
        toast.success(`Baglanti basarili: ${res.data.data.account}`);
      } else {
        setConnectionStatus('failed');
        toast.error(res.data.data?.error || 'Baglanti basarisiz');
      }
    } catch {
      setConnectionStatus('failed');
      toast.error('Baglanti testi basarisiz');
    }
  }

  async function fetchBoardColumns() {
    if (!config.api_token || !config.board_id) {
      toast.error('API Token ve Board ID gerekli');
      return;
    }
    try {
      const res = await api.post('/api/monday/board-columns', {
        api_token: config.api_token,
        board_id: config.board_id,
      });
      setBoardColumns(res.data.data || []);
      toast.success(`${res.data.data?.length || 0} kolon bulundu`);
    } catch {
      toast.error('Kolonlar alinamadi');
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      await api.put('/api/monday/config', config);
      toast.success('Yapilandirma kaydedildi');
    } catch {
      toast.error('Kaydetme basarisiz');
    } finally {
      setSaving(false);
    }
  }

  function addMapping() {
    setConfig((prev) => ({
      ...prev,
      column_mappings: [...prev.column_mappings, { monday_column_id: '', local_field: '', direction: 'both' }],
    }));
  }

  function removeMapping(index: number) {
    setConfig((prev) => ({
      ...prev,
      column_mappings: prev.column_mappings.filter((_, i) => i !== index),
    }));
  }

  function updateMapping(index: number, field: keyof ColumnMapping, value: string) {
    setConfig((prev) => ({
      ...prev,
      column_mappings: prev.column_mappings.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Monday.com Entegrasyonu
        </h1>
        <p className="text-muted-foreground">API baglantisi, board mapping ve senkronizasyon ayarlari</p>
      </div>

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            API Baglantisi
            {connectionStatus === 'connected' && <Badge className="bg-green-100 text-green-800">Bagli</Badge>}
            {connectionStatus === 'failed' && <Badge variant="destructive">Basarisiz</Badge>}
            {connectionStatus === 'idle' && <Badge variant="secondary">Yapilandirilmadi</Badge>}
          </CardTitle>
          <CardDescription>Monday.com API token ve board bilgilerini girin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input
                type="password"
                placeholder="Monday.com API Token"
                value={config.api_token}
                onChange={(e) => setConfig((prev) => ({ ...prev, api_token: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Board ID</Label>
              <Input
                placeholder="Board numarasi"
                value={config.board_id}
                onChange={(e) => setConfig((prev) => ({ ...prev, board_id: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={testConnection} disabled={connectionStatus === 'testing'}>
              {connectionStatus === 'testing' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Test Ediliyor...</>
              ) : connectionStatus === 'connected' ? (
                <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Tekrar Test Et</>
              ) : connectionStatus === 'failed' ? (
                <><XCircle className="mr-2 h-4 w-4 text-red-600" /> Tekrar Dene</>
              ) : (
                'Baglanti Testi'
              )}
            </Button>
            <Button variant="outline" onClick={fetchBoardColumns} disabled={!config.api_token || !config.board_id}>
              <RefreshCw className="mr-2 h-4 w-4" /> Kolonlari Getir
            </Button>
          </div>
          {connectionAccount && (
            <p className="text-sm text-muted-foreground">Hesap: <strong>{connectionAccount}</strong></p>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Kolon Eslestirme
          </CardTitle>
          <CardDescription>Monday.com kolonlarini yerel alanlara esleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.column_mappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Monday Kolon</Label>
                {boardColumns.length > 0 ? (
                  <Select
                    value={mapping.monday_column_id}
                    onValueChange={(v) => updateMapping(index, 'monday_column_id', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Kolon sec" /></SelectTrigger>
                    <SelectContent>
                      {boardColumns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.title} ({col.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Kolon ID"
                    value={mapping.monday_column_id}
                    onChange={(e) => updateMapping(index, 'monday_column_id', e.target.value)}
                  />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Yerel Alan</Label>
                <Select
                  value={mapping.local_field}
                  onValueChange={(v) => updateMapping(index, 'local_field', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Alan sec" /></SelectTrigger>
                  <SelectContent>
                    {LOCAL_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Yon</Label>
                <Select
                  value={mapping.direction}
                  onValueChange={(v) => updateMapping(index, 'direction', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="pull">Pull</SelectItem>
                    <SelectItem value="both">Her Iki Yon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeMapping(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMapping}>
            <Plus className="mr-2 h-4 w-4" /> Eslestirme Ekle
          </Button>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senkronizasyon Ayarlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Senkronizasyonu Etkinlestir</Label>
              <p className="text-sm text-muted-foreground">Push/pull islemlerini aktif et</p>
            </div>
            <Switch
              checked={config.sync_enabled}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, sync_enabled: v }))}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Catisma Cozumu</Label>
            <Select
              value={config.conflict_resolution}
              onValueChange={(v: 'local_wins' | 'monday_wins' | 'latest_wins') =>
                setConfig((prev) => ({ ...prev, conflict_resolution: v }))
              }
            >
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="local_wins">Yerel Sistem Oncelikli</SelectItem>
                <SelectItem value="monday_wins">Monday.com Oncelikli</SelectItem>
                <SelectItem value="latest_wins">En Son Guncelleme Kazanir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</> : 'Yapilandirmayi Kaydet'}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Senkronizasyon Gecmisi
            <Button variant="ghost" size="sm" onClick={loadSyncLogs}>
              <RefreshCw className="mr-2 h-3 w-3" /> Yenile
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Henuz senkronizasyon gecmisi yok</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Proje</TableHead>
                  <TableHead>Yon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Hata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.project ? `${log.project.nj_number} — ${log.project.title}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.sync_direction === 'push' ? 'Push' : 'Pull'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.sync_status === 'success' ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Basarili</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Basarisiz</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
