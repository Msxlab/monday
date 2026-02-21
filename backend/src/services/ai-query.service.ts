import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';

export type SupportedIntent =
  | 'project_contributors'
  | 'today_on_leave'
  | 'stale_projects'
  | 'pending_projects';

export interface AiQueryRequest {
  message: string;
  companyId: number;
  requestedByUserId?: number;
  channel: 'api' | 'telegram-webhook' | 'whatsapp-provider';
  ipAddress?: string;
  userAgent?: string;
}

export interface AiQueryResponse {
  intent: SupportedIntent;
  answer: string;
  sources: {
    projectIds: number[];
    userIds: number[];
    dates: string[];
  };
}

interface IntentMatch {
  intent: SupportedIntent;
  days?: number;
  projectHint?: string;
}

class AiQueryService {
  private static readonly MAX_INPUT_LENGTH = 500;

  async orchestrate(request: AiQueryRequest): Promise<AiQueryResponse> {
    const maskedPrompt = this.maskPii(request.message);
    const intentMatch = this.matchIntent(maskedPrompt);

    await createAuditLog({
      userId: request.requestedByUserId,
      action: 'ai_query_received',
      resourceType: request.channel,
      oldValue: undefined,
      newValue: {
        company_id: request.companyId,
        prompt: maskedPrompt,
        intent: intentMatch.intent,
      },
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });

    const response = await this.executeIntent(intentMatch, request.companyId);
    const maskedAnswer = this.maskPii(response.answer);

    await createAuditLog({
      userId: request.requestedByUserId,
      action: 'ai_query_responded',
      resourceType: request.channel,
      newValue: {
        company_id: request.companyId,
        intent: response.intent,
        sources: response.sources,
        answer: maskedAnswer,
      },
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });

    return {
      ...response,
      answer: maskedAnswer,
    };
  }

