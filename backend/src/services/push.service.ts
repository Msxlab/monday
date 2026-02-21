import webpush from 'web-push';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@designertracker.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export class PushService {
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  async subscribe(userId: number, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await prisma.pushSubscription.upsert({
      where: {
        user_id_endpoint: {
          user_id: userId,
          endpoint: subscription.endpoint.substring(0, 255),
        },
      },
      create: {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(userId: number, endpoint: string) {
    await prisma.pushSubscription.deleteMany({
      where: { user_id: userId, endpoint },
    });
  }

  async sendToUser(userId: number, payload: { title: string; body: string; url?: string; icon?: string }) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      logger.warn('VAPID keys not configured, skipping push notification');
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: userId },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or unsubscribed — remove it
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        failed++;
        logger.error('Push notification failed', { userId, endpoint: sub.endpoint, error: err });
      }
    }

    return { sent, failed };
  }

  async sendToRole(role: string, payload: { title: string; body: string; url?: string; icon?: string }) {
    const users = await prisma.user.findMany({
      where: { role: role as never, is_active: true },
      select: { id: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const user of users) {
      const result = await this.sendToUser(user.id, payload);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return { sent: totalSent, failed: totalFailed };
  }

  async getSubscriptionCount(userId: number): Promise<number> {
    return prisma.pushSubscription.count({ where: { user_id: userId } });
  }
}

export const pushService = new PushService();
