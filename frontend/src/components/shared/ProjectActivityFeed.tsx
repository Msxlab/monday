'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants';
import { Activity, GitBranch, MessageSquare, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StatusHistory {
  id: number;
  from_status: string | null;
  to_status: string;
  reason?: string | null;
  changed_at: string;
  changed_by?: { first_name: string; last_name: string } | null;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  author?: { first_name: string; last_name: string } | null;
}

interface Attachment {
  id: number;
  original_name: string;
  created_at: string;
  uploaded_by?: { first_name: string; last_name: string } | null;
}

type ActivityType = 'status' | 'comment' | 'attachment';

interface ActivityItem {
  id: string;
  type: ActivityType;
  date: Date;
  data: StatusHistory | Comment | Attachment;
}

interface Props {
  statusHistory?: StatusHistory[];
  comments?: Comment[];
  attachments?: Attachment[];
}

export default function ProjectActivityFeed({ statusHistory = [], comments = [], attachments = [] }: Props) {
  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    statusHistory.forEach((h) => {
      items.push({ id: `status-${h.id}`, type: 'status', date: new Date(h.changed_at), data: h });
    });

    comments.forEach((c) => {
      items.push({ id: `comment-${c.id}`, type: 'comment', date: new Date(c.created_at), data: c });
    });

    attachments.forEach((a) => {
      items.push({ id: `attachment-${a.id}`, type: 'attachment', date: new Date(a.created_at), data: a });
    });

    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [statusHistory, comments, attachments]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Aktivite Akışı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Henüz aktivite bulunmuyor.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Aktivite Akışı
          <Badge variant="outline" className="text-[10px] font-normal ml-1">{activities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
          {activities.map((item) => (
            <div key={item.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
              <div className="relative z-10 mt-1 flex-shrink-0">
                {item.type === 'status' && (
                  <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <GitBranch className="h-3 w-3 text-primary" />
                  </div>
                )}
                {item.type === 'comment' && (
                  <div className="h-6 w-6 rounded-full bg-cyan-500/15 flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-cyan-500" />
                  </div>
                )}
                {item.type === 'attachment' && (
                  <div className="h-6 w-6 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <Paperclip className="h-3 w-3 text-amber-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {item.type === 'status' && (() => {
                  const h = item.data as StatusHistory;
                  return (
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {h.from_status && (
                          <>
                            <Badge variant="outline" className="text-[10px] h-5">{PROJECT_STATUS_LABELS[h.from_status] || h.from_status}</Badge>
                            <span className="text-xs text-muted-foreground">→</span>
                          </>
                        )}
                        <Badge className={`text-[10px] h-5 text-white ${PROJECT_STATUS_COLORS[h.to_status]}`}>
                          {PROJECT_STATUS_LABELS[h.to_status] || h.to_status}
                        </Badge>
                      </div>
                      {h.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">{h.reason}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {h.changed_by ? `${h.changed_by.first_name} ${h.changed_by.last_name}` : 'Sistem'}
                        {' · '}
                        {formatDistanceToNow(item.date, { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  );
                })()}

                {item.type === 'comment' && (() => {
                  const c = item.data as Comment;
                  return (
                    <div>
                      <p className="text-sm">{c.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.author ? `${c.author.first_name} ${c.author.last_name}` : 'Anonim'}
                        {' · '}
                        {formatDistanceToNow(item.date, { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  );
                })()}

                {item.type === 'attachment' && (() => {
                  const a = item.data as Attachment;
                  return (
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{a.original_name}</span>
                        <span className="text-muted-foreground"> dosyası eklendi</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.uploaded_by ? `${a.uploaded_by.first_name} ${a.uploaded_by.last_name}` : 'Anonim'}
                        {' · '}
                        {formatDistanceToNow(item.date, { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
