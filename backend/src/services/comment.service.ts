import { UserRole } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError, ForbiddenError, NotFoundError } from '../utils/errors';

interface CreateCommentDto {
  project_id: number;
  content: string;
  is_internal?: boolean;
}

export class CommentService {
  async create(data: CreateCommentDto, userId: number, userRole: UserRole) {
    const project = await prisma.project.findUnique({ where: { id: data.project_id } });
    if (!project) throw new NotFoundError('Project not found');

    // Project access check
    if (userRole === 'designer' && project.assigned_designer_id !== userId) {
      throw new ForbiddenError('You do not have permission to comment on this project');
    }
    if (userRole === 'senior_designer' && project.assigned_designer_id !== userId) {
      if (!['review', 'approved'].includes(project.status)) {
        throw new ForbiddenError('You do not have permission to comment on this project');
      }
    }

    return prisma.projectComment.create({
      data: {
        project_id: data.project_id,
        user_id: userId,
        content: data.content,
        is_internal: data.is_internal ?? false,
      },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, role: true, avatar_url: true } },
      },
    });
  }

  async listByProject(projectId: number, userRole: UserRole, userId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const isAdmin = ['super_admin', 'admin'].includes(userRole);

    // Project access check
    if (!isAdmin) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project not found');
      if (userRole === 'designer' && project.assigned_designer_id !== userId) {
        throw new ForbiddenError('You do not have permission to view comments on this project');
      }
      if (userRole === 'senior_designer' && project.assigned_designer_id !== userId) {
        if (!['review', 'approved'].includes(project.status)) {
          throw new ForbiddenError('You do not have permission to view comments on this project');
        }
      }
    }

    const where: Record<string, unknown> = { project_id: projectId };
    if (!isAdmin) {
      where.is_internal = false;
    }

    const [comments, total] = await Promise.all([
      prisma.projectComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, role: true, avatar_url: true } },
        },
      }),
      prisma.projectComment.count({ where }),
    ]);

    return {
      data: comments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async delete(commentId: number, userId: number, userRole: UserRole) {
    const comment = await prisma.projectComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundError('Comment not found');

    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    if (!isAdmin && comment.user_id !== userId) {
      throw new AppError('You can only delete your own comments', 403);
    }

    await prisma.projectComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}

export const commentService = new CommentService();
