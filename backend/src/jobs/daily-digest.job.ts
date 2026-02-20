import prisma from '../utils/prisma';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

export async function sendDailyDigest() {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const admins = await prisma.user.findMany({
      where: { role: { in: ['super_admin', 'admin'] }, is_active: true },
      select: { email: true, first_name: true },
    });

    if (admins.length === 0) return;

    const [
      overdueProjects,
      todayDeadlines,
      pendingLeaves,
      newProjects,
      pendingOrders,
    ] = await Promise.all([
      prisma.project.count({
        where: { deadline: { lt: now }, status: { notIn: ['done', 'cancelled'] } },
      }),
      prisma.project.count({
        where: {
          deadline: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
          status: { notIn: ['done', 'cancelled'] },
        },
      }),
      prisma.leave.count({ where: { status: 'pending' } }),
      prisma.project.count({
        where: { created_at: { gte: todayStart }, status: 'new' },
      }),
      prisma.productionOrder.count({ where: { order_status: 'pending_approval' } }),
    ]);

    const totalActive = await prisma.project.count({
      where: { status: { notIn: ['done', 'cancelled'] } },
    });

    const adminEmails = admins.map((a) => a.email);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Gunluk Ozet — ${now.toLocaleDateString('tr-TR')}</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #374151;">Aktif Projeler</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${totalActive}</td>
            </tr>
            <tr style="color: ${overdueProjects > 0 ? '#ef4444' : '#374151'};">
              <td style="padding: 8px 0;">Gecikmiş Projeler</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${overdueProjects}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151;">Bugun Deadline</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${todayDeadlines}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151;">Yeni Projeler (bugun)</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${newProjects}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151;">Bekleyen Izin Talepleri</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${pendingLeaves}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151;">Onay Bekleyen Siparisler</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${pendingOrders}</td>
            </tr>
          </table>
        </div>
      </div>
    `;

    await emailService.send({
      to: adminEmails,
      subject: `📊 Gunluk Ozet — ${now.toLocaleDateString('tr-TR')}`,
      html,
    });

    logger.info(`Daily digest sent to ${adminEmails.length} admins`);
  } catch (error) {
    logger.error('Daily digest job failed', { error });
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin'] }, is_active: true },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: adminUsers.map((a) => ({
          user_id: a.id,
          type: 'system_alert',
          title: 'Cron Job Hatasi',
          message: `Daily digest job basarisiz oldu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        })),
      });
    } catch { /* prevent secondary failure */ }
  }
}
