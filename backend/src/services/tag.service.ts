import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';

export class TagService {
  async listTags() {
    return prisma.projectTag.findMany({
      orderBy: { name: 'asc' },
      include: { projects: { select: { project_id: true } } },
    });
  }

  async createTag(data: { name: string; color?: string }) {
    const existing = await prisma.projectTag.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError('Bu etiket adı zaten kullanılıyor', 409);

    return prisma.projectTag.create({
      data: { name: data.name, color: data.color ?? '#6366f1' },
    });
  }

  async updateTag(id: number, data: { name?: string; color?: string }) {
    const tag = await prisma.projectTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundError('Etiket bulunamadı');
    return prisma.projectTag.update({ where: { id }, data });
  }

  async deleteTag(id: number) {
    const tag = await prisma.projectTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundError('Etiket bulunamadı');
    await prisma.projectTag.delete({ where: { id } });
    return { id };
  }

  async addTagToProject(projectId: number, tagId: number) {
    const existing = await prisma.projectTagAssignment.findUnique({
      where: { project_id_tag_id: { project_id: projectId, tag_id: tagId } },
    });
    if (existing) return existing;

    return prisma.projectTagAssignment.create({
      data: { project_id: projectId, tag_id: tagId },
    });
  }

  async removeTagFromProject(projectId: number, tagId: number) {
    const existing = await prisma.projectTagAssignment.findUnique({
      where: { project_id_tag_id: { project_id: projectId, tag_id: tagId } },
    });
    if (!existing) throw new NotFoundError('Bu etiket bu projeye atanmamış');

    await prisma.projectTagAssignment.delete({
      where: { project_id_tag_id: { project_id: projectId, tag_id: tagId } },
    });
    return { projectId, tagId };
  }

  async getProjectTags(projectId: number) {
    const assignments = await prisma.projectTagAssignment.findMany({
      where: { project_id: projectId },
      include: { project: true },
    });
    return assignments.map((a: { project: { id: number; name: string; color: string } }) => a.project);
  }
}

export const tagService = new TagService();
