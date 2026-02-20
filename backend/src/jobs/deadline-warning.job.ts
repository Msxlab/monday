import prisma from '../utils/prisma';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

export async function checkDeadlineWarnings() {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const oneDayLater = new Date(now);
    oneDayLater.setDate(oneDayLater.getDate() + 1);

    const projects = await prisma.project.findMany({
      where: {
        deadline: { lte: threeDaysLater, gte: now },
        status: { notIn: ['done', 'cancelled'] },
      },
      include: {
        assigned_designer: { select: { email: true, first_name: true } },
      },
    });

    let sentCount = 0;
    for (const project of projects) {
      if (!project.assigned_designer?.email) continue;

      const deadline = new Date(project.deadline!);
      const diffMs = deadline.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      await emailService.sendDeadlineWarning(
        project.assigned_designer.email,
        project.title,
        project.nj_number,
        deadline,
        daysLeft
      );

      await prisma.notification.create({
        data: {
          user_id: project.assigned_designer_id!,
          type: 'deadline_warning',
          title: `Deadline Yaklasıyor: ${project.nj_number}`,
          message: `${project.title} projesinin deadline'ina ${daysLeft} gun kaldi.`,
          project_id: project.id,
        },
      });

      sentCount++;
    }

    logger.info(`Deadline warning job completed: ${sentCount} warnings sent for ${projects.length} projects`);
  } catch (error) {
    logger.error('Deadline warning job failed', { error });
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin'] }, is_active: true },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          user_id: a.id,
          type: 'system_alert',
          title: 'Cron Job Hatasi',
          message: `Deadline warning job basarisiz oldu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        })),
      });
    } catch { /* prevent secondary failure */ }
  }
}
