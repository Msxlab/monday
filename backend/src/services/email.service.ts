import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import { escapeHtml } from '../utils/html-escape';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '465', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        logger.warn('SMTP not configured — emails will be logged only');
        this.transporter = nodemailer.createTransport({ jsonTransport: true });
        return this.transporter;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  async send(options: EmailOptions): Promise<boolean> {
    try {
      const from = process.env.SMTP_USER || 'noreply@designertracker.com';
      const info = await this.getTransporter().sendMail({
        from: `Designer Tracker <${from}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (info.envelope) {
        logger.info('Email sent', { to: options.to, subject: options.subject });
      } else {
        logger.info('Email logged (SMTP not configured)', { subject: options.subject, message: JSON.parse(info.message) });
      }
      return true;
    } catch (error) {
      logger.error('Email send failed', { error, to: options.to, subject: options.subject });
      return false;
    }
  }

  async sendDeadlineWarning(to: string, projectTitle: string, njNumber: string, deadline: Date, daysLeft: number): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return this.send({
      to,
      subject: `⚠️ Deadline Yaklasıyor: ${njNumber} - ${projectTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Deadline Uyarisi</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 16px;">
              <strong>${escapeHtml(njNumber)}</strong> — ${escapeHtml(projectTitle)} projesinin deadline'ina <strong>${daysLeft} gun</strong> kaldi.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Deadline: <strong>${deadline.toLocaleDateString('tr-TR')}</strong>
            </p>
            <a href="${frontendUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">
              Projeyi Gor
            </a>
          </div>
        </div>
      `,
    });
  }

  async sendLeaveStatusUpdate(to: string, userName: string, status: 'approved' | 'rejected', startDate: Date, endDate: Date, reason?: string): Promise<boolean> {
    const isApproved = status === 'approved';
    return this.send({
      to,
      subject: `${isApproved ? '✅' : '❌'} Izin Talebi ${isApproved ? 'Onaylandi' : 'Reddedildi'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${isApproved ? '#10b981' : '#ef4444'}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Izin Talebi ${isApproved ? 'Onaylandi' : 'Reddedildi'}</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 16px;">
              Merhaba <strong>${escapeHtml(userName)}</strong>,
            </p>
            <p style="color: #374151;">
              ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')} tarihli izin talebiniz
              <strong>${isApproved ? 'onaylandi' : 'reddedildi'}</strong>.
            </p>
            ${reason ? `<p style="color: #6b7280; font-style: italic;">Sebep: ${escapeHtml(reason)}</p>` : ''}
          </div>
        </div>
      `,
    });
  }

  async sendProjectAssigned(to: string, designerName: string, projectTitle: string, njNumber: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return this.send({
      to,
      subject: `📋 Yeni Proje Atandi: ${njNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4f46e5; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Yeni Proje Atandi</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 16px;">
              Merhaba <strong>${escapeHtml(designerName)}</strong>,
            </p>
            <p style="color: #374151;">
              <strong>${escapeHtml(njNumber)}</strong> — ${escapeHtml(projectTitle)} projesi size atandi.
            </p>
            <a href="${frontendUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">
              Projeyi Gor
            </a>
          </div>
        </div>
      `,
    });
  }

  async sendAdminAlert(to: string | string[], subject: string, message: string): Promise<boolean> {
    return this.send({
      to,
      subject: `🔔 Admin Alert: ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Admin Bildirim</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151;">${escapeHtml(message)}</p>
          </div>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
