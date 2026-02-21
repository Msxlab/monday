import prisma from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export class SubtaskService {
  async listByProject(projectId: number) {
    return prisma.projectSubtask.findMany({
      where: { project_id: projectId },
      orderBy: { sort_order: 'asc' },
      include: {
        assigned_to: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async create(data: { project_id: number; title: string; assigned_to_id?: number; sort_order?: number }) {
    const maxOrder = await prisma.projectSubtask.findFirst({
      where: { project_id: data.project_id },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    return prisma.projectSubtask.create({
      data: {
        project_id: data.project_id,
        title: data.title,
        assigned_to_id: data.assigned_to_id,
        sort_order: data.sort_order ?? (maxOrder ? maxOrder.sort_order + 1 : 0),
      },
      include: {
        assigned_to: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async update(id: number, data: { title?: string; is_completed?: boolean; sort_order?: number; assigned_to_id?: number | null }) {
    const subtask = await prisma.projectSubtask.findUnique({ where: { id } });
    if (!subtask) throw new NotFoundError('Alt görev bulunamadı');

    return prisma.projectSubtask.update({
      where: { id },
      data,
      include: {
        assigned_to: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async delete(id: number) {
    const subtask = await prisma.projectSubtask.findUnique({ where: { id } });
    if (!subtask) throw new NotFoundError('Alt görev bulunamadı');
    await prisma.projectSubtask.delete({ where: { id } });
    return { id };
  }

  async reorder(projectId: number, orderedIds: number[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.projectSubtask.update({
        where: { id },
        data: { sort_order: index },
      })
    );
    await prisma.$transaction(updates);
    return this.listByProject(projectId);
  }

  async getProgress(projectId: number) {
    const [total, completed] = await Promise.all([
      prisma.projectSubtask.count({ where: { project_id: projectId } }),
      prisma.projectSubtask.count({ where: { project_id: projectId, is_completed: true } }),
    ]);
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
}

export const subtaskService = new SubtaskService();
