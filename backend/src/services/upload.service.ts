import path from 'path';
import fs from 'fs';
import { UserRole } from '@prisma/client';
import prisma from '../utils/prisma';
import { NotFoundError, AppError, ForbiddenError } from '../utils/errors';
import logger from '../utils/logger';
import FileType from 'file-type';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'projects');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class UploadService {
  private checkProjectAccess(project: { assigned_designer_id: number | null; status: string }, userId: number, userRole: UserRole) {
    if (userRole === 'designer' && project.assigned_designer_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this project\'s files');
    }
    if (userRole === 'senior_designer' && project.assigned_designer_id !== userId) {
      if (!['review', 'approved'].includes(project.status)) {
        throw new ForbiddenError('You do not have permission to access this project\'s files');
      }
    }
  }

  async addAttachment(
    projectId: number,
    userId: number,
    file: { filename: string; originalname: string; path: string; size: number; mimetype: string },
    userRole: UserRole
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project not found');
    this.checkProjectAccess(project, userId, userRole);

    // Content-sniffing: verify actual file type matches declared MIME type
    const ALLOWED_REAL_MIMES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/zip',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    try {
      const detectedType = await FileType.fromFile(file.path);
      if (detectedType && !ALLOWED_REAL_MIMES.includes(detectedType.mime)) {
        // Clean up the uploaded file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new AppError(`File content type (${detectedType.mime}) does not match allowed types`, 400);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // For files that file-type can't detect (CSV, text), fall back to declared mime
      logger.debug('file-type could not detect type, using declared mime', { mime: file.mimetype });
    }

    return prisma.projectAttachment.create({
      data: {
        project_id: projectId,
        uploaded_by_id: userId,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
      },
      include: {
        uploaded_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async listByProject(projectId: number, userId: number, userRole: UserRole) {
    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    if (!isAdmin) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project not found');
      this.checkProjectAccess(project, userId, userRole);
    }

    return prisma.projectAttachment.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
      include: {
        uploaded_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async download(attachmentId: number, userId: number, userRole: UserRole) {
    const attachment = await prisma.projectAttachment.findUnique({
      where: { id: attachmentId },
      include: { project: { select: { assigned_designer_id: true, status: true } } },
    });
    if (!attachment) throw new NotFoundError('Attachment not found');

    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    if (!isAdmin) {
      this.checkProjectAccess(attachment.project, userId, userRole);
    }

    if (!fs.existsSync(attachment.file_path)) {
      throw new NotFoundError('File not found on disk');
    }

    return {
      filePath: attachment.file_path,
      originalName: attachment.original_name,
      mimeType: attachment.mime_type,
    };
  }

  async delete(attachmentId: number, userId: number, userRole: string) {
    const attachment = await prisma.projectAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundError('Attachment not found');

    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    if (!isAdmin && attachment.uploaded_by_id !== userId) {
      throw new AppError('You can only delete your own attachments', 403);
    }

    try {
      if (fs.existsSync(attachment.file_path)) {
        fs.unlinkSync(attachment.file_path);
      }
    } catch (err) {
      logger.warn('Failed to delete file from disk', { path: attachment.file_path, error: err });
    }

    await prisma.projectAttachment.delete({ where: { id: attachmentId } });
    return { deleted: true };
  }
}

export const uploadService = new UploadService();
