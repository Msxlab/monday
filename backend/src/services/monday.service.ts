import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { createAuditLog } from '../utils/audit';
import { AppError, NotFoundError } from '../utils/errors';
import { ProjectStatus, SyncDirection, SyncStatus } from '@prisma/client';

interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: { id: string; text: string; value: string | null }[];
}

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

const MONDAY_API_URL = 'https://api.monday.com/v2';

export class MondayService {
  /**
   * Get Monday.com configuration from settings
   */
  async getConfig(): Promise<MondayConfig | null> {
    const settings = await prisma.notificationRule.findFirst({
      where: { rule_type: 'monday_config' },
    });

    if (!settings || !settings.trigger_condition) return null;

    try {
      return JSON.parse(settings.trigger_condition) as MondayConfig;
    } catch {
      return null;
    }
  }

  /**
   * Save Monday.com configuration to settings
   */
  async saveConfig(config: MondayConfig, userId: number): Promise<void> {
    await prisma.notificationRule.upsert({
      where: { id: (await prisma.notificationRule.findFirst({ where: { rule_type: 'monday_config' } }))?.id ?? 0 },
      create: {
        rule_name: 'Monday.com Configuration',
        rule_type: 'monday_config',
        trigger_condition: JSON.stringify(config),
        is_active: config.sync_enabled,
        created_by_id: userId,
      },
      update: {
        trigger_condition: JSON.stringify(config),
        is_active: config.sync_enabled,
      },
    });

    await createAuditLog({
      userId,
      action: 'monday_config_updated',
      resourceType: 'settings',
    });
  }

