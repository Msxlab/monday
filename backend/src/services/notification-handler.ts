import { eventBus, APP_EVENTS } from '../utils/event-bus';
import { notificationService } from './notification.service';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { escapeHtml } from '../utils/html-escape';

async function getAdminIds(): Promise<number[]> {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['super_admin', 'admin'] }, is_active: true },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

export function registerNotificationHandlers() {
  // Project assigned to designer
  eventBus.on(APP_EVENTS.PROJECT_ASSIGNED, async (payload) => {
    try {
      const { projectId, designerId, projectTitle, njNumber, assignedById } = payload as {
        projectId: number; designerId: number; projectTitle: string; njNumber: string; assignedById: number;
      };
      if (!designerId || designerId === assignedById) return;

      await notificationService.create({
        userId: designerId,
        projectId,
        type: 'project_assigned',
        title: 'Yeni Proje Atandı',
        message: `${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)} projesi size atandı.`,
        actionUrl: `/admin/projects/${projectId}`,
      });
    } catch (err) {
      logger.error('Notification handler error: PROJECT_ASSIGNED', { error: err });
    }
  });

  // Project status changed
  eventBus.on(APP_EVENTS.PROJECT_STATUS_CHANGED, async (payload) => {
    try {
      const { projectId, fromStatus, toStatus, changedById, designerId, projectTitle, njNumber } = payload as {
        projectId: number; fromStatus: string; toStatus: string; changedById: number;
        designerId: number | null; projectTitle: string; njNumber: string;
      };

      // Notify assigned designer if status was changed by someone else
      if (designerId && designerId !== changedById) {
        await notificationService.create({
          userId: designerId,
          projectId,
          type: 'status_changed',
          title: 'Proje Durumu Değişti',
          message: `${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)}: ${escapeHtml(fromStatus)} → ${escapeHtml(toStatus)}`,
          actionUrl: `/admin/projects/${projectId}`,
        });
      }

      // Notify admins for important transitions
      if (['review', 'done', 'blocked'].includes(toStatus)) {
        const adminIds = await getAdminIds();
        for (const adminId of adminIds) {
          if (adminId === changedById) continue;
          await notificationService.create({
            userId: adminId,
            projectId,
            type: 'status_changed',
            title: 'Proje Durumu Değişti',
            message: `${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)}: ${escapeHtml(fromStatus)} → ${escapeHtml(toStatus)}`,
            actionUrl: `/admin/projects/${projectId}`,
          });
        }
      }
    } catch (err) {
      logger.error('Notification handler error: PROJECT_STATUS_CHANGED', { error: err });
    }
  });

  // Comment created
  eventBus.on(APP_EVENTS.COMMENT_CREATED, async (payload) => {
    try {
      const { projectId, commenterId, commenterName, projectTitle, njNumber, designerId } = payload as {
        projectId: number; commenterId: number; commenterName: string;
        projectTitle: string; njNumber: string; designerId: number | null;
      };

      // Notify designer if someone else commented
      if (designerId && designerId !== commenterId) {
        await notificationService.create({
          userId: designerId,
          projectId,
          type: 'comment_added',
          title: 'Yeni Yorum',
          message: `${escapeHtml(commenterName)}, ${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)} projesine yorum ekledi.`,
          actionUrl: `/admin/projects/${projectId}`,
        });
      }
    } catch (err) {
      logger.error('Notification handler error: COMMENT_CREATED', { error: err });
    }
  });

  // Leave request created
  eventBus.on(APP_EVENTS.LEAVE_CREATED, async (payload) => {
    try {
      const { userId, userName, startDate, endDate, leaveType } = payload as {
        userId: number; userName: string; startDate: string; endDate: string; leaveType: string;
      };

      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        await notificationService.create({
          userId: adminId,
          type: 'leave_request',
          title: 'Yeni İzin Talebi',
          message: `${escapeHtml(userName)} ${escapeHtml(startDate)} - ${escapeHtml(endDate)} tarihlerinde ${escapeHtml(leaveType)} izni talep etti.`,
          actionUrl: '/admin/leaves',
        });
      }
    } catch (err) {
      logger.error('Notification handler error: LEAVE_CREATED', { error: err });
    }
  });

  // Leave status changed
  eventBus.on(APP_EVENTS.LEAVE_STATUS_CHANGED, async (payload) => {
    try {
      const { leaveUserId, status, startDate, endDate } = payload as {
        leaveUserId: number; status: string; startDate: string; endDate: string;
      };

      await notificationService.create({
        userId: leaveUserId,
        type: 'leave_status',
        title: `İzin Talebi ${status === 'approved' ? 'Onaylandı' : 'Reddedildi'}`,
        message: `${startDate} - ${endDate} tarihli izin talebiniz ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.`,
        actionUrl: '/admin/leaves',
      });
    } catch (err) {
      logger.error('Notification handler error: LEAVE_STATUS_CHANGED', { error: err });
    }
  });

  // Production order created
  eventBus.on(APP_EVENTS.PRODUCTION_ORDER_CREATED, async (payload) => {
    try {
      const { orderId, projectTitle, njNumber, initiatedByName } = payload as {
        orderId: number; projectTitle: string; njNumber: string; initiatedByName: string;
      };

      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        await notificationService.create({
          userId: adminId,
          type: 'production_order',
          title: 'Yeni Üretim Siparişi',
          message: `${escapeHtml(initiatedByName)}, ${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)} için üretim siparişi oluşturdu.`,
          actionUrl: '/production/orders',
        });
      }
    } catch (err) {
      logger.error('Notification handler error: PRODUCTION_ORDER_CREATED', { error: err });
    }
  });

  // Production order status updated
  eventBus.on(APP_EVENTS.PRODUCTION_ORDER_UPDATED, async (payload) => {
    try {
      const { orderId, projectId, newStatus, projectTitle, njNumber, designerId } = payload as {
        orderId: number; projectId: number; newStatus: string;
        projectTitle: string; njNumber: string; designerId: number | null;
      };

      if (designerId) {
        await notificationService.create({
          userId: designerId,
          projectId,
          type: 'production_update',
          title: 'Üretim Siparişi Güncellendi',
          message: `${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)} üretim siparişi: ${escapeHtml(newStatus)}`,
          actionUrl: '/production/orders',
        });
      }
    } catch (err) {
      logger.error('Notification handler error: PRODUCTION_ORDER_UPDATED', { error: err });
    }
  });

  // Revision requested
  eventBus.on(APP_EVENTS.REVISION_REQUESTED, async (payload) => {
    try {
      const { projectId, designerId, projectTitle, njNumber, requestedByName } = payload as {
        projectId: number; designerId: number | null; projectTitle: string;
        njNumber: string; requestedByName: string;
      };

      if (designerId) {
        await notificationService.create({
          userId: designerId,
          projectId,
          type: 'revision_requested',
          title: 'Revizyon İstendi',
          message: `${escapeHtml(requestedByName)}, ${escapeHtml(njNumber)} - ${escapeHtml(projectTitle)} için revizyon talep etti.`,
          actionUrl: `/admin/projects/${projectId}`,
        });
      }
    } catch (err) {
      logger.error('Notification handler error: REVISION_REQUESTED', { error: err });
    }
  });

  logger.info('Notification event handlers registered');
}
