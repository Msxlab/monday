import prisma from '../utils/prisma';
import { escapeHtml } from '../utils/html-escape';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const chatHistories = new Map<number, ChatMessage[]>();

export class AiChatService {
  async processMessage(userId: number, message: string, companyId?: number) {
    const lowerMessage = message.toLowerCase();
    let response: string;

    if (lowerMessage.includes('proje') || lowerMessage.includes('project')) {
      response = await this.handleProjectQuery(lowerMessage, companyId);
    } else if (lowerMessage.includes('izin') || lowerMessage.includes('leave')) {
      response = await this.handleLeaveQuery(lowerMessage);
    } else if (lowerMessage.includes('kullanıcı') || lowerMessage.includes('user') || lowerMessage.includes('tasarımcı') || lowerMessage.includes('designer')) {
      response = await this.handleUserQuery(lowerMessage);
    } else if (lowerMessage.includes('istatistik') || lowerMessage.includes('stat') || lowerMessage.includes('özet') || lowerMessage.includes('summary')) {
      response = await this.handleSummaryQuery(companyId);
    } else {
      response = 'Merhaba! Size projeler, izinler, kullanıcılar veya genel istatistikler hakkında yardımcı olabilirim. Lütfen sorunuzu bu konulardan biriyle ilgili sorun.';
    }

    this.addToHistory(userId, message, response);
    return { message: response, timestamp: new Date() };
  }

  getHistory(userId: number, limit = 50): ChatMessage[] {
    const history = chatHistories.get(userId) || [];
    return history.slice(-limit);
  }

  private addToHistory(userId: number, userMessage: string, assistantMessage: string) {
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, []);
    }
    const history = chatHistories.get(userId)!;
    history.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date() },
    );
    // Keep last 100 messages per user
    if (history.length > 100) {
      chatHistories.set(userId, history.slice(-100));
    }
  }

  private async handleProjectQuery(message: string, companyId?: number): Promise<string> {
    const where: Record<string, unknown> = {};
    if (companyId) where.company_id = companyId;

    if (message.includes('bekleyen') || message.includes('pending') || message.includes('yeni') || message.includes('new')) {
      where.status = 'new';
    } else if (message.includes('devam') || message.includes('active') || message.includes('designing')) {
      where.status = 'designing';
    } else if (message.includes('tamamlan') || message.includes('done') || message.includes('completed')) {
      where.status = 'done';
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        take: 10,
        orderBy: { created_at: 'desc' },
        select: { id: true, nj_number: true, title: true, status: true, priority: true, deadline: true },
      }),
      prisma.project.count({ where }),
    ]);

    if (total === 0) {
      return 'Belirtilen kriterlere uygun proje bulunamadı.';
    }

    const projectList = projects
      .map((p) => `• ${escapeHtml(p.nj_number)} - ${escapeHtml(p.title)} (Durum: ${p.status}, Öncelik: ${p.priority})`)
      .join('\n');

    return `Toplam ${total} proje bulundu${projects.length < total ? ` (ilk ${projects.length} gösteriliyor)` : ''}:\n\n${projectList}`;
  }

  private async handleLeaveQuery(message: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (message.includes('bugün') || message.includes('today')) {
      const onLeave = await prisma.leave.findMany({
        where: {
          status: 'approved',
          start_date: { lte: today },
          end_date: { gte: today },
        },
        include: { user: { select: { first_name: true, last_name: true } } },
      });

      if (onLeave.length === 0) return 'Bugün izinli olan kimse yok.';
      const names = onLeave.map((l) => `• ${escapeHtml(l.user.first_name)} ${escapeHtml(l.user.last_name)} (${l.leave_type})`).join('\n');
      return `Bugün ${onLeave.length} kişi izinli:\n\n${names}`;
    }

    const [pending, approved, total] = await Promise.all([
      prisma.leave.count({ where: { status: 'pending' } }),
      prisma.leave.count({ where: { status: 'approved' } }),
      prisma.leave.count(),
    ]);

    return `İzin istatistikleri:\n• Bekleyen: ${pending}\n• Onaylanan: ${approved}\n• Toplam kayıt: ${total}`;
  }

  private async handleUserQuery(message: string): Promise<string> {
    if (message.includes('aktif') || message.includes('active')) {
      const count = await prisma.user.count({ where: { is_active: true } });
      return `Sistemde ${count} aktif kullanıcı bulunmaktadır.`;
    }

    const users = await prisma.user.findMany({
      where: { is_active: true },
      select: { id: true, first_name: true, last_name: true, role: true },
      take: 20,
      orderBy: { first_name: 'asc' },
    });

    const roleGroups: Record<string, string[]> = {};
    for (const u of users) {
      if (!roleGroups[u.role]) roleGroups[u.role] = [];
      roleGroups[u.role].push(`${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}`);
    }

    const lines = Object.entries(roleGroups)
      .map(([role, names]) => `${role}: ${names.join(', ')}`)
      .join('\n');

    return `Kullanıcılar:\n${lines}`;
  }

  private async handleSummaryQuery(companyId?: number): Promise<string> {
    const projectWhere: Record<string, unknown> = {};
    if (companyId) projectWhere.company_id = companyId;

    const [totalProjects, activeProjects, totalUsers, pendingLeaves] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.project.count({ where: { ...projectWhere, status: { in: ['new', 'designing', 'revision', 'review'] } } }),
      prisma.user.count({ where: { is_active: true } }),
      prisma.leave.count({ where: { status: 'pending' } }),
    ]);

    return `Genel Özet:\n• Toplam Proje: ${totalProjects}\n• Aktif Proje: ${activeProjects}\n• Aktif Kullanıcı: ${totalUsers}\n• Bekleyen İzin: ${pendingLeaves}`;
  }
}

export const aiChatService = new AiChatService();