  /**
   * Test Monday.com API connection
   */
  async testConnection(apiToken: string): Promise<{ success: boolean; account?: string; error?: string }> {
    try {
      const response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiToken,
        },
        body: JSON.stringify({
          query: '{ me { name account { name } } }',
        }),
      });

      const data = await response.json() as { data?: { me?: { name: string; account?: { name: string } } }; errors?: { message: string }[] };

      if (data.errors) {
        return { success: false, error: data.errors[0]?.message || 'Unknown error' };
      }

      return {
        success: true,
        account: data.data?.me?.account?.name || data.data?.me?.name || 'Connected',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return { success: false, error: message };
    }
  }

  /**
   * Fetch board columns from Monday.com
   */
  async getBoardColumns(apiToken: string, boardId: string): Promise<MondayColumn[]> {
    const response = await this.mondayQuery(apiToken, `{
      boards(ids: [${boardId}]) {
        columns { id title type }
      }
    }`);

    return response?.data?.boards?.[0]?.columns ?? [];
  }

  /**
   * Push a project to Monday.com (create or update item)
   */
  async pushProject(projectId: number, userId: number): Promise<{ success: boolean; mondayItemId?: string }> {
    const config = await this.getConfig();
    if (!config || !config.sync_enabled) {
      throw new AppError('Monday.com sync is not configured or disabled', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { assigned_designer: { select: { first_name: true, last_name: true } } },
    });

    if (!project) throw new NotFoundError('Project not found');

    const columnValues = this.mapProjectToMondayColumns(project, config.column_mappings);

    let mondayItemId = project.monday_item_id;
    let syncResult: { success: boolean; mondayItemId?: string };

    try {
      if (mondayItemId) {
        // Update existing item
        await this.mondayQuery(config.api_token, `mutation {
          change_multiple_column_values(
            board_id: ${config.board_id},
            item_id: ${mondayItemId},
            column_values: ${JSON.stringify(JSON.stringify(columnValues))}
          ) { id }
        }`);
        syncResult = { success: true, mondayItemId };
      } else {
        // Create new item
        const result = await this.mondayQuery(config.api_token, `mutation {
          create_item(
            board_id: ${config.board_id},
            item_name: "${this.escapeGraphQL(project.title)}",
            column_values: ${JSON.stringify(JSON.stringify(columnValues))}
          ) { id }
        }`);

        mondayItemId = result?.data?.create_item?.id;
        if (mondayItemId) {
          await prisma.project.update({
            where: { id: projectId },
            data: { monday_item_id: mondayItemId, monday_board_id: config.board_id },
          });
        }
        syncResult = { success: true, mondayItemId: mondayItemId ?? undefined };
      }

      await this.logSync(projectId, mondayItemId ?? null, 'push', 'success', columnValues);

      await createAuditLog({
        userId,
        action: 'monday_push',
        resourceType: 'project',
        resourceId: projectId,
      });

      return syncResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Push failed';
      await this.logSync(projectId, mondayItemId ?? null, 'push', 'failed', columnValues, errorMessage);
      throw new AppError(`Monday.com push failed: ${errorMessage}`, 502);
    }
  }

  /**
   * Pull item data from Monday.com to local project
   */
  async pullProject(projectId: number, userId: number): Promise<{ updated: boolean; fields?: string[] }> {
    const config = await this.getConfig();
    if (!config || !config.sync_enabled) {
      throw new AppError('Monday.com sync is not configured or disabled', 400);
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project not found');
    if (!project.monday_item_id) throw new AppError('Project is not linked to Monday.com', 400);

    try {
      const result = await this.mondayQuery(config.api_token, `{
        items(ids: [${project.monday_item_id}]) {
          id name
          column_values { id text value }
        }
      }`);

      const item: MondayItem | undefined = result?.data?.items?.[0];
      if (!item) throw new AppError('Item not found on Monday.com', 404);

      const updates = this.mapMondayItemToProject(item, config.column_mappings);
      const updatedFields = Object.keys(updates);

      if (updatedFields.length > 0) {
        await prisma.project.update({
          where: { id: projectId },
          data: updates,
        });
      }

      await this.logSync(projectId, project.monday_item_id, 'pull', 'success', { updates });

      await createAuditLog({
        userId,
        action: 'monday_pull',
        resourceType: 'project',
        resourceId: projectId,
        newValue: updates,
      });

      return { updated: updatedFields.length > 0, fields: updatedFields };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pull failed';
      await this.logSync(projectId, project.monday_item_id, 'pull', 'failed', null, errorMessage);
      throw err instanceof AppError ? err : new AppError(`Monday.com pull failed: ${errorMessage}`, 502);
    }
  }

  /**
   * Get sync logs with pagination
   */
  async getSyncLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.mondaySyncLog.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { project: { select: { id: true, nj_number: true, title: true } } },
      }),
      prisma.mondaySyncLog.count(),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Private helpers ───

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async mondayQuery(apiToken: string, query: string): Promise<any> {
    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Monday.com API error: ${response.status} ${response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (data?.errors?.length) {
      throw new Error(data.errors[0]?.message || 'Monday.com API error');
    }

    return data;
  }

  private mapProjectToMondayColumns(
    project: Record<string, unknown>,
    mappings: ColumnMapping[]
  ): Record<string, unknown> {
    const columnValues: Record<string, unknown> = {};

    for (const mapping of mappings) {
      if (mapping.direction === 'pull') continue;
      const value = project[mapping.local_field];
      if (value !== undefined && value !== null) {
        columnValues[mapping.monday_column_id] = String(value);
      }
    }

    return columnValues;
  }

  private mapMondayItemToProject(
    item: MondayItem,
    mappings: ColumnMapping[]
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    for (const mapping of mappings) {
      if (mapping.direction === 'push') continue;
      const col = item.column_values.find((c) => c.id === mapping.monday_column_id);
      if (!col || !col.text) continue;

      // Map known fields with type conversions
      switch (mapping.local_field) {
        case 'status':
          const statusMap: Record<string, ProjectStatus> = {
            'New': ProjectStatus.new,
            'Designing': ProjectStatus.designing,
            'Revision': ProjectStatus.revision,
            'Review': ProjectStatus.review,
            'Approved': ProjectStatus.approved,
            'In Production': ProjectStatus.in_production,
            'Done': ProjectStatus.done,
          };
          if (statusMap[col.text]) updates.status = statusMap[col.text];
          break;
        case 'priority':
          const priorityMap: Record<string, string> = {
            'Normal': 'normal', 'Urgent': 'urgent', 'Critical': 'critical',
          };
          if (priorityMap[col.text]) updates.priority = priorityMap[col.text];
          break;
        case 'deadline':
        case 'start_date':
          const parsed = new Date(col.text);
          if (!isNaN(parsed.getTime())) updates[mapping.local_field] = parsed;
          break;
        case 'title':
        case 'nj_number':
        case 'notes':
          updates[mapping.local_field] = col.text;
          break;
      }
    }

    return updates;
  }

  private async logSync(
    projectId: number | null,
    mondayItemId: string | null,
    direction: 'push' | 'pull',
    status: 'success' | 'failed',
    payload: unknown = null,
    errorMessage: string | null = null
  ): Promise<void> {
    try {
      await prisma.mondaySyncLog.create({
        data: {
          project_id: projectId,
          monday_item_id: mondayItemId,
          sync_direction: direction as SyncDirection,
          sync_status: status as SyncStatus,
          payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
          error_message: errorMessage,
        },
      });
    } catch (err) {
      logger.error('Failed to create sync log', { error: err });
    }
  }

  private escapeGraphQL(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

export const mondayService = new MondayService();