  private matchIntent(message: string): IntentMatch {
    const trimmed = message.trim().toLowerCase();

    if (!trimmed) {
      throw new AppError('Mesaj boş olamaz', 400);
    }
    if (trimmed.length > AiQueryService.MAX_INPUT_LENGTH) {
      throw new AppError('Mesaj çok uzun', 400);
    }

    if (trimmed.includes('projede') && (trimmed.includes('kim çalışıyor') || trimmed.includes('kim calisiyor'))) {
      const projectHint = trimmed.match(/(?:proje\s*#?|project\s*#?)([a-z0-9\-]+)/i)?.[1];
      return { intent: 'project_contributors', projectHint };
    }

    if ((trimmed.includes('bugün') || trimmed.includes('bugun')) && trimmed.includes('izinli kim')) {
      return { intent: 'today_on_leave' };
    }

    if (trimmed.includes('gündür') || trimmed.includes('gundur')) {
      const dayMatch = trimmed.match(/(\d{1,3})\s*g[üu]nd[üu]r/);
      if (dayMatch) {
        return { intent: 'stale_projects', days: Number(dayMatch[1]) };
      }
    }

    if (trimmed.includes('bekleyen projeler')) {
      return { intent: 'pending_projects' };
    }

    throw new AppError('Bu soru için desteklenen bir sorgu şablonu bulunamadı', 400);
  }

  private async executeIntent(intentMatch: IntentMatch, companyId: number): Promise<AiQueryResponse> {
    switch (intentMatch.intent) {
      case 'project_contributors':
        return this.findProjectContributors(companyId, intentMatch.projectHint);
      case 'today_on_leave':
        return this.findTodayOnLeave(companyId);
      case 'stale_projects':
        return this.findStaleProjects(companyId, intentMatch.days ?? 7);
      case 'pending_projects':
        return this.findPendingProjects(companyId);
      default:
        throw new AppError('Desteklenmeyen intent', 400);
    }
  }

  private async findProjectContributors(companyId: number, projectHint?: string): Promise<AiQueryResponse> {
    const hintSql = projectHint
      ? Prisma.sql`AND (CAST(p.id AS CHAR) = ${projectHint} OR p.nj_number = ${projectHint})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<{
      project_id: number;
      user_id: number;
      first_name: string;
      last_name: string;
      updated_at: Date;
    }>>(Prisma.sql`
      SELECT p.id AS project_id, u.id AS user_id, u.first_name, u.last_name, p.updated_at
      FROM projects p
      INNER JOIN users u ON u.id = p.assigned_designer_id
      WHERE p.company_id = ${companyId}
      ${hintSql}
      ORDER BY p.updated_at DESC
      LIMIT 5
    `);

    if (rows.length === 0) {
      return {
        intent: 'project_contributors',
        answer: 'Eşleşen aktif görev bulunamadı.',
        sources: { projectIds: [], userIds: [], dates: [] },
      };
    }

    const projectIds = [...new Set(rows.map((row) => row.project_id))];
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const dates = [...new Set(rows.map((row) => row.updated_at.toISOString().slice(0, 10)))];

    return {
      intent: 'project_contributors',
      answer: `Aktif eşleşme: ${rows.map((row) => `P#${row.project_id}: U#${row.user_id} ${row.first_name} ${row.last_name}`).join('; ')}`,
      sources: { projectIds, userIds, dates },
    };
  }

  private async findTodayOnLeave(companyId: number): Promise<AiQueryResponse> {
    const rows = await prisma.$queryRaw<Array<{
      user_id: number;
      first_name: string;
      last_name: string;
      start_date: Date;
      end_date: Date;
    }>>(Prisma.sql`
      SELECT l.user_id, u.first_name, u.last_name, l.start_date, l.end_date
      FROM leaves l
      INNER JOIN users u ON u.id = l.user_id
      WHERE l.company_id = ${companyId}
        AND l.status = 'approved'
        AND CURDATE() BETWEEN DATE(l.start_date) AND DATE(l.end_date)
      ORDER BY l.start_date ASC
      LIMIT 20
    `);

    if (rows.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        intent: 'today_on_leave',
        answer: 'Bugün izinli çalışan görünmüyor.',
        sources: { projectIds: [], userIds: [], dates: [today] },
      };
    }

    return {
      intent: 'today_on_leave',
      answer: `Bugün izinli: ${rows.map((row) => `U#${row.user_id} ${row.first_name} ${row.last_name}`).join(', ')}`,
      sources: {
        projectIds: [],
        userIds: [...new Set(rows.map((row) => row.user_id))],
        dates: [...new Set(rows.flatMap((row) => [row.start_date.toISOString().slice(0, 10), row.end_date.toISOString().slice(0, 10)]))],
      },
    };
  }

  private async findStaleProjects(companyId: number, days: number): Promise<AiQueryResponse> {
    const safeDays = Math.min(Math.max(days, 1), 365);

    const rows = await prisma.$queryRaw<Array<{
      project_id: number;
      updated_at: Date;
      user_id: number | null;
    }>>(Prisma.sql`
      SELECT p.id AS project_id, p.updated_at, p.assigned_designer_id AS user_id
      FROM projects p
      WHERE p.company_id = ${companyId}
        AND p.updated_at <= DATE_SUB(NOW(), INTERVAL ${safeDays} DAY)
        AND p.status NOT IN ('done', 'cancelled')
      ORDER BY p.updated_at ASC
      LIMIT 20
    `);

    return {
      intent: 'stale_projects',
      answer: rows.length
        ? `${safeDays}+ gündür güncellenmeyen projeler: ${rows.map((row) => `P#${row.project_id}`).join(', ')}`
        : `${safeDays}+ gündür güncellenmeyen proje yok.`,
      sources: {
        projectIds: rows.map((row) => row.project_id),
        userIds: rows.map((row) => row.user_id).filter((value): value is number => value !== null),
        dates: rows.map((row) => row.updated_at.toISOString().slice(0, 10)),
      },
    };
  }

  private async findPendingProjects(companyId: number): Promise<AiQueryResponse> {
    const rows = await prisma.$queryRaw<Array<{
      project_id: number;
      user_id: number | null;
      updated_at: Date;
      status: string;
    }>>(Prisma.sql`
      SELECT p.id AS project_id, p.assigned_designer_id AS user_id, p.updated_at, p.status
      FROM projects p
      WHERE p.company_id = ${companyId}
        AND p.status IN ('new', 'designing', 'revision', 'review', 'blocked')
      ORDER BY p.updated_at DESC
      LIMIT 20
    `);

    return {
      intent: 'pending_projects',
      answer: rows.length
        ? `Bekleyen projeler: ${rows.map((row) => `P#${row.project_id} (${row.status})`).join(', ')}`
        : 'Bekleyen proje bulunmuyor.',
      sources: {
        projectIds: rows.map((row) => row.project_id),
        userIds: rows.map((row) => row.user_id).filter((value): value is number => value !== null),
        dates: rows.map((row) => row.updated_at.toISOString().slice(0, 10)),
      },
    };
  }

  private maskPii(input: string): string {
    return input
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[masked-email]')
      .replace(/\+?\d[\d\s()-]{8,}\d/g, '[masked-phone]')
      .replace(/\b\d{11}\b/g, '[masked-id]');
  }
}

export const aiQueryService = new AiQueryService();
