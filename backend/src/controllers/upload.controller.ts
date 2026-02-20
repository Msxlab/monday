import { Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';
import { ValidationError } from '../utils/errors';

export class UploadController {
  async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      if (!req.file) throw new ValidationError('No file uploaded');

      const attachment = await uploadService.addAttachment(
        projectId,
        req.user!.userId,
        req.file,
        req.user!.role
      );
      res.status(201).json({ success: true, data: attachment });
    } catch (err) {
      next(err);
    }
  }

  async listByProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const attachments = await uploadService.listByProject(projectId, req.user!.userId, req.user!.role);
      res.json({ success: true, data: attachments });
    } catch (err) {
      next(err);
    }
  }

  async download(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const { filePath, originalName, mimeType } = await uploadService.download(id, req.user!.userId, req.user!.role);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const result = await uploadService.delete(id, req.user!.userId, req.user!.role);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export const uploadController = new UploadController();
